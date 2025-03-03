/**
 * analyze_orders_queue.js
 * 
 * Command-line script to process orders using the task queue system.
 * Fetches orders from the database and queues them for analysis.
 */

require('dotenv').config();
const queueManager = require('./utils/queue_manager');
const { getDbConnection, dbAll, closeDbConnection } = require('./utils/db');
const logger = require('./utils/logger');
const path = require('path');

// Initialize logger
logger.initLogger({
  logLevel: 'INFO',
  logFile: path.join(process.cwd(), 'logs', 'analyze_orders_queue.log')
});

const scriptLogger = logger.createNamedLogger('AnalyzeOrdersQueue');

/**
 * Main function to run the order analysis
 */
async function main() {
  const db = getDbConnection();
  
  try {
    scriptLogger.info('Starting order analysis queue processing');
    
    // Initialize queue manager
    await queueManager.initialize();
    
    // Command line arguments
    const args = process.argv.slice(2);
    const batchSize = parseInt(args[0]) || 10; // Default to 10 orders
    const limitArg = args[1] ? parseInt(args[1]) : null;
    
    scriptLogger.info(`Using batch size: ${batchSize}, limit: ${limitArg || 'none'}`);
    
    // Get orders that need analysis
    let query = `
      SELECT id, order_number, title, signing_date, publication_date, president, summary, full_text, url
      FROM executive_orders 
      WHERE impact_level IS NULL OR impact_level = ''
    `;
    
    if (limitArg) {
      query += ` LIMIT ${limitArg}`;
    }
    
    const ordersToAnalyze = await dbAll(db, query);
    
    scriptLogger.info(`Found ${ordersToAnalyze.length} orders that need analysis`);
    
    if (ordersToAnalyze.length === 0) {
      scriptLogger.info('No orders to analyze. Exiting.');
      return;
    }
    
    // Process orders in batches
    const batches = [];
    for (let i = 0; i < ordersToAnalyze.length; i += batchSize) {
      batches.push(ordersToAnalyze.slice(i, i + batchSize));
    }
    
    scriptLogger.info(`Split into ${batches.length} batches of up to ${batchSize} orders each`);
    
    // Queue each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchId = `batch_${Date.now()}_${i}`;
      
      scriptLogger.info(`Queueing batch ${i+1}/${batches.length} with ${batch.length} orders (ID: ${batchId})`);
      
      // Add the batch to the task queue
      const taskIds = queueManager.queueBatchAnalysis(batch, {
        batchId,
        priority: i === 0 ? 10 : 0 // Give first batch higher priority
      });
      
      scriptLogger.info(`Successfully queued batch ${i+1} with ${taskIds.length} tasks`);
    }
    
    // Display initial queue stats
    const initialStats = queueManager.getQueueStats();
    scriptLogger.info(`Initial queue stats: ${JSON.stringify(initialStats.analysis)}`);
    
    // Set up an interval to log queue status
    const statusInterval = setInterval(() => {
      const stats = queueManager.getQueueStats().analysis;
      
      scriptLogger.info(
        `Queue status: ${stats.status}, pending: ${stats.pendingTasks}, ` +
        `processing: ${stats.processingTasks}, completed: ${stats.completedTasks}, ` +
        `failed: ${stats.failedTasks}`
      );
      
      // If all tasks are done, exit
      if (stats.pendingTasks === 0 && stats.processingTasks === 0) {
        scriptLogger.info('All tasks completed. Final stats:');
        scriptLogger.info(`  Completed: ${stats.completedTasks}, Failed: ${stats.failedTasks}`);
        
        clearInterval(statusInterval);
        
        // We don't exit here, as we want the script to continue running
        // until all tasks are processed by the queue.
        
        // Save final queue state
        queueManager.saveQueueStates();
      }
    }, 5000); // Log status every 5 seconds
    
    // Set a timeout to prevent the script from running indefinitely
    // This should be much longer than the expected processing time
    setTimeout(() => {
      scriptLogger.info('Maximum execution time reached. Saving queue state and exiting.');
      clearInterval(statusInterval);
      queueManager.saveQueueStates();
      queueManager.cleanup();
      process.exit(0);
    }, 24 * 60 * 60 * 1000); // 24 hours
    
  } catch (error) {
    scriptLogger.error(`Error in main process: ${error.message}`, error);
  }
  
  // Note: we don't close the database connection or clean up the queue manager here
  // because we want the script to keep running in the background to process all tasks.
  
  // Even after main() finishes, the script will continue running as long as there are
  // active tasks being processed. Node.js will exit when all tasks are done.
}

// Run the main function and handle any unhandled errors
main().catch(error => {
  scriptLogger.error('Unhandled error in main function', error);
  process.exit(1);
});

// Handle exit signals to ensure clean shutdown
process.on('SIGINT', () => {
  scriptLogger.info('Received SIGINT. Saving queue state and exiting.');
  queueManager.saveQueueStates();
  queueManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  scriptLogger.info('Received SIGTERM. Saving queue state and exiting.');
  queueManager.saveQueueStates();
  queueManager.cleanup();
  process.exit(0);
});