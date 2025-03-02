/**
 * fact.js
 * 
 * Represents a knowledge fact with attribution.
 * Following "Essential Simplicity" design philosophy.
 */

const { factTypes, relationshipTypes } = require('../models/knowledge_schema');

/**
 * Represents a single fact with source attribution
 */
class Fact {
  /**
   * Creates a new fact
   * 
   * @param {Object} options Fact properties
   * @param {number} options.orderId The executive order ID this fact relates to
   * @param {string} options.factType The type of fact (from factTypes)
   * @param {*} options.value The fact value (can be primitive or object)
   * @param {number} [options.confidence=0.5] Confidence score (0.0 to 1.0)
   * @param {Object} [options.source=null] Source information
   * @param {number} [options.id=null] Database ID (when loaded from DB)
   */
  constructor({
    orderId,
    factType, 
    value, 
    confidence = 0.5,
    source = null,
    id = null
  }) {
    this.id = id;
    this.orderId = orderId;
    this.factType = factType;
    this.value = value;
    this.confidence = confidence;
    this.sources = source ? [source] : [];
    this.relationships = [];
    
    // Validate factType
    const validTypes = Object.values(factTypes);
    if (!validTypes.includes(factType)) {
      console.warn(`Warning: Unknown fact type "${factType}". Valid types are: ${validTypes.join(', ')}`);
    }
  }
  
  /**
   * Adds a source to this fact
   * 
   * @param {Object} source Source information
   * @param {number} source.sourceId Database ID of the source
   * @param {string} [source.sourceContext=null] Context from the source
   * @param {string} [source.extractionMethod=null] How this fact was extracted
   * @param {Object} [source.metadata=null] Additional extraction metadata
   * @returns {Fact} This fact for chaining
   */
  addSource({
    sourceId,
    sourceContext = null,
    extractionMethod = null,
    metadata = null
  }) {
    this.sources.push({
      sourceId,
      sourceContext,
      extractionMethod,
      extractionDate: new Date().toISOString(),
      metadata
    });
    
    return this;
  }
  
  /**
   * Adds a relationship to another fact
   * 
   * @param {Object} relationship Relationship information
   * @param {number|Fact} relationship.relatedFact The related fact or its ID
   * @param {string} relationship.type Relationship type
   * @param {string} [relationship.description=null] Description of the relationship
   * @param {number} [relationship.confidence=0.5] Confidence in this relationship
   * @returns {Fact} This fact for chaining
   */
  addRelationship({
    relatedFact,
    type,
    description = null,
    confidence = 0.5
  }) {
    // Validate relationship type
    const validTypes = Object.values(relationshipTypes);
    if (!validTypes.includes(type)) {
      console.warn(`Warning: Unknown relationship type "${type}". Valid types are: ${validTypes.join(', ')}`);
    }
    
    const relatedFactId = typeof relatedFact === 'object' ? relatedFact.id : relatedFact;
    
    this.relationships.push({
      relatedFactId,
      type,
      description,
      confidence
    });
    
    return this;
  }
  
  /**
   * Prepares fact object for storage in database
   * 
   * @returns {Object} Database-ready object
   */
  toDbObject() {
    return {
      id: this.id,
      order_id: this.orderId,
      fact_type: this.factType,
      fact_value: JSON.stringify(this.value),
      confidence: this.confidence
    };
  }
  
  /**
   * Creates a Fact instance from database record
   * 
   * @param {Object} record Database record
   * @returns {Fact} New Fact instance
   */
  static fromDbRecord(record) {
    return new Fact({
      id: record.id,
      orderId: record.order_id,
      factType: record.fact_type,
      value: JSON.parse(record.fact_value),
      confidence: record.confidence
    });
  }
  
  /**
   * Prepares source objects for storage in database
   * 
   * @returns {Array} Array of source objects ready for database
   */
  getSourcesForDb() {
    return this.sources.map(source => ({
      fact_id: this.id,
      source_id: source.sourceId,
      source_context: source.sourceContext,
      extraction_date: source.extractionDate,
      extraction_method: source.extractionMethod,
      extraction_metadata: source.metadata ? JSON.stringify(source.metadata) : null
    }));
  }
  
  /**
   * Prepares relationship objects for storage in database
   * 
   * @returns {Array} Array of relationship objects ready for database
   */
  getRelationshipsForDb() {
    return this.relationships.map(rel => ({
      fact_id: this.id,
      related_fact_id: rel.relatedFactId,
      relationship_type: rel.type,
      description: rel.description,
      confidence: rel.confidence
    }));
  }
}

module.exports = Fact;