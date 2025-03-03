/**
 * base_adapter.js
 * 
 * Base adapter class for source-specific data fetching.
 * All source adapters should extend this class to provide a consistent interface.
 */

const logger = require('../../utils/logger');
const { makeRequestWithRetry, makeJsonRequest } = require('../../utils/http');
const sourceManager = require('../source_manager');
const { generateContentHash } = require('../../utils/source_versioning');
const crypto = require('crypto');

/**
 * Base adapter for source-specific data fetching
 */
class BaseAdapter {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.sourceId = options.sourceId;
    this.sourceType = options.sourceType || 'unknown';
    this.name = options.name || `${this.sourceType} Adapter`;
    this.description = options.description || `Adapter for ${this.sourceType}`;
    
    // Create a logger
    this.logger = logger.createNamedLogger(`${this.name}Adapter`);
    
    // HTTP settings
    this.baseUrl = options.baseUrl || '';
    this.requestDelay = options.requestDelay || 1000;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 30000;
    
    // Authentication settings
    this.authRequired = !!options.authRequired;
    this.apiKey = options.apiKey || '';
    this.authToken = options.authToken || '';
    this.authHeaders = options.authHeaders || {};
    
    // Options
    this.options = options;
    
    // Create a named logger
    this.logger = logger.createJobLogger(`${this.name}Adapter`);
  }
  
  /**
   * Initialize the adapter
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info(`Initializing ${this.name} adapter`);
    
    // Validate source ID
    if (!this.sourceId) {
      const errorMessage = 'Source ID is required';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // Check if source exists in source manager
    try {
      const sources = await sourceManager.getAllSources(true);
      const source = sources.find(s => s.id === this.sourceId);
      
      if (!source) {
        this.logger.warn(`Source with ID ${this.sourceId} not found in source manager. Will create it.`);
        
        // Create source if it doesn't exist
        await sourceManager.registerSource(this.sourceType, {
          name: this.name,
          description: this.description,
          baseUrl: this.baseUrl,
          authRequired: this.authRequired,
          apiKeyRequired: !!this.apiKey
        });
      }
    } catch (error) {
      this.logger.warn(`Error checking source: ${error.message}`);
      // Continue even if check fails - the fetch will create the source if needed
    }
  }
  
  /**
   * Make a request to the source API
   * @param {string} endpoint API endpoint
   * @param {Object} options Request options
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(endpoint, options = {}) {
    const url = this.baseUrl ? `${this.baseUrl}${endpoint}` : endpoint;
    
    // Add authentication headers if required
    const headers = { ...options.headers };
    
    if (this.authRequired) {
      if (this.apiKey) {
        headers['X-API-Key'] = this.apiKey;
      }
      
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }
      
      // Add any additional auth headers
      Object.assign(headers, this.authHeaders);
    }
    
    const requestOptions = {
      ...options,
      headers,
      retries: this.maxRetries,
      timeout: this.timeout,
      requestDelay: this.requestDelay
    };
    
    try {
      // Use JSON request by default, but allow overriding
      const responseData = options.useJsonRequest !== false 
        ? await makeJsonRequest(url, requestOptions)
        : await makeRequestWithRetry(url, requestOptions);
      
      return responseData;
    } catch (error) {
      this.logger.error(`Request failed: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Fetch data from the source
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Fetched data
   */
  async fetchData(options = {}) {
    this.logger.info(`Fetching data from ${this.name}`);
    
    try {
      // Record fetch attempt
      const startTime = Date.now();
      
      // Implement in subclass
      const data = await this._fetchImplementation(options);
      
      // Record successful fetch
      const duration = Date.now() - startTime;
      this.logger.info(`Fetch completed in ${duration}ms, got ${data.length} items`);
      await sourceManager.recordSourceFetch(this.sourceId, true);
      
      return data;
    } catch (error) {
      // Record failed fetch
      this.logger.error(`Fetch failed: ${error.message}`);
      await sourceManager.recordSourceFetch(this.sourceId, false, error.message);
      
      throw error;
    }
  }
  
  /**
   * Implementation of fetch logic - must be overridden by subclasses
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Fetched data
   * @protected
   */
  async _fetchImplementation(options = {}) {
    throw new Error('_fetchImplementation must be implemented by subclass');
  }
  
  /**
   * Store content in the source manager
   * @param {Object} content Content to store
   * @param {Object} options Storage options
   * @returns {Promise<string>} ID of stored content
   */
  async storeContent(content, options = {}) {
    try {
      // Generate a content ID if not provided
      const contentId = options.contentId || crypto.randomUUID();
      
      // Store the content
      await sourceManager.storeSourceContent(this.sourceId, content, {
        contentId,
        contentType: options.contentType || 'default',
        title: options.title,
        orderNumber: options.orderNumber,
        documentNumber: options.documentNumber,
        contentDate: options.contentDate,
        storageType: options.storageType || 'inline',
        metadata: options.metadata || {}
      });
      
      return contentId;
    } catch (error) {
      this.logger.error(`Failed to store content: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Process and store multiple items
   * @param {Array} items Items to process and store
   * @param {Object} options Processing options
   * @returns {Promise<Array>} Array of content IDs
   */
  async processAndStoreItems(items, options = {}) {
    const results = [];
    const errors = [];
    
    this.logger.info(`Processing ${items.length} items for storage`);
    
    for (const item of items) {
      try {
        // Process the item according to type
        const processedItem = this._processItem(item, options);
        
        // Skip invalid items
        if (!processedItem) {
          continue;
        }
        
        // Generate content ID if needed
        const contentId = options.generateContentId ? crypto.randomUUID() : processedItem.id;
        
        // Store the content
        await this.storeContent(processedItem, {
          contentId,
          contentType: options.contentType || 'default',
          title: processedItem.title,
          orderNumber: processedItem.orderNumber || processedItem.order_number,
          documentNumber: processedItem.documentNumber || processedItem.document_number,
          contentDate: processedItem.date || processedItem.publication_date || new Date().toISOString(),
          metadata: {
            originalItem: options.storeOriginal ? item : null,
            processingOptions: options,
            processedAt: new Date().toISOString()
          }
        });
        
        results.push(contentId);
      } catch (error) {
        this.logger.error(`Error processing item: ${error.message}`);
        errors.push({
          item,
          error: error.message
        });
      }
    }
    
    this.logger.info(`Processed and stored ${results.length} items, with ${errors.length} errors`);
    
    return {
      contentIds: results,
      errors
    };
  }
  
  /**
   * Process a single item before storage - must be overridden by subclasses
   * @param {Object} item Item to process
   * @param {Object} options Processing options
   * @returns {Object} Processed item
   * @protected
   */
  _processItem(item, options = {}) {
    // Base implementation just returns the item
    // Subclasses should override this to process the item according to source-specific needs
    return item;
  }
  
  /**
   * Validate a stored item
   * @param {string} contentId ID of the content to validate
   * @returns {Promise<boolean>} Whether the item is valid
   */
  async validateContent(contentId) {
    try {
      // Get the content
      const content = await sourceManager.getSourceContent(contentId);
      
      if (!content) {
        return false;
      }
      
      // Validate the content
      const validationResult = this._validateContentItem(content);
      
      // Update validation status
      if (!validationResult.isValid) {
        await sourceManager.storeSourceContent(
          this.sourceId,
          content.content,
          {
            contentId,
            isValid: false,
            validationMessage: validationResult.message,
            processingStatus: 'validation_failed'
          }
        );
      }
      
      return validationResult.isValid;
    } catch (error) {
      this.logger.error(`Validation error: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Validate a content item - can be overridden by subclasses
   * @param {Object} content Content to validate
   * @returns {Object} Validation result
   * @protected
   */
  _validateContentItem(content) {
    // Base implementation does minimal validation
    if (!content || !content.content) {
      return {
        isValid: false,
        message: 'Content is empty'
      };
    }
    
    return {
      isValid: true,
      message: ''
    };
  }
}

module.exports = BaseAdapter;