/**
 * knowledge_schema.js
 * 
 * Schema definition for the knowledge representation system.
 * This flexible schema allows for storing attributed facts with source provenance.
 * Following "Essential Simplicity" design philosophy.
 */

/**
 * Database schema for the knowledge representation tables
 */
const knowledgeSchema = {
  // Core knowledge tables
  tables: {
    knowledge_facts: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      order_id: 'INTEGER NOT NULL',
      fact_type: 'TEXT NOT NULL',     // Type of fact (e.g., 'date', 'requirement', 'impact')
      fact_value: 'TEXT NOT NULL',    // The actual knowledge/fact content (JSON encoded)
      confidence: 'REAL DEFAULT 0.5', // Confidence score (0.0 to 1.0)
      created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      foreign_keys: [
        { column: 'order_id', references: 'executive_orders(id)', onDelete: 'CASCADE' }
      ]
    },
    
    knowledge_sources: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      fact_id: 'INTEGER NOT NULL',
      source_id: 'INTEGER NOT NULL',     // Reference to source_metadata table
      source_context: 'TEXT',            // Context from the source (e.g., paragraph, section)
      extraction_date: 'TIMESTAMP',
      extraction_method: 'TEXT',         // How this fact was extracted (e.g., AI, manual, rule-based)
      extraction_metadata: 'TEXT',       // Additional metadata about the extraction (JSON encoded)
      foreign_keys: [
        { column: 'fact_id', references: 'knowledge_facts(id)', onDelete: 'CASCADE' },
        { column: 'source_id', references: 'source_metadata(id)', onDelete: 'CASCADE' }
      ]
    },
    
    knowledge_relationships: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      fact_id: 'INTEGER NOT NULL',
      related_fact_id: 'INTEGER NOT NULL',
      relationship_type: 'TEXT NOT NULL', // Type of relationship (e.g., 'supports', 'contradicts', 'refines')
      description: 'TEXT',
      confidence: 'REAL DEFAULT 0.5',
      created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      foreign_keys: [
        { column: 'fact_id', references: 'knowledge_facts(id)', onDelete: 'CASCADE' },
        { column: 'related_fact_id', references: 'knowledge_facts(id)', onDelete: 'CASCADE' }
      ]
    },
    
    knowledge_yale_impacts: {
      id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
      fact_id: 'INTEGER NOT NULL',
      yale_department_id: 'INTEGER', // Can be null for university-wide impacts
      impact_level: 'TEXT',
      impact_description: 'TEXT',
      analysis_date: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      analyst: 'TEXT',  // Who created this impact assessment
      foreign_keys: [
        { column: 'fact_id', references: 'knowledge_facts(id)', onDelete: 'CASCADE' },
        { column: 'yale_department_id', references: 'yale_departments(id)', onDelete: 'SET NULL' }
      ]
    }
  },
  
  // Predefined fact types
  factTypes: {
    DATE: 'date',                // Important dates (deadlines, effective dates)
    REQUIREMENT: 'requirement',  // Compliance requirements
    IMPACT: 'impact',            // General impacts
    ENTITY: 'entity',            // Organizations, roles mentioned
    DEFINITION: 'definition',    // Terms defined in the order
    EXEMPTION: 'exemption',      // Exemptions to requirements
    AUTHORITY: 'authority',      // Legal authorities cited
    AMENDMENT: 'amendment',      // Changes to existing regulations
    STATUS: 'status',            // Status updates (court decisions, etc.)
    GUIDANCE: 'guidance'         // Implementation guidance
  },
  
  // Predefined relationship types
  relationshipTypes: {
    SUPPORTS: 'supports',           // One fact supports another
    CONTRADICTS: 'contradicts',     // One fact contradicts another
    REFINES: 'refines',             // One fact refines/clarifies another
    SUPERSEDES: 'supersedes',       // One fact supersedes another
    DEPENDS_ON: 'depends_on',       // One fact depends on another
    RELATES_TO: 'relates_to',       // General relationship
    EXEMPTS_FROM: 'exempts_from',   // Exemption relationship
    IMPLEMENTS: 'implements',       // Implementation relationship
    AFFECTS: 'affects'              // Impact relationship
  }
};

module.exports = knowledgeSchema;