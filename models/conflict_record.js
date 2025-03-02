/**
 * conflict_record.js
 * 
 * Defines the data model for recording conflicts between facts from different sources.
 * Following "Essential Simplicity" design philosophy.
 */

/**
 * Database schema for the conflict tables
 */
const conflictSchema = {
  // Conflict records table
  tables: {
    conflict_records: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      order_id: 'INTEGER NOT NULL',
      conflict_type: 'TEXT NOT NULL',     // Type of conflict (date, requirement, etc.)
      conflict_severity: 'TEXT NOT NULL', // Severity level (high, medium, low)
      fact1_id: 'INTEGER NOT NULL',       // First conflicting fact
      fact2_id: 'INTEGER NOT NULL',       // Second conflicting fact
      detection_date: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      status: "TEXT DEFAULT 'unresolved'", // Status (unresolved, resolved_auto, resolved_manual)
      resolution_strategy: 'TEXT',        // How the conflict was resolved, if applicable
      resolution_date: 'TIMESTAMP',       // When the conflict was resolved
      resolution_by: 'TEXT',              // Who resolved the conflict (system, username)
      resolution_notes: 'TEXT',           // Notes about the resolution process
      foreign_keys: [
        { column: 'order_id', references: 'executive_orders(id)', onDelete: 'CASCADE' },
        { column: 'fact1_id', references: 'knowledge_facts(id)', onDelete: 'CASCADE' },
        { column: 'fact2_id', references: 'knowledge_facts(id)', onDelete: 'CASCADE' }
      ]
    }
  },
  
  // Predefined conflict types (matching fact types)
  conflictTypes: {
    DATE: 'date',                // Conflicts in dates
    REQUIREMENT: 'requirement',  // Conflicts in requirements
    IMPACT: 'impact',            // Conflicts in impact assessments
    STATUS: 'status',            // Conflicts in status information
    GUIDANCE: 'guidance'         // Conflicts in implementation guidance
  },
  
  // Conflict severity levels
  severityLevels: {
    HIGH: 'high',         // Critical conflicts that significantly affect interpretation
    MEDIUM: 'medium',     // Important conflicts that should be reviewed
    LOW: 'low'            // Minor conflicts that can be automatically resolved
  },
  
  // Conflict status values
  statusValues: {
    UNRESOLVED: 'unresolved',        // Not yet resolved
    RESOLVED_AUTO: 'resolved_auto',   // Automatically resolved
    RESOLVED_MANUAL: 'resolved_manual', // Manually resolved
    FLAGGED: 'flagged'               // Flagged for special attention
  },
  
  // Resolution strategies
  resolutionStrategies: {
    SOURCE_PRIORITY: 'source_priority',   // Resolved by source authority
    RECENCY: 'recency',                   // Resolved by choosing most recent
    CONFIDENCE: 'confidence',             // Resolved by confidence score
    MANUAL: 'manual',                     // Manually resolved
    COMBINED: 'combined',                 // Combined multiple facts
    NEWEST_SOURCE: 'newest_source'        // Selected newest source
  }
};

/**
 * Represents a conflict between two facts
 */
class ConflictRecord {
  /**
   * Creates a new conflict record
   * 
   * @param {Object} options Conflict properties
   * @param {number} options.orderId The executive order ID this conflict relates to
   * @param {string} options.conflictType The type of conflict
   * @param {string} options.severity The severity level
   * @param {number} options.fact1Id ID of the first conflicting fact
   * @param {number} options.fact2Id ID of the second conflicting fact
   * @param {string} [options.status='unresolved'] Current status
   * @param {number} [options.id=null] Database ID (when loaded from DB)
   */
  constructor({
    orderId,
    conflictType,
    severity,
    fact1Id,
    fact2Id,
    status = conflictSchema.statusValues.UNRESOLVED,
    id = null
  }) {
    this.id = id;
    this.orderId = orderId;
    this.conflictType = conflictType;
    this.severity = severity;
    this.fact1Id = fact1Id;
    this.fact2Id = fact2Id;
    this.status = status;
    this.detectionDate = new Date().toISOString();
    this.resolutionStrategy = null;
    this.resolutionDate = null;
    this.resolutionBy = null;
    this.resolutionNotes = null;
    
    // Validate conflict type
    const validTypes = Object.values(conflictSchema.conflictTypes);
    if (!validTypes.includes(conflictType)) {
      console.warn(`Warning: Unknown conflict type "${conflictType}". Valid types are: ${validTypes.join(', ')}`);
    }
    
    // Validate severity
    const validSeverities = Object.values(conflictSchema.severityLevels);
    if (!validSeverities.includes(severity)) {
      console.warn(`Warning: Unknown severity level "${severity}". Valid levels are: ${validSeverities.join(', ')}`);
    }
    
    // Validate status
    const validStatuses = Object.values(conflictSchema.statusValues);
    if (!validStatuses.includes(status)) {
      console.warn(`Warning: Unknown status "${status}". Valid statuses are: ${validStatuses.join(', ')}`);
    }
  }
  
  /**
   * Mark conflict as resolved
   * 
   * @param {Object} resolution Resolution information
   * @param {string} resolution.strategy Resolution strategy used
   * @param {string} [resolution.by='system'] Who resolved the conflict
   * @param {string} [resolution.notes=null] Optional resolution notes
   */
  resolve({ strategy, by = 'system', notes = null }) {
    // Validate strategy
    const validStrategies = Object.values(conflictSchema.resolutionStrategies);
    if (!validStrategies.includes(strategy)) {
      console.warn(`Warning: Unknown resolution strategy "${strategy}". Valid strategies are: ${validStrategies.join(', ')}`);
    }
    
    this.resolutionStrategy = strategy;
    this.resolutionDate = new Date().toISOString();
    this.resolutionBy = by;
    this.resolutionNotes = notes;
    this.status = by === 'system' ? 
      conflictSchema.statusValues.RESOLVED_AUTO : 
      conflictSchema.statusValues.RESOLVED_MANUAL;
  }
  
  /**
   * Flag the conflict for special attention
   * 
   * @param {string} [notes=null] Reason for flagging
   */
  flag(notes = null) {
    this.status = conflictSchema.statusValues.FLAGGED;
    this.resolutionNotes = notes;
  }
  
  /**
   * Prepares conflict object for storage in database
   * 
   * @returns {Object} Database-ready object
   */
  toDbObject() {
    return {
      id: this.id,
      order_id: this.orderId,
      conflict_type: this.conflictType,
      conflict_severity: this.severity,
      fact1_id: this.fact1Id,
      fact2_id: this.fact2Id,
      detection_date: this.detectionDate,
      status: this.status,
      resolution_strategy: this.resolutionStrategy,
      resolution_date: this.resolutionDate,
      resolution_by: this.resolutionBy,
      resolution_notes: this.resolutionNotes
    };
  }
  
  /**
   * Creates a ConflictRecord instance from database record
   * 
   * @param {Object} record Database record
   * @returns {ConflictRecord} New ConflictRecord instance
   */
  static fromDbRecord(record) {
    const conflict = new ConflictRecord({
      id: record.id,
      orderId: record.order_id,
      conflictType: record.conflict_type,
      severity: record.conflict_severity,
      fact1Id: record.fact1_id,
      fact2Id: record.fact2_id,
      status: record.status
    });
    
    conflict.detectionDate = record.detection_date;
    conflict.resolutionStrategy = record.resolution_strategy;
    conflict.resolutionDate = record.resolution_date;
    conflict.resolutionBy = record.resolution_by;
    conflict.resolutionNotes = record.resolution_notes;
    
    return conflict;
  }
}

module.exports = {
  conflictSchema,
  ConflictRecord
};