/**
 * source_api.js
 * 
 * Provides a simplified API for accessing source data.
 * This module serves as a convenient interface to the source data management system.
 */

const sourceManager = require('./source_manager');
const logger = require('../utils/logger');

// Create a logger
const apiLogger = logger.createJobLogger('SourceAPI');

/**
 * Initializes the source API
 * @returns {Promise<void>}
 */
async function initialize() {
  apiLogger.info('Initializing Source API');
  
  // Initialize the source manager if not already initialized
  if (!sourceManager.isInitialized) {
    await sourceManager.initialize();
  }
}

/**
 * Finds executive orders by criteria
 * @param {Object} criteria Search criteria
 * @param {Object} options Search options
 * @returns {Promise<Array>} Matching executive orders
 */
async function findExecutiveOrders(criteria = {}, options = {}) {
  await initialize();
  
  apiLogger.info(`Finding executive orders with criteria: ${JSON.stringify(criteria)}`);
  
  try {
    // Build search criteria for source content
    const searchCriteria = {
      contentType: 'executive_order'
    };
    
    // Add order number if provided
    if (criteria.orderNumber) {
      searchCriteria.orderNumber = criteria.orderNumber;
    }
    
    // Add document number if provided
    if (criteria.documentNumber) {
      searchCriteria.documentNumber = criteria.documentNumber;
    }
    
    // Add title search if provided
    if (criteria.title) {
      searchCriteria.title = criteria.title;
    }
    
    // Add date range if provided
    if (criteria.fromDate) {
      searchCriteria.fromDate = criteria.fromDate;
    }
    
    if (criteria.toDate) {
      searchCriteria.toDate = criteria.toDate;
    }
    
    // Search source content
    const searchResults = await sourceManager.searchSourceContent(searchCriteria, {
      limit: options.limit || 100,
      offset: options.offset || 0,
      orderBy: options.orderBy || 'c.content_date DESC'
    });
    
    apiLogger.info(`Found ${searchResults.length} matching orders`);
    
    // If full content is requested, fetch each order's full content
    if (options.includeContent) {
      const fullResults = [];
      
      for (const result of searchResults) {
        const content = await sourceManager.getSourceContent(result.id);
        if (content) {
          fullResults.push({
            ...result,
            data: content.content
          });
        }
      }
      
      return fullResults;
    }
    
    return searchResults;
  } catch (error) {
    apiLogger.error(`Error finding executive orders: ${error.message}`, error);
    throw error;
  }
}

/**
 * Gets a specific executive order by order number
 * @param {string} orderNumber Executive order number (e.g., "14028")
 * @returns {Promise<Object>} Executive order data
 */
async function getExecutiveOrder(orderNumber) {
  await initialize();
  
  apiLogger.info(`Getting executive order: ${orderNumber}`);
  
  try {
    // Search for the order
    const results = await findExecutiveOrders({ orderNumber }, { includeContent: true, limit: 1 });
    
    if (results.length === 0) {
      apiLogger.warn(`Executive order not found: ${orderNumber}`);
      return null;
    }
    
    apiLogger.info(`Found executive order: ${orderNumber}`);
    return results[0];
  } catch (error) {
    apiLogger.error(`Error getting executive order: ${error.message}`, error);
    throw error;
  }
}

/**
 * Gets information about available sources
 * @param {boolean} includeDisabled Whether to include disabled sources
 * @returns {Promise<Array>} Source information
 */
async function getSources(includeDisabled = false) {
  await initialize();
  
  try {
    const sources = await sourceManager.getAllSources(includeDisabled);
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      description: source.description,
      type: source.source_type,
      isEnabled: source.isEnabled,
      isPrimary: source.isPrimary,
      lastFetch: source.last_fetch_date,
      lastSuccessfulFetch: source.last_successful_fetch_date,
      fetchFrequency: `${source.fetch_frequency_hours} hours`
    }));
  } catch (error) {
    apiLogger.error(`Error getting sources: ${error.message}`, error);
    throw error;
  }
}

/**
 * Closes connections and cleans up resources
 * @returns {Promise<void>}
 */
async function close() {
  if (sourceManager.isInitialized) {
    await sourceManager.close();
  }
}

module.exports = {
  initialize,
  findExecutiveOrders,
  getExecutiveOrder,
  getSources,
  close
};