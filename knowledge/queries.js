/**
 * queries.js
 * 
 * Utility functions for common knowledge queries.
 * Following "Essential Simplicity" design philosophy.
 */

const KnowledgeManager = require('./knowledge_manager');
const { factTypes, relationshipTypes } = require('../models/knowledge_schema');

/**
 * Knowledge query utilities
 */
class KnowledgeQueries {
  /**
   * Create a new KnowledgeQueries instance
   * 
   * @param {Object} options Configuration options
   * @param {string} [options.dbPath='executive_orders.db'] Path to the SQLite database
   */
  constructor({ dbPath = 'executive_orders.db' } = {}) {
    this.knowledgeManager = new KnowledgeManager({ dbPath });
  }
  
  /**
   * Initializes the query utilities
   */
  async initialize() {
    await this.knowledgeManager.initialize();
  }
  
  /**
   * Get all important dates for an executive order
   * 
   * @param {number} orderId Executive order ID
   * @param {Object} options Query options
   * @param {number} [options.minConfidence=0.5] Minimum confidence threshold
   * @returns {Promise<Array>} Array of date facts
   */
  async getImportantDates(orderId, { minConfidence = 0.5 } = {}) {
    const facts = await this.knowledgeManager.getFactsForOrder({
      orderId,
      factType: factTypes.DATE,
      minConfidence
    });
    
    // Sort dates by their actual date value
    return facts.sort((a, b) => {
      // Parse dates from fact values - assuming ISO format date strings
      const dateA = new Date(a.value.date || '');
      const dateB = new Date(b.value.date || '');
      return dateA - dateB;
    });
  }
  
  /**
   * Get all compliance requirements for an executive order
   * 
   * @param {number} orderId Executive order ID
   * @param {Object} options Query options
   * @param {number} [options.minConfidence=0.5] Minimum confidence threshold
   * @returns {Promise<Array>} Array of requirement facts
   */
  async getRequirements(orderId, { minConfidence = 0.5 } = {}) {
    return this.knowledgeManager.getFactsForOrder({
      orderId,
      factType: factTypes.REQUIREMENT,
      minConfidence
    });
  }
  
  /**
   * Get all impacts for an executive order
   * 
   * @param {number} orderId Executive order ID
   * @param {Object} options Query options
   * @param {number} [options.minConfidence=0.5] Minimum confidence threshold
   * @returns {Promise<Array>} Array of impact facts
   */
  async getImpacts(orderId, { minConfidence = 0.5 } = {}) {
    return this.knowledgeManager.getFactsForOrder({
      orderId,
      factType: factTypes.IMPACT,
      minConfidence
    });
  }
  
  /**
   * Get Yale-specific impacts for facts related to an executive order
   * 
   * @param {number} orderId Executive order ID
   * @returns {Promise<Array>} Array of Yale impact assessments
   */
  async getYaleImpacts(orderId) {
    if (!this.knowledgeManager.initialized) {
      await this.knowledgeManager.initialize();
    }
    
    try {
      // Get all Yale impact assessments for facts related to this order
      const impacts = await this.knowledgeManager.db.allAsync(`
        SELECT yi.*, kf.fact_type, kf.fact_value, yd.name as department_name
        FROM knowledge_yale_impacts yi
        JOIN knowledge_facts kf ON yi.fact_id = kf.id
        LEFT JOIN yale_departments yd ON yi.yale_department_id = yd.id
        WHERE kf.order_id = ?
        ORDER BY yi.impact_level DESC
      `, [orderId]);
      
      return impacts.map(impact => ({
        id: impact.id,
        factId: impact.fact_id,
        factType: impact.fact_type,
        factValue: JSON.parse(impact.fact_value),
        departmentId: impact.yale_department_id,
        departmentName: impact.department_name,
        impactLevel: impact.impact_level,
        description: impact.impact_description,
        analysisDate: impact.analysis_date,
        analyst: impact.analyst
      }));
    } catch (error) {
      console.error('Error getting Yale impacts:', error);
      throw error;
    }
  }
  
  /**
   * Get contradictory information about an executive order
   * 
   * @param {number} orderId Executive order ID
   * @returns {Promise<Array>} Array of contradictions
   */
  async getContradictions(orderId) {
    return this.knowledgeManager.findContradictions(orderId);
  }
  
  /**
   * Get all facts from a specific source
   * 
   * @param {number} sourceId Source ID
   * @param {Object} options Query options
   * @param {number} [options.minConfidence=0.0] Minimum confidence threshold
   * @param {number} [options.limit=100] Maximum results to return
   * @returns {Promise<Array>} Array of facts from the source
   */
  async getFactsFromSource(sourceId, { minConfidence = 0.0, limit = 100 } = {}) {
    if (!this.knowledgeManager.initialized) {
      await this.knowledgeManager.initialize();
    }
    
    try {
      // Get facts that have this source
      const factRecords = await this.knowledgeManager.db.allAsync(`
        SELECT DISTINCT kf.*
        FROM knowledge_facts kf
        JOIN knowledge_sources ks ON kf.id = ks.fact_id
        WHERE ks.source_id = ? AND kf.confidence >= ?
        LIMIT ?
      `, [sourceId, minConfidence, limit]);
      
      // Convert to Fact objects
      const facts = [];
      for (const record of factRecords) {
        const fact = await this.knowledgeManager.getFactById(record.id);
        if (fact) facts.push(fact);
      }
      
      return facts;
    } catch (error) {
      console.error('Error getting facts from source:', error);
      throw error;
    }
  }
  
  /**
   * Find related facts by relationship type
   * 
   * @param {number} factId Base fact ID
   * @param {string} [relationshipType=null] Optional relationship type filter
   * @returns {Promise<Array>} Array of related facts
   */
  async getRelatedFacts(factId, relationshipType = null) {
    if (!this.knowledgeManager.initialized) {
      await this.knowledgeManager.initialize();
    }
    
    try {
      let query = `
        SELECT kf.*, kr.relationship_type, kr.description as relationship_description
        FROM knowledge_facts kf
        JOIN knowledge_relationships kr ON kf.id = kr.related_fact_id
        WHERE kr.fact_id = ?
      `;
      const params = [factId];
      
      if (relationshipType) {
        query += ` AND kr.relationship_type = ?`;
        params.push(relationshipType);
      }
      
      const relatedRecords = await this.knowledgeManager.db.allAsync(query, params);
      
      // Convert to Fact objects with relationship information
      const relatedFacts = [];
      for (const record of relatedRecords) {
        const fact = await this.knowledgeManager.getFactById(record.id);
        if (fact) {
          // Add relationship information
          fact.relationshipType = record.relationship_type;
          fact.relationshipDescription = record.relationship_description;
          relatedFacts.push(fact);
        }
      }
      
      return relatedFacts;
    } catch (error) {
      console.error('Error getting related facts:', error);
      throw error;
    }
  }
  
  /**
   * Get a summary of knowledge for an executive order
   * 
   * @param {number} orderId Executive order ID
   * @returns {Promise<Object>} Knowledge summary
   */
  async getKnowledgeSummary(orderId) {
    if (!this.knowledgeManager.initialized) {
      await this.knowledgeManager.initialize();
    }
    
    try {
      // Get counts by fact type
      const counts = await this.knowledgeManager.db.allAsync(`
        SELECT fact_type, COUNT(*) as count
        FROM knowledge_facts
        WHERE order_id = ?
        GROUP BY fact_type
      `, [orderId]);
      
      // Get source distribution
      const sources = await this.knowledgeManager.db.allAsync(`
        SELECT sm.source_name, COUNT(*) as fact_count
        FROM knowledge_sources ks
        JOIN knowledge_facts kf ON ks.fact_id = kf.id
        JOIN source_metadata sm ON ks.source_id = sm.id
        WHERE kf.order_id = ?
        GROUP BY sm.source_name
        ORDER BY fact_count DESC
      `, [orderId]);
      
      // Get contradiction count
      const contradictions = await this.knowledgeManager.findContradictions(orderId);
      
      // Get highest confidence facts of each type
      const topFacts = {};
      for (const type of Object.values(factTypes)) {
        const facts = await this.knowledgeManager.getFactsForOrder({
          orderId,
          factType: type,
          minConfidence: 0.0
        });
        
        if (facts.length > 0) {
          // Sort by confidence (descending)
          facts.sort((a, b) => b.confidence - a.confidence);
          topFacts[type] = facts[0];
        }
      }
      
      return {
        orderId,
        factCounts: counts,
        sourceCounts: sources,
        contradictionCount: contradictions.length,
        topFactsByType: topFacts
      };
    } catch (error) {
      console.error('Error getting knowledge summary:', error);
      throw error;
    }
  }
  
  /**
   * Close the database connection
   */
  async close() {
    await this.knowledgeManager.close();
  }
}

module.exports = KnowledgeQueries;