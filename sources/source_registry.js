/**
 * source_registry.js
 * 
 * Registry for all executive order data sources. Provides a unified interface
 * for registering, managing, and accessing data sources while maintaining their independence.
 */

const logger = require('../utils/logger');
const { deepClone } = require('../utils/common');

/**
 * Registry for executive order data sources
 */
class SourceRegistry {
  /**
   * Constructor for SourceRegistry
   */
  constructor() {
    this.sources = new Map();
    this.logger = logger.createNamedLogger('SourceRegistry');
  }
  
  /**
   * Registers a data source
   * @param {BaseSource} source Source to register
   * @returns {boolean} Whether registration was successful
   */
  registerSource(source) {
    if (!source || !source.id || !source.name || typeof source.fetchOrders !== 'function') {
      this.logger.error('Invalid source provided for registration');
      return false;
    }
    
    if (this.sources.has(source.id)) {
      this.logger.warn(`Source with ID ${source.id} is already registered`);
      return false;
    }
    
    this.sources.set(source.id, source);
    this.logger.info(`Registered source: ${source.name} (${source.id})`);
    return true;
  }
  
  /**
   * Unregisters a data source
   * @param {string} sourceId ID of the source to unregister
   * @returns {boolean} Whether unregistration was successful
   */
  unregisterSource(sourceId) {
    if (!this.sources.has(sourceId)) {
      this.logger.warn(`Source with ID ${sourceId} is not registered`);
      return false;
    }
    
    const source = this.sources.get(sourceId);
    this.sources.delete(sourceId);
    this.logger.info(`Unregistered source: ${source.name} (${sourceId})`);
    return true;
  }
  
  /**
   * Gets a data source by ID
   * @param {string} sourceId ID of the source to get
   * @returns {BaseSource|null} The source or null if not found
   */
  getSource(sourceId) {
    return this.sources.get(sourceId) || null;
  }
  
  /**
   * Gets all registered data sources
   * @param {boolean} onlyEnabled Whether to include only enabled sources
   * @returns {Array<BaseSource>} Array of sources
   */
  getAllSources(onlyEnabled = false) {
    const allSources = Array.from(this.sources.values());
    return onlyEnabled ? allSources.filter(source => source.isEnabled()) : allSources;
  }
  
  /**
   * Enables a data source
   * @param {string} sourceId ID of the source to enable
   * @returns {boolean} Whether enabling was successful
   */
  enableSource(sourceId) {
    const source = this.getSource(sourceId);
    if (!source) {
      this.logger.warn(`Cannot enable source ${sourceId}: not found`);
      return false;
    }
    
    source.enable();
    return true;
  }
  
  /**
   * Disables a data source
   * @param {string} sourceId ID of the source to disable
   * @returns {boolean} Whether disabling was successful
   */
  disableSource(sourceId) {
    const source = this.getSource(sourceId);
    if (!source) {
      this.logger.warn(`Cannot disable source ${sourceId}: not found`);
      return false;
    }
    
    source.disable();
    return true;
  }
  
  /**
   * Initializes all registered sources
   * @param {boolean} onlyEnabled Whether to initialize only enabled sources
   * @returns {Promise<Array>} Results of initialization
   */
  async initializeAllSources(onlyEnabled = true) {
    const sources = this.getAllSources(onlyEnabled);
    this.logger.info(`Initializing ${sources.length} sources`);
    
    const results = [];
    
    for (const source of sources) {
      try {
        await source.initialize();
        results.push({
          sourceId: source.id,
          success: true
        });
      } catch (error) {
        this.logger.error(`Failed to initialize source ${source.name}: ${error.message}`);
        results.push({
          sourceId: source.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Cleans up all registered sources
   * @param {boolean} onlyEnabled Whether to clean up only enabled sources
   * @returns {Promise<Array>} Results of cleanup
   */
  async cleanupAllSources(onlyEnabled = true) {
    const sources = this.getAllSources(onlyEnabled);
    this.logger.info(`Cleaning up ${sources.length} sources`);
    
    const results = [];
    
    for (const source of sources) {
      try {
        await source.cleanup();
        results.push({
          sourceId: source.id,
          success: true
        });
      } catch (error) {
        this.logger.error(`Failed to clean up source ${source.name}: ${error.message}`);
        results.push({
          sourceId: source.id,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Fetches orders from all registered sources
   * @param {Object} options Fetch options
   * @param {boolean} onlyEnabled Whether to fetch from only enabled sources
   * @returns {Promise<Object>} Results by source
   */
  async fetchFromAllSources(options = {}, onlyEnabled = true) {
    const sources = this.getAllSources(onlyEnabled);
    this.logger.info(`Fetching orders from ${sources.length} sources`);
    
    const results = {
      orders: [],
      sourceResults: {}
    };
    
    for (const source of sources) {
      try {
        this.logger.info(`Fetching from source: ${source.name}`);
        const sourceOrders = await source.fetchOrders(options);
        
        if (Array.isArray(sourceOrders) && sourceOrders.length > 0) {
          this.logger.info(`Found ${sourceOrders.length} orders from source: ${source.name}`);
          
          // Add to combined results, ensuring deep copy
          results.orders.push(...deepClone(sourceOrders));
          
          // Store source-specific results
          results.sourceResults[source.id] = {
            success: true,
            count: sourceOrders.length
          };
        } else {
          this.logger.warn(`No orders found from source: ${source.name}`);
          results.sourceResults[source.id] = {
            success: true,
            count: 0
          };
        }
      } catch (error) {
        this.logger.error(`Failed to fetch from source ${source.name}: ${error.message}`);
        results.sourceResults[source.id] = {
          success: false,
          error: error.message
        };
      }
    }
    
    // Remove duplicates based on order_number or document_number
    const uniqueOrders = this.removeDuplicateOrders(results.orders);
    results.orders = uniqueOrders;
    
    this.logger.info(`Fetched ${results.orders.length} unique orders from all sources`);
    return results;
  }
  
  /**
   * Fetches a specific order from all sources until found
   * @param {string} identifier Order identifier (number or document number)
   * @param {boolean} onlyEnabled Whether to fetch from only enabled sources
   * @returns {Promise<Object>} The order if found
   */
  async fetchOrderById(identifier, onlyEnabled = true) {
    const sources = this.getAllSources(onlyEnabled);
    this.logger.info(`Fetching order ${identifier} from ${sources.length} sources`);
    
    // Try each source until the order is found
    for (const source of sources) {
      try {
        this.logger.debug(`Trying source: ${source.name}`);
        const order = await source.fetchOrderById(identifier);
        
        if (order) {
          this.logger.info(`Found order ${identifier} in source: ${source.name}`);
          return deepClone(order);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch order ${identifier} from source ${source.name}: ${error.message}`);
      }
    }
    
    this.logger.info(`Order ${identifier} not found in any source`);
    return null;
  }
  
  /**
   * Removes duplicate orders from an array of orders
   * @param {Array} orders Array of orders
   * @returns {Array} Array of unique orders
   */
  removeDuplicateOrders(orders) {
    // Track seen orders by different identifiers
    const seenOrderNumbers = new Set();
    const seenDocumentNumbers = new Set();
    const seenTitles = new Set();
    
    const uniqueOrders = [];
    
    for (const order of orders) {
      // Check if we've seen this order before
      const orderNumber = order.order_number;
      const documentNumber = order.document_number;
      const title = order.title;
      
      let isDuplicate = false;
      
      // Check by order number if available
      if (orderNumber && seenOrderNumbers.has(orderNumber)) {
        isDuplicate = true;
      }
      
      // Check by document number if available
      if (!isDuplicate && documentNumber && seenDocumentNumbers.has(documentNumber)) {
        isDuplicate = true;
      }
      
      // As a last resort, check by title
      if (!isDuplicate && title && seenTitles.has(title)) {
        isDuplicate = true;
      }
      
      if (!isDuplicate) {
        // Add to unique orders and mark as seen
        uniqueOrders.push(order);
        
        if (orderNumber) seenOrderNumbers.add(orderNumber);
        if (documentNumber) seenDocumentNumbers.add(documentNumber);
        if (title) seenTitles.add(title);
      }
    }
    
    return uniqueOrders;
  }
}

// Create singleton instance
const sourceRegistry = new SourceRegistry();

module.exports = sourceRegistry;