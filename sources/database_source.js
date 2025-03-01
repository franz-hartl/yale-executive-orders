/**
 * database_source.js
 * 
 * Data source adapter for the SQLite database, which can be used as both
 * a source and destination for executive order data.
 */

const BaseSource = require('./base_source');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { determinePresident } = require('../utils/common');

/**
 * Database source adapter for executive orders
 */
class DatabaseSource extends BaseSource {
  /**
   * Constructor for DatabaseSource
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'SQLite Database',
      description: 'Local SQLite database source for executive orders',
      ...options
    });
    
    this.dbPath = options.dbPath || path.join(__dirname, '..', 'executive_orders.db');
    this.db = null;
  }
  
  /**
   * Initializes the database connection
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info(`Initializing database connection to ${this.dbPath}`);
    
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, sqlite3.OPEN_READWRITE, (err) => {
        if (err) {
          this.logger.error(`Failed to connect to database: ${err.message}`);
          reject(err);
          return;
        }
        
        this.logger.info('Database connection established');
        resolve();
      });
    });
  }
  
  /**
   * Closes the database connection
   * @returns {Promise<void>}
   */
  async cleanup() {
    this.logger.info('Closing database connection');
    
    if (!this.db) {
      this.logger.warn('No database connection to close');
      return;
    }
    
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          this.logger.error(`Error closing database: ${err.message}`);
          reject(err);
          return;
        }
        
        this.db = null;
        this.logger.info('Database connection closed');
        resolve();
      });
    });
  }
  
  /**
   * Promisified database run operation
   * @param {string} sql SQL query
   * @param {Array} params Query parameters
   * @returns {Promise<Object>} Promise resolving to result
   */
  async dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
  
  /**
   * Promisified database get operation
   * @param {string} sql SQL query
   * @param {Array} params Query parameters
   * @returns {Promise<Object>} Promise resolving to row
   */
  async dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row);
      });
    });
  }
  
  /**
   * Promisified database all operation
   * @param {string} sql SQL query
   * @param {Array} params Query parameters
   * @returns {Promise<Array>} Promise resolving to rows
   */
  async dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }
  
  /**
   * Fetches executive orders from the database
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    try {
      if (!this.db) {
        await this.initialize();
      }
      
      this.logger.info('Fetching executive orders from database');
      
      const {
        fromDate,
        toDate,
        president,
        limit,
        offset,
        orderBy = 'signing_date DESC'
      } = options;
      
      // Build the query
      let query = `
        SELECT eo.*, 
          GROUP_CONCAT(DISTINCT c.name) AS categories,
          GROUP_CONCAT(DISTINCT uia.name) AS university_impact_areas
        FROM executive_orders eo
        LEFT JOIN order_categories oc ON eo.id = oc.order_id
        LEFT JOIN categories c ON oc.category_id = c.id
        LEFT JOIN order_university_impact_areas ouia ON eo.id = ouia.order_id
        LEFT JOIN university_impact_areas uia ON ouia.university_impact_area_id = uia.id
        WHERE 1=1
      `;
      
      const params = [];
      
      // Add filters
      if (fromDate) {
        query += ` AND (eo.signing_date >= ? OR eo.publication_date >= ?)`;
        params.push(fromDate, fromDate);
      }
      
      if (toDate) {
        query += ` AND (eo.signing_date <= ? OR eo.publication_date <= ?)`;
        params.push(toDate, toDate);
      }
      
      if (president) {
        query += ` AND eo.president = ?`;
        params.push(president);
      }
      
      // Group by to handle the JOINs
      query += ` GROUP BY eo.id`;
      
      // Add order by
      query += ` ORDER BY ${orderBy}`;
      
      // Add limit and offset
      if (limit) {
        query += ` LIMIT ?`;
        params.push(limit);
        
        if (offset) {
          query += ` OFFSET ?`;
          params.push(offset);
        }
      }
      
      // Execute the query
      const rows = await this.dbAll(query, params);
      this.logger.info(`Found ${rows.length} orders in database`);
      
      // Convert rows to standardized format
      const orders = rows.map(row => {
        // Parse categories and impact areas from concatenated strings
        const categories = row.categories ? row.categories.split(',') : [];
        const universityImpactAreas = row.university_impact_areas ? row.university_impact_areas.split(',') : [];
        
        return this.standardizeOrder({
          id: row.id,
          order_number: row.order_number,
          document_number: row.document_number,
          title: row.title,
          signing_date: row.signing_date,
          publication_date: row.publication_date,
          president: row.president,
          summary: row.summary,
          plain_language_summary: row.plain_language_summary,
          executive_brief: row.executive_brief,
          comprehensive_analysis: row.comprehensive_analysis,
          full_text: row.full_text,
          url: row.url,
          impact_level: row.impact_level,
          categories,
          universityImpactAreas
        });
      });
      
      return orders;
    } catch (error) {
      this.handleError(error, 'fetchOrders');
      return [];
    }
  }
  
  /**
   * Fetches a specific executive order by number or document number
   * @param {string} identifier Order identifier (number or document number)
   * @returns {Promise<Object>} Executive order in standardized format
   */
  async fetchOrderById(identifier) {
    try {
      if (!this.db) {
        await this.initialize();
      }
      
      this.logger.info(`Fetching executive order by identifier: ${identifier}`);
      
      // Build the query to fetch the order and its categories and impact areas
      const query = `
        SELECT eo.*, 
          GROUP_CONCAT(DISTINCT c.name) AS categories,
          GROUP_CONCAT(DISTINCT uia.name) AS university_impact_areas
        FROM executive_orders eo
        LEFT JOIN order_categories oc ON eo.id = oc.order_id
        LEFT JOIN categories c ON oc.category_id = c.id
        LEFT JOIN order_university_impact_areas ouia ON eo.id = ouia.order_id
        LEFT JOIN university_impact_areas uia ON ouia.university_impact_area_id = uia.id
        WHERE eo.order_number = ? OR eo.document_number = ?
        GROUP BY eo.id
      `;
      
      const row = await this.dbGet(query, [identifier, identifier]);
      
      if (!row) {
        this.logger.info(`Order ${identifier} not found in database`);
        return null;
      }
      
      this.logger.info(`Found order ${identifier} in database`);
      
      // Parse categories and impact areas from concatenated strings
      const categories = row.categories ? row.categories.split(',') : [];
      const universityImpactAreas = row.university_impact_areas ? row.university_impact_areas.split(',') : [];
      
      // Standardize and return the order
      return this.standardizeOrder({
        id: row.id,
        order_number: row.order_number,
        document_number: row.document_number,
        title: row.title,
        signing_date: row.signing_date,
        publication_date: row.publication_date,
        president: row.president,
        summary: row.summary,
        plain_language_summary: row.plain_language_summary,
        executive_brief: row.executive_brief,
        comprehensive_analysis: row.comprehensive_analysis,
        full_text: row.full_text,
        url: row.url,
        impact_level: row.impact_level,
        categories,
        universityImpactAreas
      });
    } catch (error) {
      this.handleError(error, 'fetchOrderById', { identifier });
      return null;
    }
  }
  
  /**
   * Saves orders to the database
   * @param {Array} orders Orders to save
   * @param {Object} options Save options
   * @returns {Promise<Object>} Result statistics
   */
  async saveOrders(orders, options = {}) {
    try {
      if (!this.db) {
        await this.initialize();
      }
      
      const { updateExisting = true } = options;
      
      this.logger.info(`Saving ${orders.length} orders to database`);
      
      // Start a transaction
      await this.dbRun('BEGIN TRANSACTION');
      
      const stats = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0
      };
      
      // Process each order
      for (const order of orders) {
        try {
          // Check if order already exists
          const existingOrder = await this.dbGet(
            'SELECT id FROM executive_orders WHERE order_number = ? OR document_number = ? OR title = ?',
            [order.order_number, order.document_number, order.title]
          );
          
          if (existingOrder) {
            if (updateExisting) {
              // Update existing order
              const result = await this.updateOrder(existingOrder.id, order);
              if (result) {
                stats.updated++;
              } else {
                stats.failed++;
              }
            } else {
              // Skip existing order
              stats.skipped++;
            }
          } else {
            // Insert new order
            const result = await this.insertOrder(order);
            if (result) {
              stats.inserted++;
            } else {
              stats.failed++;
            }
          }
        } catch (orderError) {
          this.logger.error(`Error processing order ${order.order_number || order.title}: ${orderError.message}`);
          stats.failed++;
        }
      }
      
      // Commit the transaction
      await this.dbRun('COMMIT');
      
      this.logger.info(`Database save complete: ${stats.inserted} inserted, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.failed} failed`);
      return stats;
    } catch (error) {
      // Rollback on error
      try {
        await this.dbRun('ROLLBACK');
      } catch (rollbackError) {
        this.logger.error(`Rollback failed: ${rollbackError.message}`);
      }
      
      this.handleError(error, 'saveOrders');
      return { inserted: 0, updated: 0, skipped: 0, failed: orders.length };
    }
  }
  
  /**
   * Inserts a new order into the database
   * @param {Object} order Order to insert
   * @returns {Promise<number|null>} ID of the inserted order or null if failed
   */
  async insertOrder(order) {
    try {
      // Ensure required fields
      if (!order.title) {
        this.logger.warn('Cannot insert order without title');
        return null;
      }
      
      // Insert the order
      const result = await this.dbRun(
        `INSERT INTO executive_orders 
         (order_number, document_number, title, signing_date, publication_date, president, 
          summary, plain_language_summary, executive_brief, comprehensive_analysis, 
          full_text, url, impact_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.order_number,
          order.document_number,
          order.title,
          order.signing_date,
          order.publication_date,
          order.president || determinePresident(order),
          order.summary,
          order.plain_language_summary || order.summary,
          order.executive_brief,
          order.comprehensive_analysis,
          order.full_text,
          order.url,
          order.impact_level
        ]
      );
      
      const orderId = result.lastID;
      
      // Add categories if available
      if (order.categories && Array.isArray(order.categories) && order.categories.length > 0) {
        await this.addCategoriesToOrder(orderId, order.categories);
      }
      
      // Add university impact areas if available
      if (order.universityImpactAreas && Array.isArray(order.universityImpactAreas) && order.universityImpactAreas.length > 0) {
        await this.addImpactAreasToOrder(orderId, order.universityImpactAreas);
      }
      
      this.logger.debug(`Inserted order with ID ${orderId}: ${order.title}`);
      return orderId;
    } catch (error) {
      this.handleError(error, 'insertOrder', { title: order.title });
      return null;
    }
  }
  
  /**
   * Updates an existing order in the database
   * @param {number} orderId ID of the order to update
   * @param {Object} order Updated order data
   * @returns {Promise<boolean>} Whether the update was successful
   */
  async updateOrder(orderId, order) {
    try {
      // Update the order
      await this.dbRun(
        `UPDATE executive_orders 
         SET order_number = ?,
             document_number = ?,
             title = ?,
             signing_date = ?,
             publication_date = ?,
             president = ?,
             summary = ?,
             plain_language_summary = ?,
             executive_brief = ?,
             comprehensive_analysis = ?,
             full_text = ?,
             url = ?,
             impact_level = ?
         WHERE id = ?`,
        [
          order.order_number,
          order.document_number,
          order.title,
          order.signing_date,
          order.publication_date,
          order.president || determinePresident(order),
          order.summary,
          order.plain_language_summary || order.summary,
          order.executive_brief,
          order.comprehensive_analysis,
          order.full_text,
          order.url,
          order.impact_level,
          orderId
        ]
      );
      
      // Update categories if available
      if (order.categories && Array.isArray(order.categories) && order.categories.length > 0) {
        // Remove existing categories
        await this.dbRun('DELETE FROM order_categories WHERE order_id = ?', [orderId]);
        
        // Add new categories
        await this.addCategoriesToOrder(orderId, order.categories);
      }
      
      // Update university impact areas if available
      if (order.universityImpactAreas && Array.isArray(order.universityImpactAreas) && order.universityImpactAreas.length > 0) {
        // Remove existing impact areas
        await this.dbRun('DELETE FROM order_university_impact_areas WHERE order_id = ?', [orderId]);
        
        // Add new impact areas
        await this.addImpactAreasToOrder(orderId, order.universityImpactAreas);
      }
      
      this.logger.debug(`Updated order with ID ${orderId}: ${order.title}`);
      return true;
    } catch (error) {
      this.handleError(error, 'updateOrder', { orderId, title: order.title });
      return false;
    }
  }
  
  /**
   * Adds categories to an order
   * @param {number} orderId Order ID
   * @param {Array} categories Categories to add
   * @returns {Promise<void>}
   */
  async addCategoriesToOrder(orderId, categories) {
    for (const categoryName of categories) {
      try {
        // Get or create the category
        let category = await this.dbGet('SELECT id FROM categories WHERE name = ?', [categoryName]);
        
        if (!category) {
          // Create the category
          const result = await this.dbRun('INSERT INTO categories (name) VALUES (?)', [categoryName]);
          category = { id: result.lastID };
        }
        
        // Add category to order
        await this.dbRun(
          'INSERT OR IGNORE INTO order_categories (order_id, category_id) VALUES (?, ?)',
          [orderId, category.id]
        );
      } catch (error) {
        this.logger.warn(`Failed to add category ${categoryName} to order ${orderId}: ${error.message}`);
      }
    }
  }
  
  /**
   * Adds university impact areas to an order
   * @param {number} orderId Order ID
   * @param {Array} impactAreas Impact areas to add
   * @returns {Promise<void>}
   */
  async addImpactAreasToOrder(orderId, impactAreas) {
    for (const areaName of impactAreas) {
      try {
        // Get or create the impact area
        let area = await this.dbGet('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
        
        if (!area) {
          // Create the impact area
          const result = await this.dbRun('INSERT INTO university_impact_areas (name) VALUES (?)', [areaName]);
          area = { id: result.lastID };
        }
        
        // Add impact area to order
        await this.dbRun(
          'INSERT OR IGNORE INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)',
          [orderId, area.id]
        );
      } catch (error) {
        this.logger.warn(`Failed to add impact area ${areaName} to order ${orderId}: ${error.message}`);
      }
    }
  }
}

module.exports = DatabaseSource;