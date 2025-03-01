/**
 * local_file_source.js
 * 
 * Data source adapter for loading executive order data from local files,
 * which can serve as a cache or backup for when remote sources are unavailable.
 */

const BaseSource = require('./base_source');
const { readJsonFile, determinePresident } = require('../utils/common');
const path = require('path');
const fs = require('fs');

/**
 * Local file source adapter
 */
class LocalFileSource extends BaseSource {
  /**
   * Constructor for LocalFileSource
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Local File',
      description: 'Local file source for executive orders',
      ...options
    });
    
    this.dataDir = options.dataDir || path.join(__dirname, '..', 'data');
    this.primaryFile = options.primaryFile || 'executive_orders.json';
    this.backupFiles = options.backupFiles || [];
  }
  
  /**
   * Initializes the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info(`Initializing local file source in directory: ${this.dataDir}`);
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      this.logger.info(`Created data directory: ${this.dataDir}`);
    }
    
    // Check if primary file exists
    const primaryPath = path.join(this.dataDir, this.primaryFile);
    if (!fs.existsSync(primaryPath)) {
      this.logger.warn(`Primary data file does not exist: ${primaryPath}`);
    } else {
      this.logger.info(`Primary data file exists: ${primaryPath}`);
    }
  }
  
  /**
   * Fetches executive orders from local files
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    try {
      this.logger.info('Fetching executive orders from local files');
      
      const {
        fromDate,
        toDate,
        includeBackups = true
      } = options;
      
      let allOrders = [];
      
      // Try to load from primary file
      const primaryPath = path.join(this.dataDir, this.primaryFile);
      try {
        if (fs.existsSync(primaryPath)) {
          const primaryOrders = readJsonFile(primaryPath);
          if (Array.isArray(primaryOrders)) {
            this.logger.info(`Loaded ${primaryOrders.length} orders from primary file`);
            allOrders.push(...primaryOrders);
          }
        } else {
          this.logger.warn(`Primary file not found: ${primaryPath}`);
        }
      } catch (primaryError) {
        this.logger.error(`Failed to load primary file: ${primaryError.message}`);
      }
      
      // Try backup files if requested
      if (includeBackups && this.backupFiles.length > 0) {
        for (const backupFile of this.backupFiles) {
          try {
            const backupPath = path.join(this.dataDir, backupFile);
            if (fs.existsSync(backupPath)) {
              const backupOrders = readJsonFile(backupPath);
              if (Array.isArray(backupOrders)) {
                this.logger.info(`Loaded ${backupOrders.length} orders from backup file: ${backupFile}`);
                allOrders.push(...backupOrders);
              }
            }
          } catch (backupError) {
            this.logger.warn(`Failed to load backup file ${backupFile}: ${backupError.message}`);
          }
        }
      }
      
      // Filter by date if requested
      if (fromDate || toDate) {
        allOrders = allOrders.filter(order => {
          const orderDate = order.signing_date || order.publication_date;
          if (!orderDate) return true;
          
          const date = new Date(orderDate);
          
          if (fromDate && toDate) {
            return date >= new Date(fromDate) && date <= new Date(toDate);
          } else if (fromDate) {
            return date >= new Date(fromDate);
          } else if (toDate) {
            return date <= new Date(toDate);
          }
          
          return true;
        });
        
        this.logger.info(`Filtered to ${allOrders.length} orders in date range`);
      }
      
      // Remove duplicates
      const uniqueOrders = this.removeDuplicates(allOrders);
      this.logger.info(`Removed duplicates, returning ${uniqueOrders.length} unique orders`);
      
      // Standardize each order
      const standardOrders = uniqueOrders
        .map(order => this.standardizeOrder(order))
        .filter(order => this.validateOrder(order));
      
      return standardOrders;
    } catch (error) {
      this.handleError(error, 'fetchOrders');
      return [];
    }
  }
  
  /**
   * Fetches a specific executive order by ID or number
   * @param {string} identifier Order identifier (number, document number, etc.)
   * @returns {Promise<Object>} Executive order in standardized format
   */
  async fetchOrderById(identifier) {
    try {
      this.logger.info(`Fetching executive order by identifier: ${identifier}`);
      
      // Load all orders from local files
      const allOrders = await this.fetchOrders({ includeBackups: true });
      
      // Look for the order with matching identifier
      const order = allOrders.find(order => 
        order.order_number === identifier || 
        order.document_number === identifier
      );
      
      if (order) {
        this.logger.info(`Found order ${identifier} in local files`);
        return order;
      }
      
      this.logger.info(`Order ${identifier} not found in local files`);
      return null;
    } catch (error) {
      this.handleError(error, 'fetchOrderById', { identifier });
      return null;
    }
  }
  
  /**
   * Saves orders to the primary local file
   * @param {Array} orders Orders to save
   * @returns {Promise<boolean>} Whether the save was successful
   */
  async saveOrders(orders) {
    try {
      this.logger.info(`Saving ${orders.length} orders to primary file`);
      
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      
      // Save to primary file
      const primaryPath = path.join(this.dataDir, this.primaryFile);
      fs.writeFileSync(primaryPath, JSON.stringify(orders, null, 2), 'utf8');
      
      this.logger.info(`Successfully saved ${orders.length} orders to ${primaryPath}`);
      return true;
    } catch (error) {
      this.handleError(error, 'saveOrders');
      return false;
    }
  }
  
  /**
   * Creates a backup of the current primary file
   * @param {string} backupLabel Optional label for the backup file
   * @returns {Promise<string|null>} Path to the backup file or null if failed
   */
  async createBackup(backupLabel = '') {
    try {
      const primaryPath = path.join(this.dataDir, this.primaryFile);
      
      if (!fs.existsSync(primaryPath)) {
        this.logger.warn(`Cannot create backup: Primary file doesn't exist: ${primaryPath}`);
        return null;
      }
      
      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = backupLabel 
        ? `${path.parse(this.primaryFile).name}-${backupLabel}-${timestamp}${path.parse(this.primaryFile).ext}`
        : `${path.parse(this.primaryFile).name}-backup-${timestamp}${path.parse(this.primaryFile).ext}`;
      
      const backupPath = path.join(this.dataDir, backupFilename);
      
      // Copy the file
      fs.copyFileSync(primaryPath, backupPath);
      
      // Add to backup files list
      this.backupFiles.push(backupFilename);
      
      this.logger.info(`Created backup: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.handleError(error, 'createBackup');
      return null;
    }
  }
  
  /**
   * Removes duplicate orders from the array
   * @param {Array} orders Array of orders
   * @returns {Array} Deduplicated array
   */
  removeDuplicates(orders) {
    const uniqueOrderNumbers = new Set();
    const uniqueDocumentNumbers = new Set();
    const uniqueOrders = [];
    
    for (const order of orders) {
      const orderNumber = order.order_number;
      const documentNumber = order.document_number;
      
      // Skip if we've seen this order before
      if ((orderNumber && uniqueOrderNumbers.has(orderNumber)) || 
          (documentNumber && uniqueDocumentNumbers.has(documentNumber))) {
        continue;
      }
      
      // Add to unique orders
      uniqueOrders.push(order);
      
      // Mark as seen
      if (orderNumber) uniqueOrderNumbers.add(orderNumber);
      if (documentNumber) uniqueDocumentNumbers.add(documentNumber);
    }
    
    return uniqueOrders;
  }
  
  /**
   * Standardizes a local file order
   * @param {Object} order Order from local file
   * @returns {Object} Standardized order
   */
  standardizeOrder(order) {
    // Add president information if missing
    if (!order.president || order.president === 'Unknown') {
      order.president = determinePresident(order);
    }
    
    // Call parent standardization
    return super.standardizeOrder(order);
  }
}

module.exports = LocalFileSource;