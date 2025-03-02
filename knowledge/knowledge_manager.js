/**
 * knowledge_manager.js
 * 
 * Core knowledge management functionality for storing, retrieving,
 * and relating facts about executive orders.
 * Following "Essential Simplicity" design philosophy.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const Fact = require('./fact');
const knowledgeSchema = require('../models/knowledge_schema');

class KnowledgeManager {
  /**
   * Create a new KnowledgeManager instance
   * 
   * @param {Object} options Configuration options
   * @param {string} [options.dbPath='executive_orders.db'] Path to the SQLite database
   */
  constructor({ dbPath = 'executive_orders.db' } = {}) {
    this.dbPath = dbPath;
    this.db = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the knowledge manager
   * Ensures tables exist and prepares the database connection
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Open database connection directly with sqlite3
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          throw new Error(`Failed to open database: ${err.message}`);
        }
      });
      
      // Promisify database methods
      this.db.runAsync = function(sql, params = []) {
        return new Promise((resolve, reject) => {
          this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this); // 'this' contains lastID, changes
          });
        });
      };
      
      this.db.getAsync = function(sql, params = []) {
        return new Promise((resolve, reject) => {
          this.get(sql, params, function(err, row) {
            if (err) reject(err);
            else resolve(row);
          });
        });
      };
      
      this.db.allAsync = function(sql, params = []) {
        return new Promise((resolve, reject) => {
          this.all(sql, params, function(err, rows) {
            if (err) reject(err);
            else resolve(rows);
          });
        });
      };
      
      this.db.execAsync = function(sql) {
        return new Promise((resolve, reject) => {
          this.exec(sql, function(err) {
            if (err) reject(err);
            else resolve();
          });
        });
      };
      
      // Check if knowledge tables exist, create them if not
      await this._ensureTablesExist();
      
      this.initialized = true;
      console.log('Knowledge manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize knowledge manager:', error);
      throw error;
    }
  }
  
  /**
   * Ensure all required knowledge tables exist
   * @private
   */
  async _ensureTablesExist() {
    console.log('Checking knowledge tables...');
    
    // Get list of existing tables
    const existingTables = await this.db.allAsync(
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    const tableNames = existingTables.map(t => t.name);
    
    // Create missing tables
    for (const [tableName, columns] of Object.entries(knowledgeSchema.tables)) {
      if (!tableNames.includes(tableName)) {
        console.log(`Creating table: ${tableName}`);
        
        // Extract regular columns (non-foreign keys)
        const regularColumns = Object.entries(columns)
          .filter(([key]) => key !== 'foreign_keys')
          .map(([key, value]) => `${key} ${value}`)
          .join(', ');
        
        // Extract foreign key constraints
        const foreignKeys = columns.foreign_keys ? 
          columns.foreign_keys.map(fk => 
            `FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}${fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ''}`
          ).join(', ') : '';
        
        // Build and execute create table statement
        const createTableSQL = `
          CREATE TABLE ${tableName} (
            ${regularColumns}${foreignKeys ? ', ' + foreignKeys : ''}
          );
        `;
        
        await this.db.execAsync(createTableSQL);
      }
    }
  }
  
  /**
   * Store a fact in the database
   * 
   * @param {Fact} fact Fact to store
   * @returns {Fact} Stored fact with ID
   */
  async storeFact(fact) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Begin transaction
      await this.db.execAsync('BEGIN TRANSACTION');
      
      // Store the fact
      const factData = fact.toDbObject();
      const result = await this.db.runAsync(
        `INSERT INTO knowledge_facts 
         (order_id, fact_type, fact_value, confidence) 
         VALUES (?, ?, ?, ?)`,
        [factData.order_id, factData.fact_type, factData.fact_value, factData.confidence]
      );
      
      // Set the ID from the insert operation
      fact.id = result.lastID;
      
      // Store sources if any
      for (const source of fact.getSourcesForDb()) {
        await this.db.runAsync(
          `INSERT INTO knowledge_sources
           (fact_id, source_id, source_context, extraction_date, extraction_method, extraction_metadata)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [source.fact_id, source.source_id, source.source_context, 
           source.extraction_date, source.extraction_method, source.extraction_metadata]
        );
      }
      
      // Store relationships if any
      for (const rel of fact.getRelationshipsForDb()) {
        await this.db.runAsync(
          `INSERT INTO knowledge_relationships
           (fact_id, related_fact_id, relationship_type, description, confidence)
           VALUES (?, ?, ?, ?, ?)`,
          [rel.fact_id, rel.related_fact_id, rel.relationship_type, 
           rel.description, rel.confidence]
        );
      }
      
      // Commit transaction
      await this.db.execAsync('COMMIT');
      
      return fact;
    } catch (error) {
      // Rollback on error
      await this.db.execAsync('ROLLBACK');
      console.error('Error storing fact:', error);
      throw error;
    }
  }
  
  /**
   * Retrieves facts for a specific executive order
   * 
   * @param {Object} options Query options
   * @param {number} options.orderId Executive order ID
   * @param {string} [options.factType=null] Optional fact type filter
   * @param {number} [options.minConfidence=0.0] Minimum confidence threshold
   * @returns {Promise<Fact[]>} Array of facts
   */
  async getFactsForOrder({ orderId, factType = null, minConfidence = 0.0 }) {
    if (!this.initialized) await this.initialize();
    
    try {
      let query = `
        SELECT * FROM knowledge_facts 
        WHERE order_id = ? AND confidence >= ?
      `;
      const params = [orderId, minConfidence];
      
      if (factType) {
        query += ` AND fact_type = ?`;
        params.push(factType);
      }
      
      // Get the facts
      const factRecords = await this.db.allAsync(query, params);
      const facts = factRecords.map(record => Fact.fromDbRecord(record));
      
      // Load sources for each fact
      for (const fact of facts) {
        const sources = await this.db.allAsync(
          `SELECT * FROM knowledge_sources WHERE fact_id = ?`,
          [fact.id]
        );
        
        fact.sources = sources.map(s => ({
          sourceId: s.source_id,
          sourceContext: s.source_context,
          extractionDate: s.extraction_date,
          extractionMethod: s.extraction_method,
          metadata: s.extraction_metadata ? JSON.parse(s.extraction_metadata) : null
        }));
      }
      
      // Load relationships for each fact
      for (const fact of facts) {
        const relationships = await this.db.allAsync(
          `SELECT * FROM knowledge_relationships WHERE fact_id = ?`,
          [fact.id]
        );
        
        fact.relationships = relationships.map(r => ({
          relatedFactId: r.related_fact_id,
          type: r.relationship_type,
          description: r.description,
          confidence: r.confidence
        }));
      }
      
      return facts;
    } catch (error) {
      console.error('Error retrieving facts:', error);
      throw error;
    }
  }
  
  /**
   * Retrieves a specific fact by ID
   * 
   * @param {number} factId Fact ID
   * @returns {Promise<Fact|null>} The fact or null if not found
   */
  async getFactById(factId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const record = await this.db.getAsync(
        'SELECT * FROM knowledge_facts WHERE id = ?',
        [factId]
      );
      
      if (!record) return null;
      
      const fact = Fact.fromDbRecord(record);
      
      // Load sources
      const sources = await this.db.allAsync(
        `SELECT * FROM knowledge_sources WHERE fact_id = ?`,
        [fact.id]
      );
      
      fact.sources = sources.map(s => ({
        sourceId: s.source_id,
        sourceContext: s.source_context,
        extractionDate: s.extraction_date,
        extractionMethod: s.extraction_method,
        metadata: s.extraction_metadata ? JSON.parse(s.extraction_metadata) : null
      }));
      
      // Load relationships
      const relationships = await this.db.allAsync(
        `SELECT * FROM knowledge_relationships WHERE fact_id = ?`,
        [fact.id]
      );
      
      fact.relationships = relationships.map(r => ({
        relatedFactId: r.related_fact_id,
        type: r.relationship_type,
        description: r.description,
        confidence: r.confidence
      }));
      
      return fact;
    } catch (error) {
      console.error('Error retrieving fact by ID:', error);
      throw error;
    }
  }
  
  /**
   * Updates an existing fact
   * 
   * @param {Fact} fact Fact to update
   * @returns {Promise<Fact>} Updated fact
   */
  async updateFact(fact) {
    if (!this.initialized) await this.initialize();
    if (!fact.id) throw new Error('Cannot update fact without ID');
    
    try {
      // Begin transaction
      await this.db.execAsync('BEGIN TRANSACTION');
      
      // Update fact
      const factData = fact.toDbObject();
      await this.db.runAsync(
        `UPDATE knowledge_facts 
         SET fact_type = ?, fact_value = ?, confidence = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [factData.fact_type, factData.fact_value, factData.confidence, fact.id]
      );
      
      // Delete existing sources and relationships (will be re-added)
      await this.db.runAsync('DELETE FROM knowledge_sources WHERE fact_id = ?', [fact.id]);
      await this.db.runAsync('DELETE FROM knowledge_relationships WHERE fact_id = ?', [fact.id]);
      
      // Re-add sources
      for (const source of fact.getSourcesForDb()) {
        await this.db.runAsync(
          `INSERT INTO knowledge_sources
           (fact_id, source_id, source_context, extraction_date, extraction_method, extraction_metadata)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [source.fact_id, source.source_id, source.source_context, 
           source.extraction_date, source.extraction_method, source.extraction_metadata]
        );
      }
      
      // Re-add relationships
      for (const rel of fact.getRelationshipsForDb()) {
        await this.db.runAsync(
          `INSERT INTO knowledge_relationships
           (fact_id, related_fact_id, relationship_type, description, confidence)
           VALUES (?, ?, ?, ?, ?)`,
          [rel.fact_id, rel.related_fact_id, rel.relationship_type, 
           rel.description, rel.confidence]
        );
      }
      
      // Commit transaction
      await this.db.execAsync('COMMIT');
      
      return fact;
    } catch (error) {
      // Rollback on error
      await this.db.execAsync('ROLLBACK');
      console.error('Error updating fact:', error);
      throw error;
    }
  }
  
  /**
   * Add Yale-specific impact assessment to a fact
   * 
   * @param {Object} options Impact information
   * @param {number} options.factId ID of the fact
   * @param {number} [options.departmentId=null] Yale department ID (null for university-wide)
   * @param {string} options.impactLevel Impact level (e.g., 'High', 'Medium', 'Low')
   * @param {string} options.description Description of the Yale-specific impact
   * @param {string} [options.analyst=null] Who created this assessment
   * @returns {Promise<number>} ID of the created impact assessment
   */
  async addYaleImpact({ factId, departmentId = null, impactLevel, description, analyst = null }) {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.db.runAsync(
        `INSERT INTO knowledge_yale_impacts
         (fact_id, yale_department_id, impact_level, impact_description, analyst)
         VALUES (?, ?, ?, ?, ?)`,
        [factId, departmentId, impactLevel, description, analyst]
      );
      
      return result.lastID;
    } catch (error) {
      console.error('Error adding Yale impact:', error);
      throw error;
    }
  }
  
  /**
   * Search for facts across all executive orders
   * 
   * @param {Object} options Search options
   * @param {string} [options.factType=null] Optional fact type filter
   * @param {string} [options.searchText=null] Text to search for in fact values
   * @param {number} [options.minConfidence=0.0] Minimum confidence threshold
   * @param {number} [options.limit=100] Maximum results to return
   * @returns {Promise<Fact[]>} Array of matching facts
   */
  async searchFacts({ factType = null, searchText = null, minConfidence = 0.0, limit = 100 }) {
    if (!this.initialized) await this.initialize();
    
    try {
      let query = `
        SELECT * FROM knowledge_facts 
        WHERE confidence >= ?
      `;
      const params = [minConfidence];
      
      if (factType) {
        query += ` AND fact_type = ?`;
        params.push(factType);
      }
      
      if (searchText) {
        query += ` AND fact_value LIKE ?`;
        params.push(`%${searchText}%`);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);
      
      const factRecords = await this.db.allAsync(query, params);
      return factRecords.map(record => Fact.fromDbRecord(record));
    } catch (error) {
      console.error('Error searching facts:', error);
      throw error;
    }
  }
  
  /**
   * Find contradictory facts for a given executive order
   * 
   * @param {number} orderId Executive order ID
   * @returns {Promise<Array>} Array of fact pairs that contradict each other
   */
  async findContradictions(orderId) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Get all explicit contradiction relationships
      const contradictions = await this.db.allAsync(`
        SELECT r.*, f1.fact_type as fact1_type, f1.fact_value as fact1_value,
               f2.fact_type as fact2_type, f2.fact_value as fact2_value
        FROM knowledge_relationships r
        JOIN knowledge_facts f1 ON r.fact_id = f1.id
        JOIN knowledge_facts f2 ON r.related_fact_id = f2.id
        WHERE f1.order_id = ? 
        AND r.relationship_type = '${knowledgeSchema.relationshipTypes.CONTRADICTS}'
      `, [orderId]);
      
      return contradictions.map(c => ({
        fact1: {
          id: c.fact_id,
          type: c.fact1_type,
          value: JSON.parse(c.fact1_value)
        },
        fact2: {
          id: c.related_fact_id,
          type: c.fact2_type,
          value: JSON.parse(c.fact2_value)
        },
        confidence: c.confidence,
        description: c.description
      }));
    } catch (error) {
      console.error('Error finding contradictions:', error);
      throw error;
    }
  }
  
  /**
   * Close the database connection
   */
  async close() {
    if (this.db) {
      return new Promise((resolve, reject) => {
        this.db.close(err => {
          if (err) {
            reject(err);
          } else {
            this.db = null;
            this.initialized = false;
            resolve();
          }
        });
      });
    }
  }
}

module.exports = KnowledgeManager;