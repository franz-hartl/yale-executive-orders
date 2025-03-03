/**
 * extraction_manager.js
 * 
 * Manages the extraction of specific types of information from executive order sources.
 * Coordinates between different extractors and handles the storage of extracted information.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const sourceAPI = require('../sources/source_api');
const { sleep } = require('../utils/common');

// Create a logger for the extraction manager
const extractionLogger = logger.createNamedLogger('ExtractionManager');

/**
 * Extraction Manager class
 */
class ExtractionManager {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || 5,
      retryLimit: options.retryLimit || 3,
      retryDelay: options.retryDelay || 2000,
      storageDir: options.storageDir || path.join(process.cwd(), 'extraction', 'results'),
      ...options
    };
    
    // Create the storage directory if it doesn't exist
    fs.mkdirSync(this.options.storageDir, { recursive: true });
    
    // Initialize extractors registry
    this.extractors = new Map();
    
    extractionLogger.info('Extraction Manager initialized');
  }
  
  /**
   * Register an extractor
   * @param {string} extractorType Type of extractor (e.g., 'dates', 'requirements')
   * @param {Object} extractor Extractor instance
   */
  registerExtractor(extractorType, extractor) {
    if (this.extractors.has(extractorType)) {
      extractionLogger.warn(`Extractor for type ${extractorType} is already registered. Overwriting.`);
    }
    
    this.extractors.set(extractorType, extractor);
    extractionLogger.info(`Registered extractor for type: ${extractorType}`);
  }
  
  /**
   * Get an extractor by type
   * @param {string} extractorType Type of extractor
   * @returns {Object} Extractor instance
   */
  getExtractor(extractorType) {
    const extractor = this.extractors.get(extractorType);
    if (!extractor) {
      throw new Error(`No extractor registered for type: ${extractorType}`);
    }
    return extractor;
  }
  
  /**
   * Extract specific information from an executive order
   * @param {string} orderNumber Executive order number
   * @param {string} extractorType Type of information to extract
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Extraction results
   */
  async extractFromOrder(orderNumber, extractorType, options = {}) {
    extractionLogger.info(`Extracting ${extractorType} from executive order ${orderNumber}`);
    
    try {
      // Get the extractor
      const extractor = this.getExtractor(extractorType);
      
      // Get the executive order
      const order = await sourceAPI.getExecutiveOrder(orderNumber);
      
      if (!order) {
        throw new Error(`Executive order ${orderNumber} not found`);
      }
      
      // Extract the information
      const results = await this._extractWithRetry(extractor, order, options);
      
      // Store the results
      await this._storeResults(orderNumber, extractorType, results);
      
      return results;
    } catch (error) {
      extractionLogger.error(`Error extracting ${extractorType} from order ${orderNumber}: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Extract information from multiple orders
   * @param {Array<string>} orderNumbers Array of executive order numbers
   * @param {string} extractorType Type of information to extract
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Extraction results by order number
   */
  async extractFromOrders(orderNumbers, extractorType, options = {}) {
    extractionLogger.info(`Batch extracting ${extractorType} from ${orderNumbers.length} executive orders`);
    
    const results = {};
    const errors = [];
    
    // Process orders in batches
    const batchSize = options.batchSize || this.options.batchSize;
    const batches = [];
    
    for (let i = 0; i < orderNumbers.length; i += batchSize) {
      batches.push(orderNumbers.slice(i, i + batchSize));
    }
    
    extractionLogger.info(`Split extraction into ${batches.length} batches of size ${batchSize}`);
    
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      extractionLogger.info(`Processing batch ${batchIndex + 1} of ${batches.length}`);
      
      // Process orders in parallel within each batch
      const batchPromises = batch.map(orderNumber => 
        this.extractFromOrder(orderNumber, extractorType, options)
          .then(result => {
            results[orderNumber] = result;
            return { orderNumber, success: true };
          })
          .catch(error => {
            errors.push({ orderNumber, error: error.message });
            return { orderNumber, success: false, error: error.message };
          })
      );
      
      // Wait for all orders in this batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      extractionLogger.info(`Completed batch ${batchIndex + 1}. Successful: ${batchResults.filter(r => r.success).length}, Failed: ${batchResults.filter(r => !r.success).length}`);
      
      // Add a delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        const batchDelay = options.batchDelay || 2000;
        await sleep(batchDelay);
      }
    }
    
    if (errors.length > 0) {
      extractionLogger.warn(`Encountered ${errors.length} errors during batch extraction`);
      for (const error of errors) {
        extractionLogger.warn(`- Error extracting from order ${error.orderNumber}: ${error.error}`);
      }
    }
    
    return {
      results,
      errors,
      successCount: Object.keys(results).length,
      errorCount: errors.length
    };
  }
  
  /**
   * Extract information with retry logic
   * @param {Object} extractor Extractor instance
   * @param {Object} order Executive order data
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Extraction results
   * @private
   */
  async _extractWithRetry(extractor, order, options = {}) {
    const retryLimit = options.retryLimit || this.options.retryLimit;
    const retryDelay = options.retryDelay || this.options.retryDelay;
    
    let attempts = 0;
    let lastError = null;
    
    while (attempts < retryLimit) {
      try {
        // Attempt the extraction
        const result = await extractor.extract(order, options);
        
        // Calculate confidence score if not provided
        if (!result.confidence && extractor.calculateConfidence) {
          result.confidence = extractor.calculateConfidence(result, order);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        attempts++;
        
        extractionLogger.warn(`Extraction attempt ${attempts}/${retryLimit} failed: ${error.message}`);
        
        if (attempts < retryLimit) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempts - 1);
          extractionLogger.info(`Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }
    
    // If we've exhausted all retries, throw the last error
    throw lastError;
  }
  
  /**
   * Store extraction results
   * @param {string} orderNumber Executive order number
   * @param {string} extractorType Type of information extracted
   * @param {Object} results Extraction results
   * @returns {Promise<string>} Path to the stored results
   * @private
   */
  async _storeResults(orderNumber, extractorType, results) {
    // Format the order number for filenames (remove non-alphanumeric characters)
    const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9]/g, '');
    
    // Create timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Create the results directory if it doesn't exist
    const resultsDir = path.join(this.options.storageDir, extractorType);
    fs.mkdirSync(resultsDir, { recursive: true });
    
    // Create the results file
    const resultsPath = path.join(resultsDir, `${safeOrderNumber}_${timestamp}.json`);
    
    // Add metadata to the results
    const resultsWithMetadata = {
      orderNumber,
      extractorType,
      extractionDate: new Date().toISOString(),
      results
    };
    
    // Write the results to file
    await fs.promises.writeFile(
      resultsPath,
      JSON.stringify(resultsWithMetadata, null, 2)
    );
    
    extractionLogger.info(`Stored ${extractorType} extraction results for order ${orderNumber} at ${resultsPath}`);
    
    return resultsPath;
  }
  
  /**
   * Load extraction results
   * @param {string} orderNumber Executive order number
   * @param {string} extractorType Type of information extracted
   * @returns {Promise<Object>} Extraction results
   */
  async loadResults(orderNumber, extractorType) {
    // Format the order number for filenames
    const safeOrderNumber = orderNumber.replace(/[^a-zA-Z0-9]/g, '');
    
    // Get the results directory
    const resultsDir = path.join(this.options.storageDir, extractorType);
    
    try {
      // Check if the directory exists
      await fs.promises.access(resultsDir);
      
      // Get all files for this order
      const files = await fs.promises.readdir(resultsDir);
      const orderFiles = files.filter(file => file.startsWith(safeOrderNumber));
      
      if (orderFiles.length === 0) {
        return null;
      }
      
      // Sort by timestamp (newest first)
      orderFiles.sort().reverse();
      
      // Read the newest file
      const newestFile = orderFiles[0];
      const resultsPath = path.join(resultsDir, newestFile);
      
      // Read and parse the results
      const resultsData = await fs.promises.readFile(resultsPath, 'utf8');
      return JSON.parse(resultsData);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Directory or file doesn't exist
        return null;
      }
      
      extractionLogger.error(`Error loading results for order ${orderNumber}: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Load all extraction results for a specific type
   * @param {string} extractorType Type of information extracted
   * @returns {Promise<Array>} Array of extraction results
   */
  async loadAllResults(extractorType) {
    // Get the results directory
    const resultsDir = path.join(this.options.storageDir, extractorType);
    
    try {
      // Check if the directory exists
      await fs.promises.access(resultsDir);
      
      // Get all files
      const files = await fs.promises.readdir(resultsDir);
      
      // Read and parse each file
      const results = [];
      
      for (const file of files) {
        try {
          const resultsPath = path.join(resultsDir, file);
          const resultsData = await fs.promises.readFile(resultsPath, 'utf8');
          results.push(JSON.parse(resultsData));
        } catch (error) {
          extractionLogger.warn(`Error reading results file ${file}: ${error.message}`);
        }
      }
      
      return results;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist
        return [];
      }
      
      extractionLogger.error(`Error loading all results for type ${extractorType}: ${error.message}`, error);
      throw error;
    }
  }
}

// Create a singleton instance
const extractionManager = new ExtractionManager();

module.exports = extractionManager;