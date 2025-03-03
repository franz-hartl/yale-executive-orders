/**
 * enhanced_knowledge_schema.js
 * 
 * Enhanced knowledge schema for representing structured information extracted from
 * executive orders, with a focus on Yale-specific categorization and cross-source integration.
 */

/**
 * Knowledge item base schema (common to all knowledge types)
 */
const KnowledgeItemBase = {
  // Required identification fields
  id: null,             // Unique identifier for this knowledge item
  type: null,           // Type of knowledge (e.g., requirement, impact, date, etc.)
  
  // Source tracking
  sourceId: null,       // ID of the source this knowledge came from
  sourceName: null,     // Name of the source this knowledge came from
  extractionDate: null, // When this knowledge was extracted
  
  // Confidence and authority
  confidence: 0.75,     // Confidence in the extracted knowledge (0-1)
  authorityScore: 0.75, // Authority of the source on this specific knowledge (0-1)
  
  // Text evidence
  textEvidence: null,   // Original text from which this knowledge was extracted
  textLocation: null,   // Location in the source document
  
  // Cross-source relationships
  relatedItems: [],     // IDs of related knowledge items
  conflicts: [],        // IDs of conflicting knowledge items
  
  // Yale-specific attributes
  yaleImpactAreaIds: [], // Yale impact areas this knowledge affects
  yaleStakeholderIds: [], // Yale stakeholders this knowledge concerns
  yaleNotes: null,      // Yale-specific notes on this knowledge
  
  // Metadata
  metadata: {}          // Additional metadata
};

/**
 * Schema for executive order basic metadata
 */
const OrderMetadataSchema = {
  orderNumber: null,     // Executive Order number
  title: null,           // Title of the order
  president: null,       // President who issued the order
  signingDate: null,     // Date the order was signed
  publicationDate: null, // Date the order was published
  effectiveDate: null,   // Date the order became effective
  revoked: false,        // Whether the order has been revoked
  revokedBy: null,       // Order number that revoked this order
  amends: [],            // Order numbers this order amends
  amendedBy: [],         // Order numbers that amended this order
  url: null,             // Official URL for the order
  federalRegisterUrl: null, // Federal Register URL if available
  federalRegisterCitation: null, // Federal Register citation
  
  // Source information
  primarySourceId: null, // Primary source of this metadata
  sources: [],           // All sources that provided metadata
  
  // Yale-specific categorization
  yaleImpactAreas: [],   // Yale impact areas (with confidence scores)
  yaleStakeholders: [],  // Yale stakeholders (with confidence scores)
  yaleRelevanceScore: 0.0, // Overall relevance to Yale (0-1)
  
  // Analysis metadata
  analysisDate: null,    // When this order was analyzed
  extractionCoverage: 0.0, // How much of the order was extracted (0-1)
  confidenceScore: 0.0,  // Overall confidence in the extracted knowledge (0-1)
};

/**
 * Schema for dates extracted from executive orders
 */
const DateSchema = {
  ...KnowledgeItemBase,
  type: 'date',
  
  // Date-specific fields
  date: null,               // ISO format date (YYYY-MM-DD)
  dateType: null,           // Type of date (e.g., deadline, effective, implementation)
  description: null,        // Description of what this date represents
  isRecurring: false,       // Whether this is a recurring date
  recurrencePattern: null,  // Pattern of recurrence if applicable
  relatedEntities: [],      // Entities this date applies to
  relatedRequirements: [],  // Requirements this date applies to
  isExplicit: true,         // Whether this date was explicitly stated or inferred
};

/**
 * Schema for requirements extracted from executive orders
 */
const RequirementSchema = {
  ...KnowledgeItemBase,
  type: 'requirement',
  
  // Requirement-specific fields
  requirementType: null,   // Type of requirement (e.g., report, policy, action)
  description: null,       // Description of the requirement
  targetEntities: [],      // Entities required to comply
  deadline: null,          // Deadline for compliance (date or period)
  priority: 'medium',      // Priority level (high, medium, low)
  isConditional: false,    // Whether this requirement is conditional
  condition: null,         // Condition that triggers this requirement
  compliance: {            // Compliance information
    steps: [],             // Steps needed for compliance
    resources: [],         // Resources needed for compliance
    estimatedEffort: null, // Estimated effort for compliance
    verificationMethod: null // How compliance is verified
  },
  yaleSpecificActions: [], // Yale-specific actions needed for compliance
};

/**
 * Schema for impacts extracted from executive orders
 */
const ImpactSchema = {
  ...KnowledgeItemBase,
  type: 'impact',
  
  // Impact-specific fields
  impactType: null,        // Type of impact (e.g., financial, operational, compliance)
  description: null,       // Description of the impact
  affectedEntities: [],    // Entities affected by this impact
  severity: 'medium',      // Severity level (high, medium, low)
  timeframe: null,         // Timeframe for impact (immediate, short-term, long-term)
  isIndirect: false,       // Whether this is a direct or indirect impact
  relatedRequirementIds: [], // Requirements that cause this impact
  
  // Yale-specific impact assessment
  yaleImpactAssessment: {
    estimatedEffort: null, // Estimated effort to address (high, medium, low)
    affectedSystems: [],   // Yale systems affected
    affectedPolicies: [],  // Yale policies affected
    mitigationStrategies: [], // Potential mitigation strategies
    opportunityAreas: []   // Potential opportunities
  }
};

/**
 * Schema for entities extracted from executive orders
 */
const EntitySchema = {
  ...KnowledgeItemBase,
  type: 'entity',
  
  // Entity-specific fields
  name: null,              // Name of the entity
  entityType: null,        // Type of entity (e.g., agency, department, role)
  aliases: [],             // Alternative names for this entity
  parent: null,            // Parent entity, if any
  isCreatedByOrder: false, // Whether this entity is created by the order
  responsibilities: [],    // Responsibilities assigned to this entity
  
  // Yale equivalent mapping
  yaleEquivalent: {
    entityId: null,        // ID of the Yale equivalent entity
    name: null,            // Name of the Yale equivalent
    confidence: 0.0,       // Confidence in the mapping
    notes: null            // Notes about the mapping
  }
};

/**
 * Schema for definitions extracted from executive orders
 */
const DefinitionSchema = {
  ...KnowledgeItemBase,
  type: 'definition',
  
  // Definition-specific fields
  term: null,              // The term being defined
  definition: null,        // The definition text
  scope: null,             // Scope of the definition
  relatedTerms: [],        // Related terms
  isExplicit: true,        // Whether the definition was explicitly stated
  
  // Yale-specific definition extension
  yaleContext: null,       // Yale-specific context for this definition
  yaleInterpretation: null // Yale-specific interpretation
};

/**
 * Schema for authorities cited in executive orders
 */
const AuthoritySchema = {
  ...KnowledgeItemBase,
  type: 'authority',
  
  // Authority-specific fields
  authorityType: null,     // Type of authority (e.g., statute, constitution, precedent)
  citation: null,          // Citation text
  title: null,             // Title or name of authority
  description: null,       // Description of the authority
  url: null,               // URL to the authority text if available
  
  // Yale-specific authority assessment
  yaleCompliance: {
    status: null,          // Yale compliance status with this authority
    responsibleEntity: null, // Yale entity responsible for compliance
    notes: null            // Compliance notes
  }
};

/**
 * Schema for unified knowledge representation
 */
const UnifiedKnowledgeSchema = {
  // Basic metadata
  orderNumber: null,       // Executive Order number
  title: null,             // Title of the order
  extractionDate: null,    // When knowledge was extracted
  
  // Metadata
  metadata: OrderMetadataSchema,
  
  // Extracted knowledge elements
  dates: [],               // Array of DateSchema items
  requirements: [],        // Array of RequirementSchema items
  impacts: [],             // Array of ImpactSchema items
  entities: [],            // Array of EntitySchema items
  definitions: [],         // Array of DefinitionSchema items
  authorities: [],         // Array of AuthoritySchema items
  
  // Yale-specific categorization
  yaleImpactAreas: [],     // Yale impact areas with confidence scores
  yaleStakeholders: [],    // Yale stakeholders with confidence scores
  yaleRelevanceScore: 0.0, // Overall relevance to Yale (0-1)
  
  // Cross-source analysis
  sourceAnalysis: {
    sources: [],           // Sources used in this knowledge
    conflicts: [],         // Conflicts between sources
    consensusScore: 0.0,   // Level of consensus across sources (0-1)
    primarySource: null,   // Most authoritative source
    overallConfidence: 0.0 // Overall confidence in the knowledge
  },
  
  // Narrative generation hints
  narrativeHints: {
    keypoints: [],         // Key points for narratives
    recommendedActions: [], // Recommended actions for Yale
    priorityAreas: [],     // Priority areas for attention
    templates: []          // Recommended narrative templates
  }
};

/**
 * Create a new knowledge item
 * @param {string} type Type of knowledge item
 * @param {Object} data Initial data
 * @returns {Object} New knowledge item
 */
function createKnowledgeItem(type, data = {}) {
  let schema;
  
  // Select the appropriate schema based on type
  switch (type) {
    case 'date':
      schema = DateSchema;
      break;
    case 'requirement':
      schema = RequirementSchema;
      break;
    case 'impact':
      schema = ImpactSchema;
      break;
    case 'entity':
      schema = EntitySchema;
      break;
    case 'definition':
      schema = DefinitionSchema;
      break;
    case 'authority':
      schema = AuthoritySchema;
      break;
    default:
      schema = { ...KnowledgeItemBase, type };
      break;
  }
  
  // Create a unique ID if not provided
  const id = data.id || `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Merge the provided data with the schema
  return {
    ...schema,
    ...data,
    id,
    extractionDate: data.extractionDate || new Date().toISOString()
  };
}

/**
 * Create a new unified knowledge object
 * @param {Object} data Initial data
 * @returns {Object} New unified knowledge object
 */
function createUnifiedKnowledge(data = {}) {
  return {
    ...UnifiedKnowledgeSchema,
    ...data,
    extractionDate: data.extractionDate || new Date().toISOString()
  };
}

module.exports = {
  KnowledgeItemBase,
  OrderMetadataSchema,
  DateSchema,
  RequirementSchema,
  ImpactSchema,
  EntitySchema,
  DefinitionSchema,
  AuthoritySchema,
  UnifiedKnowledgeSchema,
  createKnowledgeItem,
  createUnifiedKnowledge
};