/**
 * batch_analysis_job.js
 * 
 * Processes executive orders with predefined analyses,
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
  updateOrderWithAnalysis
} = require('../utils/analysis');

const logger = require('../utils/logger');

// =============================================================================
// JOB CONFIGURATION
// =============================================================================

// Job information
const JOB_NAME = 'batch_analysis_job';
const JOB_DESCRIPTION = 'Batch analysis of executive orders using predefined analyses';

// Job configuration
const CONFIG = {
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
// PREDEFINED ANALYSES
// =============================================================================

// Batch of predefined analyses
const batchAnalyses = [
  {
    order_number: "EXAMPLE-12345",
    title: "Example Executive Order",
    analysis: {
      summary: "This is an example summary for demonstration purposes.",
      executiveBrief: "This is an example executive brief.\n\nIt contains multiple paragraphs of information about the executive order.",
      comprehensiveAnalysis: "This is a comprehensive analysis that would typically contain detailed information about the executive order's impact.",
      impactLevel: "Medium",
      categories: ["Education", "Research"],
      universityImpactAreas: ["Research Funding", "Administrative Compliance"]
    }
  }
  // Add more predefined analyses as needed
];

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
 * Main function to run the batch analysis job
 */
async function main() {
  // Get database connection
  const db = getDbConnection();
  
  try {
    jobLogger.info(`Starting ${JOB_DESCRIPTION}`);
    
    // Load previous job state if it exists
    const savedState = loadJobState();
    const processedOrderNumbers = savedState?.processedOrderNumbers || [];
    
    jobLogger.info(`Found ${processedOrderNumbers.length} previously processed orders`);
    
    // Filter out already processed analyses
    const analysesToProcess = batchAnalyses.filter(
      item => !processedOrderNumbers.includes(item.order_number)
    );
    
    jobLogger.info(`Found ${analysesToProcess.length} analyses to process`);
    
    // Process each analysis
    let successCount = 0;
    let currentProcessedNumbers = [...processedOrderNumbers];
    
    for (const item of analysesToProcess) {
      try {
        jobLogger.info(`Processing order with number: ${item.order_number} - ${item.title}`);
        
        // Find the order in our database
        const order = await dbGet(
          db,
          'SELECT id, order_number, title FROM executive_orders WHERE order_number = ?', 
          [item.order_number]
        );
        
        if (!order) {
          jobLogger.warn(`Order not found in database: ${item.order_number}`);
          continue;
        }
        
        // Update order with analysis
        const success = await updateOrderWithAnalysis(db, order.id, item.analysis);
        if (success) {
          successCount++;
          currentProcessedNumbers.push(item.order_number);
          
          // Save state after each successful processing
          saveJobState({ processedOrderNumbers: currentProcessedNumbers });
          jobLogger.info(`Successfully updated order ${item.order_number}`);
        } else {
          jobLogger.warn(`Failed to update order ${item.order_number}`);
        }
      } catch (error) {
        jobLogger.error(`Error processing order ${item.order_number}:`, error);
      }
    }
    
    // Log completion status
    jobLogger.info(`Analysis completed. Successfully analyzed ${successCount} out of ${analysesToProcess.length} orders.`);
    
    // If all analyses were processed, clear the job state
    if (successCount === analysesToProcess.length && analysesToProcess.length === batchAnalyses.length) {
      jobLogger.info(`All predefined analyses processed. Clearing job state.`);
      clearJobState();
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