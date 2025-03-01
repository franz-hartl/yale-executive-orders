/**
 * ai_analysis_job.js
 * 
 * Analyzes executive orders using the Claude AI API,
 * following the template structure for reliability and restart capability.
 */

// Import required modules
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Import utilities
const { 
  getDbConnection, 
  dbAll, 
  dbGet, 
  closeDbConnection 
} = require('../utils/db');

const { 
  updateOrderWithAnalysis,
  generateAnalysisWithClaude
} = require('../utils/analysis');

const logger = require('../utils/logger');

// =============================================================================
// JOB CONFIGURATION
// =============================================================================

// Job information
const JOB_NAME = 'ai_analysis_job';
const JOB_DESCRIPTION = 'AI-based analysis of executive orders using Claude API';

// Job configuration
const CONFIG = {
  // Maximum number of orders to process in this job
  batchSize: 5,
  
  // Delay between API calls in milliseconds (to prevent rate limiting)
  apiDelay: 3000,
  
  // Path to save job state (for resuming after interruption)
  stateFilePath: path.join(__dirname, '..', 'job_states', `${JOB_NAME}_state.json`),
  
  // Log file path
  logFilePath: path.join(__dirname, '..', 'logs', `${JOB_NAME}.log`),
  
  // Log level (ERROR, WARN, INFO, DEBUG)
  logLevel: 'INFO'
};

// Initialize logger
logger.initLogger({
  logLevel: CONFIG.logLevel,
  logFile: CONFIG.logFilePath
});

// Create job-specific logger
const jobLogger = logger.createJobLogger(JOB_NAME);

// =============================================================================
// ANALYSIS FUNCTION - USING CLAUDE AI
// =============================================================================

/**
 * Analyzes an executive order using Claude AI and returns analysis results
 * 
 * @param {Object} order The executive order object from database
 * @returns {Promise<Object>} Analysis results object
 */
async function analyzeOrder(order) {
  try {
    jobLogger.debug(`Generating analysis for order ${order.order_number} using Claude API`);
    return await generateAnalysisWithClaude(order);
  } catch (error) {
    jobLogger.error(`Failed to generate analysis for order ${order.order_number}`, error);
    throw error; // Rethrow to be handled by the main process
  }
}

// =============================================================================
// JOB STATE MANAGEMENT - ENABLES CLEAN RESTARTS
// =============================================================================

/**
 * Loads the saved state of the job if it exists
 * @returns {Object|null} The saved state or null if no state exists
 */
function loadJobState() {
  try {
    if (fs.existsSync(CONFIG.stateFilePath)) {
      const stateData = fs.readFileSync(CONFIG.stateFilePath, 'utf8');
      return JSON.parse(stateData);
    }
  } catch (error) {
    jobLogger.error(`Failed to load job state: ${error.message}`, error);
  }
  return null;
}

/**
 * Saves the current state of the job
 * @param {Object} state The current state to save
 */
function saveJobState(state) {
  try {
    // Create directory if it doesn't exist
    const stateDir = path.dirname(CONFIG.stateFilePath);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    
    fs.writeFileSync(
      CONFIG.stateFilePath, 
      JSON.stringify(state, null, 2), 
      'utf8'
    );
    jobLogger.debug(`Job state saved successfully`);
  } catch (error) {
    jobLogger.error(`Failed to save job state: ${error.message}`, error);
  }
}

/**
 * Clears the saved state of the job
 */
function clearJobState() {
  try {
    if (fs.existsSync(CONFIG.stateFilePath)) {
      fs.unlinkSync(CONFIG.stateFilePath);
      jobLogger.debug(`Job state cleared successfully`);
    }
  } catch (error) {
    jobLogger.error(`Failed to clear job state: ${error.message}`, error);
  }
}

// =============================================================================
// MAIN JOB FUNCTION
// =============================================================================

/**
 * Main function to run the analysis job
 */
async function main() {
  // Get database connection
  const db = getDbConnection();
  
  try {
    jobLogger.info(`Starting ${JOB_DESCRIPTION}`);
    
    // Verify API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not found in environment variables');
    }
    
    // Load previous job state if it exists
    const savedState = loadJobState();
    const processedOrderIds = savedState?.processedOrderIds || [];
    
    jobLogger.info(`Found ${processedOrderIds.length} previously processed orders`);
    
    // Get orders that need analysis
    let query = `
      SELECT id, order_number, title, signing_date, publication_date, president, summary, full_text, url
      FROM executive_orders 
      WHERE impact_level IS NULL OR impact_level = ''
    `;
    
    // Exclude previously processed orders
    if (processedOrderIds.length > 0) {
      query += ` AND id NOT IN (${processedOrderIds.join(',')})`;
    }
    
    query += ` ORDER BY signing_date DESC LIMIT ${CONFIG.batchSize}`;
    
    const ordersToAnalyze = await dbAll(db, query);
    
    jobLogger.info(`Found ${ordersToAnalyze.length} orders that need analysis`);
    
    // Process each order
    let successCount = 0;
    let currentProcessedIds = [...processedOrderIds];
    
    for (const order of ordersToAnalyze) {
      try {
        jobLogger.info(`Processing order: ${order.order_number} - ${order.title}`);
        
        // Generate analysis
        const analysis = await analyzeOrder(order);
        
        // Update order with analysis
        const success = await updateOrderWithAnalysis(db, order.id, analysis);
        if (success) {
          successCount++;
          currentProcessedIds.push(order.id);
          
          // Save state after each successful processing
          saveJobState({ processedOrderIds: currentProcessedIds });
          jobLogger.info(`Successfully analyzed order ${order.order_number}`);
        } else {
          jobLogger.warn(`Failed to update database for order ${order.order_number}`);
        }
        
        // Add a delay to prevent rate limiting
        if (CONFIG.apiDelay > 0 && ordersToAnalyze.indexOf(order) < ordersToAnalyze.length - 1) {
          jobLogger.debug(`Waiting ${CONFIG.apiDelay}ms before next request`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.apiDelay));
        }
      } catch (error) {
        jobLogger.error(`Error processing order ${order.order_number}:`, error);
      }
    }
    
    // Log completion status
    jobLogger.info(`Analysis completed. Successfully analyzed ${successCount} out of ${ordersToAnalyze.length} orders.`);
    
    // If all orders in this batch were processed successfully and there are no more orders to process, clear the job state
    if (successCount === ordersToAnalyze.length) {
      const remainingOrdersCount = await dbGet(db, `
        SELECT COUNT(*) as count
        FROM executive_orders 
        WHERE impact_level IS NULL OR impact_level = ''
      `);
      
      if (remainingOrdersCount.count === 0) {
        jobLogger.info(`No more orders need analysis. Clearing job state.`);
        clearJobState();
      }
    }
    
  } catch (error) {
    jobLogger.error(`Error in main process:`, error);
  } finally {
    // Close the database connection
    await closeDbConnection(db);
    jobLogger.info(`Job completed. Database connection closed.`);
  }
}

// Run the main function
main();