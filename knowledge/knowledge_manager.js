/**
 * KnowledgeManager - Manages the storage and retrieval of knowledge facts
 * 
 * This class provides a high-level API for working with the knowledge database.
 * It handles database operations, transactions, and knowledge relationships.
 */

const Fact = require('./fact');
const { getDb, query, run, get, all, exec } = require('../utils/database');

// Ensure Fact is properly imported
const FactClass = Fact.Fact || Fact;

class KnowledgeManager {
  /**
   * Constructor for KnowledgeManager
   * 
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      dbPath: ':memory:',
      ...options
    };
    
    this.db = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the knowledge manager
   * 
   * @returns {Promise<void>} Promise that resolves when initialized
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    // Get database connection
    this.db = await getDb(this.options.dbPath);
    
    // Create tables if they don't exist
    await this._ensureTablesExist();
    
    this.initialized = true;
  }
  
  /**
   * Store a fact in the database
   * 
   * @param {Fact} fact - The fact to store
   * @returns {Promise<Fact>} The stored fact with ID
   */
  async storeFact(fact) {
    await this._ensureInitialized();
    
    try {
      // Insert fact
      const factDb = fact.toDbObject();
      const result = await run(
        `INSERT INTO facts (type, content, source_id, source_name, source_type, confidence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          factDb.type,
          factDb.content,
          factDb.source_id,
          factDb.source_name,
          factDb.source_type,
          factDb.confidence,
          factDb.created_at
        ]
      );
      
      // Set the ID
      fact.id = result.lastID;
      
      // Store relationships if any
      if (fact.relationships && fact.relationships.length > 0) {
        await this._storeRelationships(fact);
      }
      
      return fact;
    } catch (error) {
      throw new Error(`Failed to store fact: ${error.message}`);
    }
  }
  
  /**
   * Update an existing fact
   * 
   * @param {Fact} fact - The fact to update
   * @returns {Promise<Fact>} The updated fact
   */
  async updateFact(fact) {
    await this._ensureInitialized();
    
    if (!fact.id) {
      throw new Error('Cannot update fact without ID');
    }
    
    try {
      // Update fact
      const factDb = fact.toDbObject();
      await run(
        `UPDATE facts 
         SET type = ?, content = ?, source_id = ?, source_name = ?, source_type = ?, confidence = ?, updated_at = ? 
         WHERE id = ?`,
        [
          factDb.type,
          factDb.content,
          factDb.source_id,
          factDb.source_name,
          factDb.source_type,
          factDb.confidence,
          new Date().toISOString(),
          fact.id
        ]
      );
      
      // Update relationships
      await this._updateRelationships(fact);
      
      return fact;
    } catch (error) {
      throw new Error(`Failed to update fact: ${error.message}`);
    }
  }
  
  /**
   * Get facts for a specific order
   * 
   * @param {string} orderId - The order ID
   * @param {object} options - Query options
   * @returns {Promise<Fact[]>} Array of facts
   */
  async getFactsForOrder(orderId, options = {}) {
    await this._ensureInitialized();
    
    try {
      const query = `
        SELECT * FROM facts 
        WHERE source_id = ? 
        ${options.types ? 'AND type IN (?)' : ''}
        ${options.minConfidence ? 'AND confidence >= ?' : ''}
        ORDER BY created_at DESC
      `;
      
      const params = [orderId];
      
      if (options.types) {
        params.push(options.types.join(','));
      }
      
      if (options.minConfidence) {
        params.push(options.minConfidence);
      }
      
      const records = await all(query, params);
      
      return records.map(record => FactClass.fromDbRecord(record));
    } catch (error) {
      throw new Error(`Failed to get facts for order: ${error.message}`);
    }
  }
  
  /**
   * Get a fact by ID
   * 
   * @param {number} factId - The fact ID
   * @returns {Promise<Fact|null>} The fact or null if not found
   */
  async getFactById(factId) {
    await this._ensureInitialized();
    
    try {
      const record = await get('SELECT * FROM facts WHERE id = ?', [factId]);
      
      if (!record) {
        return null;
      }
      
      return FactClass.fromDbRecord(record);
    } catch (error) {
      throw new Error(`Failed to get fact by ID: ${error.message}`);
    }
  }
  
  /**
   * Search for facts
   * 
   * @param {object} options - Search options
   * @param {string} options.query - Search query
   * @param {string[]} options.types - Fact types to include
   * @param {number} options.minConfidence - Minimum confidence score
   * @param {string} options.sourceId - Filter by source ID
   * @param {number} options.limit - Maximum number of results
   * @returns {Promise<Fact[]>} Matching facts
   */
  async searchFacts(options = {}) {
    await this._ensureInitialized();
    
    try {
      let query = 'SELECT * FROM facts WHERE 1=1';
      const params = [];
      
      if (options.query) {
        query += ' AND content LIKE ?';
        params.push(`%${options.query}%`);
      }
      
      if (options.types && options.types.length > 0) {
        query += ` AND type IN (${options.types.map(() => '?').join(',')})`;
        params.push(...options.types);
      }
      
      if (options.minConfidence) {
        query += ' AND confidence >= ?';
        params.push(options.minConfidence);
      }
      
      if (options.sourceId) {
        query += ' AND source_id = ?';
        params.push(options.sourceId);
      }
      
      query += ' ORDER BY confidence DESC, created_at DESC';
      
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
      }
      
      const records = await all(query, params);
      
      return records.map(record => FactClass.fromDbRecord(record));
    } catch (error) {
      throw new Error(`Failed to search facts: ${error.message}`);
    }
  }
  
  /**
   * Find contradictions between facts
   * 
   * @param {object} options - Options for contradiction detection
   * @param {string} options.orderId - The order ID to check
   * @param {string[]} options.types - Fact types to check
   * @returns {Promise<object[]>} Contradictions found
   */
  async findContradictions(options = {}) {
    await this._ensureInitialized();
    
    try {
      const facts = await this.getFactsForOrder(options.orderId, {
        types: options.types
      });
      
      const contradictions = [];
      
      // Check each fact against other facts of the same type
      for (let i = 0; i < facts.length; i++) {
        for (let j = i + 1; j < facts.length; j++) {
          const contradiction = facts[i].contradicts(facts[j]);
          
          if (contradiction) {
            contradictions.push({
              ...contradiction,
              facts: [facts[i], facts[j]]
            });
          }
        }
      }
      
      return contradictions;
    } catch (error) {
      throw new Error(`Failed to find contradictions: ${error.message}`);
    }
  }
  
  /**
   * Ensure the manager is initialized
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
  
  /**
   * Ensure database tables exist
   * 
   * @private
   * @returns {Promise<void>}
   */
  async _ensureTablesExist() {
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS fact_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_fact_id INTEGER NOT NULL,
        target_fact_id INTEGER NOT NULL,
        relationship_type TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (source_fact_id) REFERENCES facts(id) ON DELETE CASCADE,
        FOREIGN KEY (target_fact_id) REFERENCES facts(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_facts_type ON facts(type);
      CREATE INDEX IF NOT EXISTS idx_facts_source_id ON facts(source_id);
      CREATE INDEX IF NOT EXISTS idx_fact_relationships_source ON fact_relationships(source_fact_id);
      CREATE INDEX IF NOT EXISTS idx_fact_relationships_target ON fact_relationships(target_fact_id);
    `;
    
    await exec(createTablesQuery);
  }
  
  /**
   * Store relationships for a fact
   * 
   * @private
   * @param {Fact} fact - The fact with relationships
   * @returns {Promise<void>}
   */
  async _storeRelationships(fact) {
    for (const relationship of fact.relationships) {
      await run(
        `INSERT INTO fact_relationships
         (source_fact_id, target_fact_id, relationship_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          fact.id,
          relationship.targetId,
          relationship.type,
          JSON.stringify(relationship.metadata || {}),
          new Date().toISOString()
        ]
      );
    }
  }
  
  /**
   * Update relationships for a fact
   * 
   * @private
   * @param {Fact} fact - The fact with relationships
   * @returns {Promise<void>}
   */
  async _updateRelationships(fact) {
    // Delete existing relationships
    await run(
      'DELETE FROM fact_relationships WHERE source_fact_id = ?',
      [fact.id]
    );
    
    // Store new relationships
    await this._storeRelationships(fact);
  }
}

module.exports = { KnowledgeManager };