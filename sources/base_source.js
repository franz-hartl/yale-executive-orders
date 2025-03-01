/**
 * base_source.js
 * 
 * Base class for all executive order data sources. Defines the standard interface
 * and common functionality that all source adapters should implement.
 */

const { generateUniqueId } = require('../utils/common');
const logger = require('../utils/logger');

/**
 * Base class for all data source adapters
 */
class BaseSource {
  /**
   * Constructor for BaseSource
   * @param {Object} options Configuration options for the source
   */
  constructor(options = {}) {
    this.id = options.id || generateUniqueId();
    this.name = options.name || 'Unknown Source';
    this.description = options.description || '';
    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.options = options;
    
    // Set up source-specific logger
    this.logger = logger.createNamedLogger(this.name);
  }
  
  /**
   * Fetches executive orders from this source
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    throw new Error('fetchOrders must be implemented by subclass');
  }
  
  /**
   * Fetches a specific executive order by ID or number
   * @param {string} identifier Order identifier (number, document number, etc.)
   * @returns {Promise<Object>} Executive order in standardized format
   */
  async fetchOrderById(identifier) {
    throw new Error('fetchOrderById must be implemented by subclass');
  }
  
  /**
   * Initializes the source, setting up any necessary resources
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info(`Initializing source: ${this.name}`);
    // Base implementation does nothing, but subclasses may override
    return;
  }
  
  /**
   * Cleans up the source, releasing any resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.logger.info(`Cleaning up source: ${this.name}`);
    // Base implementation does nothing, but subclasses may override
    return;
  }
  
  /**
   * Validates an executive order's format
   * @param {Object} order Executive order to validate
   * @returns {boolean} Whether the order is valid
   */
  validateOrder(order) {
    // Check required fields
    if (!order.title) {
      this.logger.warn('Order missing required field: title');
      return false;
    }
    
    // Either order_number or document_number should be present
    if (!order.order_number && !order.document_number) {
      this.logger.warn('Order missing both order_number and document_number identifiers');
      return false;
    }
    
    return true;
  }
  
  /**
   * Standardizes an executive order's format
   * @param {Object} order Executive order to standardize
   * @returns {Object} Standardized executive order
   */
  standardizeOrder(order) {
    // Create a new object with standardized fields
    const standardOrder = {
      order_number: order.order_number || order.executive_order_number || null,
      document_number: order.document_number || null,
      title: order.title || '',
      signing_date: order.signing_date || null,
      publication_date: order.publication_date || null,
      president: order.president || 'Unknown',
      summary: order.summary || order.abstract || order.description || '',
      full_text: order.full_text || order.body || '',
      url: order.url || order.html_url || '',
      source: this.name,
      metadata: {}
    };
    
    // Add source-specific metadata if available
    if (order.metadata) {
      standardOrder.metadata = { ...order.metadata };
    }
    
    // Add any additional fields as metadata
    for (const [key, value] of Object.entries(order)) {
      if (!standardOrder.hasOwnProperty(key) && value !== undefined) {
        standardOrder.metadata[key] = value;
      }
    }
    
    return standardOrder;
  }
  
  /**
   * Handles error during fetch operations
   * @param {Error} error Error object
   * @param {string} operation Operation name
   * @param {Object} context Additional context
   * @returns {Object} Error information
   */
  handleError(error, operation, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      source: this.name,
      operation,
      message: error.message,
      stack: error.stack,
      context
    };
    
    this.logger.error(`Error in ${operation}: ${error.message}`, { errorInfo });
    return errorInfo;
  }
  
  /**
   * Checks if the source is enabled
   * @returns {boolean} Whether the source is enabled
   */
  isEnabled() {
    return this.enabled;
  }
  
  /**
   * Enables the source
   */
  enable() {
    this.enabled = true;
    this.logger.info(`Source enabled: ${this.name}`);
  }
  
  /**
   * Disables the source
   */
  disable() {
    this.enabled = false;
    this.logger.info(`Source disabled: ${this.name}`);
  }
}

module.exports = BaseSource;