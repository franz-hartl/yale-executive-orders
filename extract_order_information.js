/**
 * extract_order_information.js
 * 
 * Script to extract specific types of information from executive orders
 * using the focused extraction system.
 */

require('dotenv').config();
const path = require('path');
const sourceAPI = require('./sources/source_api');
const extractionManager = require('./extraction/extraction_manager');
const DateExtractor = require('./extraction/extractors/date_extractor');
const RequirementExtractor = require('./extraction/extractors/requirement_extractor');
const ImpactExtractor = require('./extraction/extractors/impact_extractor');
const logger = require('./utils/logger');

// Initialize logger
logger.initLogger({
  logLevel: process.env.LOG_LEVEL || 'INFO',
  logFile: 'server.log'
});

// Create a script-specific logger
const extractionLogger = logger.createNamedLogger('ExtractOrderInfo');

/**
 * Initialize extractors
 */
function initializeExtractors() {
  extractionLogger.info('Initializing extractors');
  
  // Register extractors with the extraction manager
  extractionManager.registerExtractor('dates', new DateExtractor());
  extractionManager.registerExtractor('requirements', new RequirementExtractor());
  extractionManager.registerExtractor('impacts', new ImpactExtractor());
  
  extractionLogger.info('Extractors initialized');
}

/**
 * Extract information from a specific executive order
 * @param {string} orderNumber Executive order number
 * @param {Array} extractorTypes Types of information to extract
 * @returns {Promise<Object>} Extraction results
 */
async function extractFromOrder(orderNumber, extractorTypes = ['dates', 'requirements', 'impacts']) {
  extractionLogger.info(`Extracting information from executive order ${orderNumber}`);
  
  try {
    // Initialize the extraction system
    initializeExtractors();
    
    // Initialize the source API
    await sourceAPI.initialize();
    
    const results = {};
    const errors = [];
    
    // Extract each type of information
    for (const extractorType of extractorTypes) {
      try {
        extractionLogger.info(`Extracting ${extractorType} from order ${orderNumber}`);
        const extractionResult = await extractionManager.extractFromOrder(orderNumber, extractorType);
        
        results[extractorType] = extractionResult;
        extractionLogger.info(`Successfully extracted ${extractorType} from order ${orderNumber}`);
      } catch (error) {
        extractionLogger.error(`Error extracting ${extractorType} from order ${orderNumber}: ${error.message}`);
        errors.push({
          extractorType,
          error: error.message
        });
      }
    }
    
    // Clean up
    await sourceAPI.close();
    
    return {
      orderNumber,
      results,
      errors,
      success: errors.length === 0
    };
  } catch (error) {
    extractionLogger.error(`Error in extraction process: ${error.message}`);
    
    // Clean up
    try {
      await sourceAPI.close();
    } catch (closeError) {
      extractionLogger.error(`Error closing source API: ${closeError.message}`);
    }
    
    return {
      orderNumber,
      error: error.message,
      success: false
    };
  }
}

/**
 * Extract information from multiple executive orders
 * @param {Array} orderNumbers Array of executive order numbers
 * @param {Array} extractorTypes Types of information to extract
 * @returns {Promise<Object>} Extraction results
 */
async function extractFromOrders(orderNumbers, extractorTypes = ['dates', 'requirements', 'impacts']) {
  extractionLogger.info(`Extracting information from ${orderNumbers.length} executive orders`);
  
  try {
    // Initialize the extraction system
    initializeExtractors();
    
    // Initialize the source API
    await sourceAPI.initialize();
    
    const results = {};
    let successCount = 0;
    let errorCount = 0;
    
    // Extract from each order
    for (const orderNumber of orderNumbers) {
      try {
        extractionLogger.info(`Processing order ${orderNumber}`);
        
        const orderResults = {};
        let orderSuccess = true;
        
        // Extract each type of information
        for (const extractorType of extractorTypes) {
          try {
            const extractionResult = await extractionManager.extractFromOrder(orderNumber, extractorType);
            
            orderResults[extractorType] = extractionResult;
          } catch (error) {
            extractionLogger.error(`Error extracting ${extractorType} from order ${orderNumber}: ${error.message}`);
            orderSuccess = false;
          }
        }
        
        // Store results for this order
        results[orderNumber] = {
          results: orderResults,
          success: orderSuccess
        };
        
        if (orderSuccess) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        extractionLogger.error(`Error processing order ${orderNumber}: ${error.message}`);
        
        results[orderNumber] = {
          error: error.message,
          success: false
        };
        
        errorCount++;
      }
    }
    
    // Clean up
    await sourceAPI.close();
    
    return {
      results,
      successCount,
      errorCount,
      totalCount: orderNumbers.length
    };
  } catch (error) {
    extractionLogger.error(`Error in batch extraction process: ${error.message}`);
    
    // Clean up
    try {
      await sourceAPI.close();
    } catch (closeError) {
      extractionLogger.error(`Error closing source API: ${closeError.message}`);
    }
    
    return {
      error: error.message,
      success: false
    };
  }
}

/**
 * Extract information from all executive orders
 * @param {Object} options Extraction options
 * @returns {Promise<Object>} Extraction results
 */
async function extractFromAllOrders(options = {}) {
  extractionLogger.info('Extracting information from all executive orders');
  
  try {
    // Initialize the source API
    await sourceAPI.initialize();
    
    // Get all executive orders
    const orders = await sourceAPI.findExecutiveOrders({}, { limit: options.limit || 100 });
    
    extractionLogger.info(`Found ${orders.length} executive orders`);
    
    // Extract the order numbers
    const orderNumbers = orders.map(order => order.orderNumber);
    
    // Extract information from each order
    return await extractFromOrders(orderNumbers, options.extractorTypes || ['dates', 'requirements']);
  } catch (error) {
    extractionLogger.error(`Error extracting from all orders: ${error.message}`);
    
    // Clean up
    try {
      await sourceAPI.close();
    } catch (closeError) {
      extractionLogger.error(`Error closing source API: ${closeError.message}`);
    }
    
    return {
      error: error.message,
      success: false
    };
  }
}

/**
 * Main function to run extraction
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    if (command === 'single') {
      // Extract from a single order
      const orderNumber = args[1];
      const extractorTypes = args.slice(2);
      
      if (!orderNumber) {
        console.error('Order number is required for single extraction');
        process.exit(1);
      }
      
      const results = await extractFromOrder(
        orderNumber,
        extractorTypes.length > 0 ? extractorTypes : undefined
      );
      
      console.log('Extraction results:');
      console.log(JSON.stringify(results, null, 2));
      
    } else if (command === 'batch') {
      // Extract from a batch of orders
      const orderNumbers = args.slice(1);
      
      if (orderNumbers.length === 0) {
        console.error('At least one order number is required for batch extraction');
        process.exit(1);
      }
      
      const results = await extractFromOrders(orderNumbers);
      
      console.log('Batch extraction results:');
      console.log(JSON.stringify({
        successCount: results.successCount,
        errorCount: results.errorCount,
        totalCount: results.totalCount
      }, null, 2));
      
    } else if (command === 'all') {
      // Extract from all orders
      const limit = parseInt(args[1]) || 10;
      
      const results = await extractFromAllOrders({ limit });
      
      console.log('All orders extraction results:');
      console.log(JSON.stringify({
        successCount: results.successCount,
        errorCount: results.errorCount,
        totalCount: results.totalCount
      }, null, 2));
      
    } else {
      // Show usage
      console.log('Usage:');
      console.log('  node extract_order_information.js single <orderNumber> [extractorTypes...]');
      console.log('  node extract_order_information.js batch <orderNumber1> <orderNumber2> ...');
      console.log('  node extract_order_information.js all [limit]');
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// If this script is run directly, execute the main function
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
} else {
  // Export functions for use in other modules
  module.exports = {
    extractFromOrder,
    extractFromOrders,
    extractFromAllOrders
  };
}