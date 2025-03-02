/**
 * conflict_detector.js
 * 
 * System for detecting conflicts between facts from different sources.
 * Following "Essential Simplicity" design philosophy.
 */

const sqlite3 = require('sqlite3').verbose();
const { conflictSchema, ConflictRecord } = require('../models/conflict_record');
const { factTypes } = require('../models/knowledge_schema');
const { resolveConflict, determineConflictSeverity } = require('./resolution_strategies');

class ConflictDetector {
  /**
   * Create a new ConflictDetector instance
   * 
   * @param {Object} options Configuration options
   * @param {string} [options.dbPath='executive_orders.db'] Path to the SQLite database
   * @param {boolean} [options.autoResolve=true] Whether to auto-resolve low severity conflicts
   * @param {boolean} [options.logConflicts=true] Whether to log detected conflicts
   */
  constructor({ 
    dbPath = 'executive_orders.db',
    autoResolve = true,
    logConflicts = true
  } = {}) {
    this.dbPath = dbPath;
    this.db = null;
    this.initialized = false;
    this.autoResolve = autoResolve;
    this.logConflicts = logConflicts;
  }
  
  /**
   * Initialize the conflict detector
   * Ensures tables exist and prepares the database connection
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Open database connection
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
      
      // Check if conflict_records table exists, create it if not
      await this._ensureTablesExist();
      
      this.initialized = true;
      console.log('Conflict detector initialized successfully');
    } catch (error) {
      console.error('Failed to initialize conflict detector:', error);
      throw error;
    }
  }
  
  /**
   * Ensure conflict_records table exists
   * @private
   */
  async _ensureTablesExist() {
    console.log('Checking conflict records table...');
    
    const tableExists = await this.db.getAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='conflict_records';"
    );
    
    if (!tableExists) {
      console.log('Creating conflict_records table...');
      
      // Extract regular columns and foreign keys
      const tableSchema = conflictSchema.tables.conflict_records;
      const regularColumns = Object.entries(tableSchema)
        .filter(([key]) => key !== 'foreign_keys')
        .map(([key, value]) => `${key} ${value}`)
        .join(', ');
      
      // Extract foreign key constraints
      const foreignKeys = tableSchema.foreign_keys ? 
        tableSchema.foreign_keys.map(fk => 
          `FOREIGN KEY (${fk.column}) REFERENCES ${fk.references}${fk.onDelete ? ` ON DELETE ${fk.onDelete}` : ''}`
        ).join(', ') : '';
      
      // Build and execute create table statement
      const createTableSQL = `
        CREATE TABLE conflict_records (
          ${regularColumns}${foreignKeys ? ', ' + foreignKeys : ''}
        );
      `;
      
      await this.db.execAsync(createTableSQL);
      
      // Create index for faster querying
      await this.db.execAsync('CREATE INDEX idx_conflict_order_id ON conflict_records(order_id);');
      await this.db.execAsync('CREATE INDEX idx_conflict_status ON conflict_records(status);');
      
      console.log('Conflict records table created successfully');
    }
  }
  
  /**
   * Detect conflicts for a specific executive order
   * 
   * @param {number} orderId The executive order ID to check
   * @returns {Promise<Array>} Array of detected conflicts
   */
  async detectConflicts(orderId) {
    if (!this.initialized) await this.initialize();
    
    const detectedConflicts = [];
    
    try {
      console.log(`Detecting conflicts for order ID: ${orderId}`);
      
      // Get all fact types for this order
      const factTypes = await this.db.allAsync(`
        SELECT DISTINCT fact_type 
        FROM knowledge_facts 
        WHERE order_id = ?
      `, [orderId]);
      
      // For each fact type, look for conflicts
      for (const { fact_type } of factTypes) {
        const conflicts = await this._detectConflictsForType(orderId, fact_type);
        detectedConflicts.push(...conflicts);
      }
      
      // If auto-resolve is enabled, try to resolve low severity conflicts
      if (this.autoResolve) {
        for (const conflict of detectedConflicts) {
          if (conflict.severity === conflictSchema.severityLevels.LOW) {
            await this._autoResolveConflict(conflict);
          }
        }
      }
      
      // Log conflicts if logging is enabled
      if (this.logConflicts && detectedConflicts.length > 0) {
        console.log(`Found ${detectedConflicts.length} conflicts for order ID ${orderId}`);
        for (const conflict of detectedConflicts) {
          console.log(`  Conflict #${conflict.id}: ${conflict.conflictType} (${conflict.severity})`);
        }
      }
      
      return detectedConflicts;
    } catch (error) {
      console.error(`Error detecting conflicts for order ID ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Detect conflicts for a specific fact type within an order
   * 
   * @param {number} orderId The executive order ID
   * @param {string} factType The fact type to check
   * @returns {Promise<Array>} Array of detected conflicts
   * @private
   */
  async _detectConflictsForType(orderId, factType) {
    const conflicts = [];
    
    // Get all facts of this type for the order
    const facts = await this.db.allAsync(`
      SELECT * FROM knowledge_facts 
      WHERE order_id = ? AND fact_type = ?
    `, [orderId, factType]);
    
    // If we have fewer than 2 facts, there can't be conflicts
    if (facts.length < 2) return [];
    
    // Load sources for all facts
    const factSources = {};
    for (const fact of facts) {
      const sources = await this.db.allAsync(`
        SELECT * FROM knowledge_sources WHERE fact_id = ?
      `, [fact.id]);
      
      factSources[fact.id] = sources;
    }
    
    // Compare each fact with every other fact to detect conflicts
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const fact1 = {
          ...facts[i],
          value: JSON.parse(facts[i].fact_value),
          sources: factSources[facts[i].id]
        };
        
        const fact2 = {
          ...facts[j],
          value: JSON.parse(facts[j].fact_value),
          sources: factSources[facts[j].id]
        };
        
        // Check if facts conflict
        const hasConflict = this._doFactsConflict(fact1, fact2);
        
        if (hasConflict) {
          // Check if this conflict is already recorded
          const existingConflict = await this.db.getAsync(`
            SELECT id FROM conflict_records
            WHERE (fact1_id = ? AND fact2_id = ?) OR (fact1_id = ? AND fact2_id = ?)
          `, [fact1.id, fact2.id, fact2.id, fact1.id]);
          
          if (!existingConflict) {
            // Determine severity
            const severity = determineConflictSeverity(factType, fact1, fact2);
            
            // Create conflict record
            const conflict = new ConflictRecord({
              orderId,
              conflictType: factType,
              severity,
              fact1Id: fact1.id,
              fact2Id: fact2.id
            });
            
            // Store conflict in database
            const result = await this.db.runAsync(`
              INSERT INTO conflict_records (
                order_id, conflict_type, conflict_severity, fact1_id, fact2_id,
                detection_date, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              conflict.orderId,
              conflict.conflictType,
              conflict.severity,
              conflict.fact1Id,
              conflict.fact2Id,
              conflict.detectionDate,
              conflict.status
            ]);
            
            conflict.id = result.lastID;
            conflicts.push(conflict);
          }
        }
      }
    }
    
    return conflicts;
  }
  
  /**
   * Determine if two facts conflict with each other
   * 
   * @param {Object} fact1 First fact
   * @param {Object} fact2 Second fact
   * @returns {boolean} True if facts conflict
   * @private
   */
  _doFactsConflict(fact1, fact2) {
    // Different conflict detection logic based on fact type
    switch (fact1.fact_type) {
      case factTypes.DATE:
        return this._doDatesConflict(fact1, fact2);
        
      case factTypes.REQUIREMENT:
        return this._doRequirementsConflict(fact1, fact2);
        
      case factTypes.IMPACT:
        return this._doImpactsConflict(fact1, fact2);
        
      case factTypes.STATUS:
        return this._doStatusConflict(fact1, fact2);
        
      case factTypes.GUIDANCE:
        return this._doGuidanceConflict(fact1, fact2);
        
      default:
        // For other types, we can't detect conflicts yet
        return false;
    }
  }
  
  /**
   * Check if two date facts conflict
   * 
   * @param {Object} fact1 First date fact
   * @param {Object} fact2 Second date fact
   * @returns {boolean} True if dates conflict
   * @private
   */
  _doDatesConflict(fact1, fact2) {
    // Only compare dates of the same type
    if (fact1.value.dateType !== fact2.value.dateType) {
      return false;
    }
    
    // Parse dates
    const date1 = new Date(fact1.value.date);
    const date2 = new Date(fact2.value.date);
    
    // Check if dates differ by more than one day
    const timeDiff = Math.abs(date1 - date2);
    return timeDiff > 86400000; // 24 hours in milliseconds
  }
  
  /**
   * Check if two requirement facts conflict
   * 
   * @param {Object} fact1 First requirement fact
   * @param {Object} fact2 Second requirement fact
   * @returns {boolean} True if requirements conflict
   * @private
   */
  _doRequirementsConflict(fact1, fact2) {
    // Check if these are similar requirements with different details
    const isSimilarDescription = this._textSimilarity(
      fact1.value.description,
      fact2.value.description
    ) > 0.7; // 70% similarity threshold
    
    if (!isSimilarDescription) {
      return false; // Different requirements don't conflict
    }
    
    // Check for deadline conflicts
    if (fact1.value.deadline && fact2.value.deadline) {
      const deadline1 = new Date(fact1.value.deadline);
      const deadline2 = new Date(fact2.value.deadline);
      
      const timeDiff = Math.abs(deadline1 - deadline2);
      return timeDiff > 86400000; // 24 hours in milliseconds
    }
    
    // Check for conflicting priorities
    if (fact1.value.priority && fact2.value.priority) {
      const priorityLevels = {
        'high': 3,
        'medium': 2,
        'low': 1
      };
      
      const priority1 = priorityLevels[fact1.value.priority.toLowerCase()] || 0;
      const priority2 = priorityLevels[fact2.value.priority.toLowerCase()] || 0;
      
      return Math.abs(priority1 - priority2) > 1; // More than one level different
    }
    
    return false;
  }
  
  /**
   * Check if two impact facts conflict
   * 
   * @param {Object} fact1 First impact fact
   * @param {Object} fact2 Second impact fact
   * @returns {boolean} True if impacts conflict
   * @private
   */
  _doImpactsConflict(fact1, fact2) {
    // Check for conflicting severity levels in similar impacts
    if (fact1.value.impactType === fact2.value.impactType) {
      // Similar description
      const isSimilarDescription = this._textSimilarity(
        fact1.value.description,
        fact2.value.description
      ) > 0.6; // 60% similarity threshold
      
      if (isSimilarDescription && fact1.value.severity && fact2.value.severity) {
        const severityLevels = {
          'high': 3,
          'medium': 2,
          'low': 1
        };
        
        const severity1 = severityLevels[fact1.value.severity.toLowerCase()] || 0;
        const severity2 = severityLevels[fact2.value.severity.toLowerCase()] || 0;
        
        return Math.abs(severity1 - severity2) > 1; // More than one level different
      }
    }
    
    return false;
  }
  
  /**
   * Check if two status facts conflict
   * 
   * @param {Object} fact1 First status fact
   * @param {Object} fact2 Second status fact
   * @returns {boolean} True if statuses conflict
   * @private
   */
  _doStatusConflict(fact1, fact2) {
    // Status facts often have simple string values
    // Consider conflicting if completely different
    if (typeof fact1.value === 'string' && typeof fact2.value === 'string') {
      // Key status values that could conflict
      const statusKeywords = [
        'active', 'inactive', 'revoked', 'stayed', 'implemented', 
        'superseded', 'upheld', 'blocked', 'expired'
      ];
      
      // Check if both values contain conflicting keywords
      for (let i = 0; i < statusKeywords.length; i++) {
        for (let j = 0; j < statusKeywords.length; j++) {
          if (i !== j) { // Skip comparing same keyword
            const keyword1 = statusKeywords[i];
            const keyword2 = statusKeywords[j];
            
            if (fact1.value.toLowerCase().includes(keyword1) && 
                fact2.value.toLowerCase().includes(keyword2)) {
              return true; // Found conflicting keywords
            }
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Check if two guidance facts conflict
   * 
   * @param {Object} fact1 First guidance fact
   * @param {Object} fact2 Second guidance fact
   * @returns {boolean} True if guidance conflicts
   * @private
   */
  _doGuidanceConflict(fact1, fact2) {
    // For guidance, consider conflicting if high similarity but not identical
    if (fact1.value.description && fact2.value.description) {
      const similarity = this._textSimilarity(
        fact1.value.description,
        fact2.value.description
      );
      
      // Conflicts when somewhat similar but not nearly identical
      return similarity > 0.5 && similarity < 0.8;
    }
    
    return false;
  }
  
  /**
   * Calculate simple text similarity (Jaccard index of words)
   * 
   * @param {string} text1 First text
   * @param {string} text2 Second text
   * @returns {number} Similarity score (0-1)
   * @private
   */
  _textSimilarity(text1, text2) {
    // If either text is empty, similarity is 0
    if (!text1 || !text2) return 0;
    
    // Split into words, lowercase and remove punctuation
    const words1 = text1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const words2 = text2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    
    // Create sets of unique words
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    // Find intersection
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    // Find union
    const union = new Set([...set1, ...set2]);
    
    // Calculate Jaccard index
    return intersection.size / union.size;
  }
  
  /**
   * Auto-resolve a conflict if possible
   * 
   * @param {ConflictRecord} conflict The conflict to resolve
   * @private
   */
  async _autoResolveConflict(conflict) {
    try {
      // Load both facts
      const fact1Record = await this.db.getAsync(
        'SELECT * FROM knowledge_facts WHERE id = ?',
        [conflict.fact1Id]
      );
      
      const fact2Record = await this.db.getAsync(
        'SELECT * FROM knowledge_facts WHERE id = ?',
        [conflict.fact2Id]
      );
      
      if (!fact1Record || !fact2Record) {
        console.warn(`Cannot auto-resolve conflict #${conflict.id}: One or both facts not found`);
        return;
      }
      
      // Parse fact values
      const fact1 = {
        ...fact1Record,
        value: JSON.parse(fact1Record.fact_value)
      };
      
      const fact2 = {
        ...fact2Record,
        value: JSON.parse(fact2Record.fact_value)
      };
      
      // Load sources for both facts
      const fact1Sources = await this.db.allAsync(
        'SELECT * FROM knowledge_sources WHERE fact_id = ?',
        [fact1.id]
      );
      
      const fact2Sources = await this.db.allAsync(
        'SELECT * FROM knowledge_sources WHERE fact_id = ?',
        [fact2.id]
      );
      
      // Get source metadata
      const sourceIds = new Set();
      fact1Sources.forEach(s => sourceIds.add(s.source_id));
      fact2Sources.forEach(s => sourceIds.add(s.source_id));
      
      const sourcesInfo = await this.db.allAsync(
        `SELECT * FROM source_metadata WHERE id IN (${Array.from(sourceIds).join(',')})`
      );
      
      // Add sources to facts
      fact1.sources = fact1Sources;
      fact2.sources = fact2Sources;
      
      // Try to resolve conflict
      const resolution = resolveConflict(fact1, fact2, sourcesInfo);
      
      if (resolution) {
        // Mark conflict as resolved
        await this.db.runAsync(`
          UPDATE conflict_records
          SET 
            status = ?,
            resolution_strategy = ?,
            resolution_date = ?,
            resolution_by = ?,
            resolution_notes = ?
          WHERE id = ?
        `, [
          conflictSchema.statusValues.RESOLVED_AUTO,
          resolution.strategy,
          new Date().toISOString(),
          'system',
          resolution.notes,
          conflict.id
        ]);
        
        // Update the conflict object
        conflict.status = conflictSchema.statusValues.RESOLVED_AUTO;
        conflict.resolutionStrategy = resolution.strategy;
        conflict.resolutionDate = new Date().toISOString();
        conflict.resolutionBy = 'system';
        conflict.resolutionNotes = resolution.notes;
        
        if (this.logConflicts) {
          console.log(`Auto-resolved conflict #${conflict.id}: ${resolution.notes}`);
        }
      }
    } catch (error) {
      console.error(`Error auto-resolving conflict #${conflict.id}:`, error);
    }
  }
  
  /**
   * Get all conflicts for an executive order
   * 
   * @param {number} orderId The executive order ID
   * @param {string} [status=null] Optional status filter
   * @returns {Promise<Array>} Array of conflict records
   */
  async getConflictsForOrder(orderId, status = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      let query = 'SELECT * FROM conflict_records WHERE order_id = ?';
      const params = [orderId];
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY detection_date DESC';
      
      const records = await this.db.allAsync(query, params);
      return records.map(record => ConflictRecord.fromDbRecord(record));
    } catch (error) {
      console.error(`Error getting conflicts for order ID ${orderId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all unresolved conflicts
   * 
   * @param {number} [limit=100] Maximum number of conflicts to return
   * @returns {Promise<Array>} Array of unresolved conflict records
   */
  async getUnresolvedConflicts(limit = 100) {
    if (!this.initialized) await this.initialize();
    
    try {
      const records = await this.db.allAsync(
        `SELECT * FROM conflict_records 
         WHERE status = ? 
         ORDER BY conflict_severity DESC, detection_date DESC
         LIMIT ?`,
        [conflictSchema.statusValues.UNRESOLVED, limit]
      );
      
      return records.map(record => ConflictRecord.fromDbRecord(record));
    } catch (error) {
      console.error('Error getting unresolved conflicts:', error);
      throw error;
    }
  }
  
  /**
   * Manually resolve a conflict
   * 
   * @param {number} conflictId Conflict record ID
   * @param {Object} resolution Resolution information
   * @param {number} resolution.selectedFactId ID of the fact to accept
   * @param {string} [resolution.notes=null] Optional resolution notes
   * @param {string} [resolution.by='user'] Who resolved the conflict
   * @returns {Promise<ConflictRecord>} Updated conflict record
   */
  async resolveConflict(conflictId, { selectedFactId, notes = null, by = 'user' }) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Get the conflict record
      const record = await this.db.getAsync(
        'SELECT * FROM conflict_records WHERE id = ?',
        [conflictId]
      );
      
      if (!record) {
        throw new Error(`Conflict #${conflictId} not found`);
      }
      
      // Verify that selectedFactId is one of the conflicting facts
      if (selectedFactId !== record.fact1_id && selectedFactId !== record.fact2_id) {
        throw new Error(`Selected fact ID ${selectedFactId} is not part of conflict #${conflictId}`);
      }
      
      // Update the conflict record
      await this.db.runAsync(`
        UPDATE conflict_records
        SET 
          status = ?,
          resolution_strategy = ?,
          resolution_date = ?,
          resolution_by = ?,
          resolution_notes = ?
        WHERE id = ?
      `, [
        conflictSchema.statusValues.RESOLVED_MANUAL,
        conflictSchema.resolutionStrategies.MANUAL,
        new Date().toISOString(),
        by,
        notes,
        conflictId
      ]);
      
      // Get the updated record
      const updatedRecord = await this.db.getAsync(
        'SELECT * FROM conflict_records WHERE id = ?',
        [conflictId]
      );
      
      return ConflictRecord.fromDbRecord(updatedRecord);
    } catch (error) {
      console.error(`Error resolving conflict #${conflictId}:`, error);
      throw error;
    }
  }
  
  /**
   * Flag a conflict for special attention
   * 
   * @param {number} conflictId Conflict record ID
   * @param {string} [notes=null] Reason for flagging
   * @returns {Promise<ConflictRecord>} Updated conflict record
   */
  async flagConflict(conflictId, notes = null) {
    if (!this.initialized) await this.initialize();
    
    try {
      // Update the conflict record
      await this.db.runAsync(`
        UPDATE conflict_records
        SET 
          status = ?,
          resolution_notes = ?
        WHERE id = ?
      `, [
        conflictSchema.statusValues.FLAGGED,
        notes,
        conflictId
      ]);
      
      // Get the updated record
      const updatedRecord = await this.db.getAsync(
        'SELECT * FROM conflict_records WHERE id = ?',
        [conflictId]
      );
      
      return ConflictRecord.fromDbRecord(updatedRecord);
    } catch (error) {
      console.error(`Error flagging conflict #${conflictId}:`, error);
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

module.exports = ConflictDetector;