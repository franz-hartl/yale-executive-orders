/**
 * analysis_job_template.js
 * 
 * Template for creating executive order analysis jobs.
 * This template provides a standardized structure with error handling,
 * logging, and clean restart capabilities.
 * 
 * Usage:
 * 1. Copy this template to create a new analysis job
 * 2. Customize the configuration section
 * 3. Implement the analyzeOrder function for your specific analysis needs
 * 4. Run the job with proper environment variables
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
// JOB CONFIGURATION - CUSTOMIZE THIS SECTION
// =============================================================================

// Job information - CUSTOMIZE THESE VALUES
const JOB_NAME = 'analysis_job_template'; // Change this to your job name
const JOB_DESCRIPTION = 'Template analysis job'; // Change this to your job description

// Job configuration - CUSTOMIZE AS NEEDED
const CONFIG = {
  // Maximum number of orders to process in this job
  batchSize: 10,
  
  // Delay between API calls in milliseconds (to prevent rate limiting)
  apiDelay: 2000,
  
  // Path to save job state (for resuming after interruption)
  stateFilePath: path.join(__dirname, '..', 'job_states', `${JOB_NAME}_state.json`),
  
  // Log file path
  logFilePath: path.join(__dirname, '..', 'logs', `${JOB_NAME}.log`),
  
  // Log level (ERROR, WARN, INFO, DEBUG)
  logLevel: 'INFO'
};

// =============================================================================
// ANALYSIS FUNCTION - IMPLEMENT YOUR SPECIFIC ANALYSIS LOGIC HERE
// =============================================================================

/**
 * Analyzes an executive order and returns analysis results
 * Implement your specific analysis logic in this function
 * 
 * @param {Object} order The executive order object from database
 * @returns {Promise<Object>} Analysis results object
 */
async function analyzeOrder(order) {
  // EXAMPLE: Using Claude API to generate analysis
  // Replace this with your specific analysis logic
  return await generateAnalysisWithClaude(order);
  
  // EXAMPLE: For pre-defined analysis
  /*
  return {
    summary: "Summary of the order...",
    executiveBrief: "Executive brief...",
    comprehensiveAnalysis: "Comprehensive analysis...",
    impactLevel: "Medium",
    categories: ["Category1", "Category2"],
    universityImpactAreas: ["Area1", "Area2"]
  };
  */
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
  // Initialize logger
  logger.initLogger({
    logLevel: CONFIG.logLevel,
    logFile: CONFIG.logFilePath
  });
  
  // Create job-specific logger
  const jobLogger = logger.createJobLogger(JOB_NAME);
  
  // Get database connection
  const db = getDbConnection();
  
  try {
    jobLogger.info(`Starting ${JOB_DESCRIPTION}`);
    
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