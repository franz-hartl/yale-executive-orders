/**
 * database_source_clean.js
 * 
 * Clean version of the database source adapter that uses the new Database API.
 * Can be used as both a source and destination for executive order data.
 */

const BaseSource = require('./base_source');
const Database = require('../utils/database');
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
    super('database', 'Local SQLite Database', options);
    this.db = new Database();
  }

  /**
   * Initialize the database connection
   */
  async initialize() {
    try {
      await this.db.connect();
      return true;
    } catch (err) {
      console.error('Error connecting to database:', err);
      return false;
    }
  }

  /**
   * Fetch executive orders from the database
   * @param {Object} options Query options
   * @returns {Promise<Array>} Array of executive orders
   */
  async fetchOrders(options = {}) {
    try {
      const { limit = 100, since = null, orderNumbers = [] } = options;

      // Build the query based on the provided options
      let query = 'SELECT * FROM executive_orders';
      const params = [];

      const conditions = [];

      if (since) {
        conditions.push('signing_date >= ?');
        params.push(since);
      }

      if (orderNumbers && orderNumbers.length > 0) {
        const placeholders = orderNumbers.map(() => '?').join(',');
        conditions.push(`order_number IN (${placeholders})`);
        params.push(...orderNumbers);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY signing_date DESC';

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
      }

      // Execute the query
      const orders = await this.db.all(query, params);
      
      // Fetch related data
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          return this.db.getOrderWithRelations(order.id);
        })
      );

      return this.formatOrders(enrichedOrders);
    } catch (err) {
      console.error('Error fetching orders from database:', err);
      return [];
    }
  }

  /**
   * Format the orders from database format to standardized format
   * @param {Array} orders Array of orders from database
   * @returns {Array} Formatted orders
   */
  formatOrders(orders) {
    return orders.map(order => {
      return {
        order_number: order.order_number,
        title: order.title,
        signing_date: order.signing_date,
        president: order.president || determinePresident(order.signing_date),
        summary: order.summary,
        url: order.url,
        full_text: order.full_text,
        categories: order.categories.map(c => c.name),
        impact_areas: order.impact_areas.map(ia => ia.name),
        university_impact_areas: order.university_impact_areas.map(uia => uia.name),
        yale_impact_areas: (order.yale_impact_areas || []).map(yia => ({
          name: yia.name,
          specific_notes: yia.yale_specific_notes,
          impact_rating: yia.yale_impact_rating
        })),
        source: 'database',
        source_id: order.id.toString(),
        plain_language_summary: order.plain_language_summary,
        executive_brief: order.executive_brief,
        comprehensive_analysis: order.comprehensive_analysis
      };
    });
  }

  /**
   * Save an executive order to the database
   * @param {Object} order Executive order to save
   */
  async saveOrder(order) {
    try {
      await this.db.connect();
      
      // Check if order already exists
      const existingOrder = await this.db.getOrderByNumber(order.order_number);
      
      let orderId;
      if (existingOrder) {
        // Update existing order
        await this.db.updateOrder(existingOrder.id, {
          title: order.title,
          signing_date: order.signing_date,
          president: order.president || determinePresident(order.signing_date),
          summary: order.summary,
          url: order.url,
          full_text: order.full_text || ''
        });
        orderId = existingOrder.id;
      } else {
        // Create new order
        orderId = await this.db.createOrder({
          order_number: order.order_number,
          title: order.title,
          signing_date: order.signing_date,
          president: order.president || determinePresident(order.signing_date),
          summary: order.summary,
          url: order.url,
          full_text: order.full_text || ''
        });
      }
      
      // Handle categories
      if (order.categories && order.categories.length > 0) {
        await this.saveCategories(orderId, order.categories);
      }
      
      // Handle impact areas
      if (order.impact_areas && order.impact_areas.length > 0) {
        await this.saveImpactAreas(orderId, order.impact_areas);
      }
      
      // Handle university impact areas
      if (order.university_impact_areas && order.university_impact_areas.length > 0) {
        await this.saveUniversityImpactAreas(orderId, order.university_impact_areas);
      }
      
      return {
        success: true,
        message: existingOrder ? 'Order updated' : 'Order created',
        order_id: orderId
      };
    } catch (err) {
      console.error('Error saving order to database:', err);
      return {
        success: false,
        message: err.message
      };
    }
  }
  
  /**
   * Save categories for an order
   * @param {number} orderId Order ID
   * @param {Array} categories Categories to save
   */
  async saveCategories(orderId, categories) {
    for (const categoryName of categories) {
      // Find or create category
      let category = await this.db.get('SELECT id FROM categories WHERE name = ?', [categoryName]);
      
      if (!category) {
        const result = await this.db.run(
          'INSERT INTO categories (name) VALUES (?)',
          [categoryName]
        );
        category = { id: result.lastID };
      }
      
      // Associate category with order if not already associated
      const existing = await this.db.get(
        'SELECT * FROM order_categories WHERE order_id = ? AND category_id = ?',
        [orderId, category.id]
      );
      
      if (!existing) {
        await this.db.run(
          'INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)',
          [orderId, category.id]
        );
      }
    }
  }
  
  /**
   * Save impact areas for an order
   * @param {number} orderId Order ID
   * @param {Array} impactAreas Impact areas to save
   */
  async saveImpactAreas(orderId, impactAreas) {
    for (const areaName of impactAreas) {
      // Find or create impact area
      let area = await this.db.get('SELECT id FROM impact_areas WHERE name = ?', [areaName]);
      
      if (!area) {
        const result = await this.db.run(
          'INSERT INTO impact_areas (name) VALUES (?)',
          [areaName]
        );
        area = { id: result.lastID };
      }
      
      // Associate impact area with order if not already associated
      const existing = await this.db.get(
        'SELECT * FROM order_impact_areas WHERE order_id = ? AND impact_area_id = ?',
        [orderId, area.id]
      );
      
      if (!existing) {
        await this.db.run(
          'INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)',
          [orderId, area.id]
        );
      }
    }
  }
  
  /**
   * Save university impact areas for an order
   * @param {number} orderId Order ID
   * @param {Array} universityImpactAreas University impact areas to save
   */
  async saveUniversityImpactAreas(orderId, universityImpactAreas) {
    for (const areaName of universityImpactAreas) {
      // Find or create university impact area
      let area = await this.db.get('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
      
      if (!area) {
        const result = await this.db.run(
          'INSERT INTO university_impact_areas (name) VALUES (?)',
          [areaName]
        );
        area = { id: result.lastID };
      }
      
      // Associate university impact area with order if not already associated
      const existing = await this.db.get(
        'SELECT * FROM order_university_impact_areas WHERE order_id = ? AND university_impact_area_id = ?',
        [orderId, area.id]
      );
      
      if (!existing) {
        await this.db.run(
          'INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)',
          [orderId, area.id]
        );
      }
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = DatabaseSource;