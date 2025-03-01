/**
 * database.js
 * 
 * Unified database API layer for the Yale Executive Orders project
 * Follows "Essential Simplicity" design philosophy with flat architecture
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const schema = require('../schema');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'executive_orders.db');
    this.db = null;
  }
  
  /**
   * Initialize a connection to the database
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          // Enable foreign keys
          this.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }
  
  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.db) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.db = null;
          resolve();
        }
      });
    });
  }
  
  /**
   * Execute a SQL query with optional parameters
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Object>} - The result object with lastID and changes
   */
  async run(sql, params = []) {
    if (!this.db) await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }
  
  /**
   * Execute a SQL query and return the first result row
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Object|null>} - The first result row or null
   */
  async get(sql, params = []) {
    if (!this.db) await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
  
  /**
   * Execute a SQL query and return all result rows
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @returns {Promise<Array>} - All result rows
   */
  async all(sql, params = []) {
    if (!this.db) await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  /**
   * Execute multiple SQL statements in a transaction
   * @param {Function} operations - Function containing transaction operations
   * @returns {Promise<void>}
   */
  async transaction(operations) {
    if (!this.db) await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        try {
          operations(this);
          this.db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        } catch (err) {
          this.db.run('ROLLBACK');
          reject(err);
        }
      });
    });
  }
  
  /**
   * Create database tables from schema definition
   * @returns {Promise<void>}
   */
  async createTables() {
    if (!this.db) await this.connect();
    
    try {
      // Create regular tables
      for (const [tableName, columns] of Object.entries(schema.tables)) {
        const columnsSQL = Object.entries(columns)
          .filter(([column]) => column !== 'foreign_keys' && column !== 'primary_key' && !column.startsWith('//'))
          .map(([column, definition]) => `${column} ${definition}`)
          .join(', ');
          
        await this.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnsSQL})`);
      }
      
      // Create junction tables with specified keys
      for (const [tableName, tableInfo] of Object.entries(schema.junctions)) {
        let columnsSQL = Object.entries(tableInfo)
          .filter(([key]) => !['primary_key', 'foreign_keys'].includes(key))
          .map(([column, definition]) => `${column} ${definition}`)
          .join(', ');
          
        // Add primary key
        if (tableInfo.primary_key) {
          columnsSQL += `, PRIMARY KEY (${tableInfo.primary_key.join(', ')})`;
        }
        
        // Add foreign keys
        if (tableInfo.foreign_keys) {
          for (const fk of tableInfo.foreign_keys) {
            columnsSQL += `, FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}`;
            if (fk.onDelete) columnsSQL += ` ON DELETE ${fk.onDelete}`;
          }
        }
        
        await this.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnsSQL})`);
      }
      
      // Create Yale-specific tables
      for (const [tableName, tableInfo] of Object.entries(schema.yale_tables)) {
        let columnsSQL = Object.entries(tableInfo)
          .filter(([key]) => !['foreign_keys', 'primary_key'].includes(key))
          .map(([column, definition]) => `${column} ${definition}`)
          .join(', ');
          
        // Add primary key if specified
        if (tableInfo.primary_key) {
          columnsSQL += `, PRIMARY KEY (${tableInfo.primary_key.join(', ')})`;
        }
        
        // Add foreign keys
        if (tableInfo.foreign_keys) {
          for (const fk of tableInfo.foreign_keys) {
            columnsSQL += `, FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}`;
            if (fk.onDelete) columnsSQL += ` ON DELETE ${fk.onDelete}`;
          }
        }
        
        await this.run(`CREATE TABLE IF NOT EXISTS ${tableName} (${columnsSQL})`);
      }
      
      // Create FTS tables
      for (const [tableName, tableInfo] of Object.entries(schema.search)) {
        const columnsStr = tableInfo.columns.join(', ');
        await this.run(`CREATE VIRTUAL TABLE IF NOT EXISTS ${tableName} 
                        USING ${tableInfo.using}(${columnsStr}, 
                        content='${tableInfo.content}', 
                        content_rowid='${tableInfo.content_rowid}')`);
      }
      
      // Create FTS triggers
      await this.run(`
        CREATE TRIGGER IF NOT EXISTS executive_orders_ai AFTER INSERT ON executive_orders BEGIN
          INSERT INTO executive_orders_fts(rowid, order_number, title, summary, full_text)
          VALUES (new.id, new.order_number, new.title, new.summary, new.full_text);
        END
      `);
      
      await this.run(`
        CREATE TRIGGER IF NOT EXISTS executive_orders_ad AFTER DELETE ON executive_orders BEGIN
          INSERT INTO executive_orders_fts(executive_orders_fts, rowid, order_number, title, summary, full_text)
          VALUES('delete', old.id, old.order_number, old.title, old.summary, old.full_text);
        END
      `);
      
      await this.run(`
        CREATE TRIGGER IF NOT EXISTS executive_orders_au AFTER UPDATE ON executive_orders BEGIN
          INSERT INTO executive_orders_fts(executive_orders_fts, rowid, order_number, title, summary, full_text)
          VALUES('delete', old.id, old.order_number, old.title, old.summary, old.full_text);
          INSERT INTO executive_orders_fts(rowid, order_number, title, summary, full_text)
          VALUES (new.id, new.order_number, new.title, new.summary, new.full_text);
        END
      `);
      
      // Create update trigger for last_updated field
      await this.run(`
        CREATE TRIGGER IF NOT EXISTS update_last_modified AFTER UPDATE ON executive_orders
        FOR EACH ROW BEGIN
          UPDATE executive_orders SET last_updated = CURRENT_TIMESTAMP
          WHERE id = NEW.id;
        END
      `);
      
      return true;
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }
  
  /**
   * Initialize reference data if tables are empty
   * @returns {Promise<void>}
   */
  async initializeReferenceData() {
    try {
      // Check if categories already exist
      const categoryCount = await this.get('SELECT COUNT(*) as count FROM categories');
      
      if (categoryCount.count === 0) {
        // Insert categories
        for (const category of schema.reference_data.categories) {
          await this.run(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [category.name, category.description]
          );
        }
        console.log(`Imported ${schema.reference_data.categories.length} categories`);
      }
      
      // Check if university impact areas exist
      const impactAreaCount = await this.get('SELECT COUNT(*) as count FROM university_impact_areas');
      
      if (impactAreaCount.count === 0) {
        // Insert university impact areas
        for (const area of schema.reference_data.university_impact_areas) {
          await this.run(
            'INSERT INTO university_impact_areas (name, description) VALUES (?, ?)',
            [area.name, area.description]
          );
        }
        console.log(`Imported ${schema.reference_data.university_impact_areas.length} university impact areas`);
      }
    } catch (error) {
      console.error('Error initializing reference data:', error);
      throw error;
    }
  }
  
  /**
   * Order-specific methods
   */
  async getOrder(id) {
    return this.get('SELECT * FROM executive_orders WHERE id = ?', [id]);
  }
  
  async getOrderByNumber(orderNumber) {
    return this.get('SELECT * FROM executive_orders WHERE order_number = ?', [orderNumber]);
  }
  
  async createOrder(orderData) {
    const { order_number, title, signing_date, president, summary, url, impact_level } = orderData;
    
    const result = await this.run(
      `INSERT INTO executive_orders 
       (order_number, title, signing_date, president, summary, url, impact_level) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [order_number, title, signing_date, president, summary, url, impact_level]
    );
    
    return result.lastID;
  }
  
  async updateOrder(id, orderData) {
    // Build the SET clause dynamically based on provided fields
    const setValues = [];
    const params = [];
    
    for (const [key, value] of Object.entries(orderData)) {
      setValues.push(`${key} = ?`);
      params.push(value);
    }
    
    params.push(id); // Add the ID for the WHERE clause
    
    const result = await this.run(
      `UPDATE executive_orders SET ${setValues.join(', ')} WHERE id = ?`,
      params
    );
    
    return result.changes;
  }
  
  async getAllOrders(options = {}) {
    const { limit, offset, orderBy = 'signing_date DESC' } = options;
    
    let sql = 'SELECT * FROM executive_orders';
    const params = [];
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
      
      if (offset) {
        sql += ' OFFSET ?';
        params.push(offset);
      }
    }
    
    return this.all(sql, params);
  }
  
  async searchOrders(query) {
    return this.all(
      `SELECT eo.* FROM executive_orders eo
       JOIN executive_orders_fts fts ON eo.id = fts.rowid
       WHERE executive_orders_fts MATCH ?
       ORDER BY rank`,
      [query]
    );
  }
  
  /**
   * Get order with related data
   * @param {number} id - Order ID
   * @returns {Promise<Object>} - Order with all related data
   */
  async getOrderWithRelations(id) {
    // Get the order
    const order = await this.getOrder(id);
    if (!order) return null;
    
    // Get categories
    const categories = await this.all(
      `SELECT c.id, c.name, c.description
       FROM categories c
       JOIN order_categories oc ON c.id = oc.category_id
       WHERE oc.order_id = ?`,
      [id]
    );
    
    // Get impact areas
    const impactAreas = await this.all(
      `SELECT ia.id, ia.name, ia.description
       FROM impact_areas ia
       JOIN order_impact_areas oia ON ia.id = oia.impact_area_id
       WHERE oia.order_id = ?`,
      [id]
    );
    
    // Get university impact areas
    const universityImpactAreas = await this.all(
      `SELECT uia.id, uia.name, uia.description, ouia.notes
       FROM university_impact_areas uia
       JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
       WHERE ouia.order_id = ?`,
      [id]
    );
    
    // Get Yale impact areas
    let yaleImpactAreas = [];
    try {
      yaleImpactAreas = await this.all(
        `SELECT yia.id, yia.name, yia.description, oyia.yale_specific_notes, oyia.yale_impact_rating
         FROM yale_impact_areas yia
         JOIN order_yale_impact_areas oyia ON yia.id = oyia.yale_impact_area_id
         WHERE oyia.order_id = ?`,
        [id]
      );
    } catch (err) {
      // Yale impact areas might not exist yet
    }
    
    // Get Yale compliance actions
    let yaleComplianceActions = [];
    try {
      yaleComplianceActions = await this.all(
        `SELECT yca.*, yd.name as department_name
         FROM yale_compliance_actions yca
         LEFT JOIN yale_departments yd ON yca.yale_department_id = yd.id
         WHERE yca.order_id = ?
         ORDER BY yca.deadline`,
        [id]
      );
    } catch (err) {
      // Yale compliance actions might not exist yet
    }
    
    // Get Yale impact mapping
    let yaleImpactMapping = [];
    try {
      yaleImpactMapping = await this.all(
        `SELECT yim.*, yd.name as department_name
         FROM yale_impact_mapping yim
         JOIN yale_departments yd ON yim.yale_department_id = yd.id
         WHERE yim.order_id = ?
         ORDER BY yim.impact_score DESC`,
        [id]
      );
    } catch (err) {
      // Yale impact mapping might not exist yet
    }
    
    // Return combined order data
    return {
      ...order,
      categories,
      impact_areas: impactAreas,
      university_impact_areas: universityImpactAreas,
      yale_impact_areas: yaleImpactAreas,
      yale_compliance_actions: yaleComplianceActions,
      yale_impact_mapping: yaleImpactMapping
    };
  }
}

module.exports = Database;