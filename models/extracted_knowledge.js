/**
 * extracted_knowledge.js
 * 
 * Defines the data models for storing different types of extracted information
 * from executive orders. These models help standardize how extracted knowledge
 * is represented throughout the system.
 */

/**
 * Base model for all extracted knowledge
 */
const BaseExtractionModel = {
  // Common fields for all extraction types
  orderNumber: null,         // Executive order number
  sourceId: null,            // ID of the source where this information was extracted from
  sourceName: null,          // Name of the source
  extractionDate: null,      // When this information was extracted
  extractor: null,           // Which extractor generated this information
  confidence: 0.0,           // Confidence score (0.0 to 1.0)
  rawText: null,             // Original text from which the information was extracted
  textLocation: null,        // Reference to the location in the text (section, paragraph, etc.)
  metadata: {}               // Any additional metadata about the extraction
};

/**
 * Model for dates extracted from executive orders
 */
const DateExtractionModel = {
  ...BaseExtractionModel,
  extractor: 'dates',
  dates: [
    {
      date: null,            // ISO format date string (YYYY-MM-DD)
      dateType: null,        // Type of date (e.g., 'signing', 'effective', 'deadline', 'publication')
      description: null,     // Description of what this date represents
      textContext: null,     // Text surrounding the date for context
      isExplicit: true,      // Whether the date was explicitly stated or inferred
      confidence: 0.0,       // Confidence in this specific date
      affectedEntities: [],  // Entities affected by this date
      recurring: false,      // Whether this is a recurring date
      recurrencePattern: null // Pattern of recurrence if applicable
    }
  ]
};

/**
 * Model for requirements extracted from executive orders
 */
const RequirementExtractionModel = {
  ...BaseExtractionModel,
  extractor: 'requirements',
  requirements: [
    {
      id: null,                  // Unique identifier for this requirement
      requirementType: null,     // Type of requirement (e.g., 'report', 'compliance', 'action')
      description: null,         // Description of the requirement
      textContext: null,         // Text surrounding the requirement for context
      targetEntities: [],        // Entities targeted by this requirement
      deadline: null,            // Deadline for this requirement, if any
      isExplicit: true,          // Whether the requirement was explicitly stated or inferred
      confidence: 0.0,           // Confidence in this specific requirement
      priority: 'medium',        // Priority level (high, medium, low)
      conditionalOn: null,       // Whether this requirement is conditional on something else
      alternativeToRequirementId: null // If this is an alternative to another requirement
    }
  ]
};

/**
 * Model for impacts extracted from executive orders
 */
const ImpactExtractionModel = {
  ...BaseExtractionModel,
  extractor: 'impacts',
  impacts: [
    {
      id: null,                  // Unique identifier for this impact
      impactType: null,          // Type of impact (e.g., 'financial', 'operational', 'compliance')
      description: null,         // Description of the impact
      textContext: null,         // Text surrounding the impact for context
      affectedEntities: [],      // Entities affected by this impact
      severity: 'medium',        // Severity level (high, medium, low)
      confidence: 0.0,           // Confidence in this specific impact
      timeframe: null,           // Timeframe for this impact (immediate, short-term, long-term)
      isIndirect: false,         // Whether this is a direct or indirect impact
      relatedRequirementIds: []  // IDs of related requirements, if any
    }
  ],
  overallImpactAssessment: null  // Brief overall assessment of impacts
};

/**
 * Model for entities extracted from executive orders
 */
const EntityExtractionModel = {
  ...BaseExtractionModel,
  extractor: 'entities',
  entities: [
    {
      id: null,                  // Unique identifier for this entity
      name: null,                // Name of the entity
      entityType: null,          // Type of entity (e.g., 'agency', 'department', 'role', 'institution')
      textContext: null,         // Text surrounding the entity for context
      aliases: [],               // Alternative names for this entity
      confidence: 0.0,           // Confidence in this specific entity
      parent: null,              // Parent entity, if any
      isCreatedByOrder: false,   // Whether this entity is created by the order
      responsibilities: [],      // Responsibilities assigned to this entity
      referencedSections: []     // Sections where this entity is referenced
    }
  ]
};

/**
 * Model for definitions extracted from executive orders
 */
const DefinitionExtractionModel = {
  ...BaseExtractionModel,
  extractor: 'definitions',
  definitions: [
    {
      term: null,                // The term being defined
      definition: null,          // The definition text
      textContext: null,         // Text surrounding the definition for context
      section: null,             // Section where the definition appears
      isExplicit: true,          // Whether the definition was explicitly stated or inferred
      confidence: 0.0,           // Confidence in this specific definition
      relatedTerms: [],          // Related terms
      scope: null                // Scope of the definition (applies to entire order, section, etc.)
    }
  ]
};

/**
 * Model for exemptions extracted from executive orders
 */
const ExemptionExtractionModel = {
  ...BaseExtractionModel,
  extractor: 'exemptions',
  exemptions: [
    {
      id: null,                  // Unique identifier for this exemption
      exemptionType: null,       // Type of exemption (e.g., 'entity', 'activity', 'timeframe')
      description: null,         // Description of the exemption
      textContext: null,         // Text surrounding the exemption for context
      exemptedEntities: [],      // Entities exempted
      exemptedActivities: [],    // Activities exempted
      conditions: [],            // Conditions for the exemption to apply
      confidence: 0.0,           // Confidence in this specific exemption
      isPartial: false,          // Whether this is a partial or complete exemption
      relatedRequirementIds: []  // IDs of related requirements
    }
  ]
};

/**
 * Model for authorities cited in executive orders
 */
const AuthorityExtractionModel = {
  ...BaseExtractionModel,
  extractor: 'authorities',
  authorities: [
    {
      id: null,                  // Unique identifier for this authority
      authorityType: null,       // Type of authority (e.g., 'statute', 'constitution', 'previous_eo')
      citation: null,            // Citation text
      textContext: null,         // Text surrounding the citation for context
      description: null,         // Description of the authority
      confidence: 0.0,           // Confidence in this specific authority
      specificProvisions: []     // Specific provisions cited
    }
  ]
};

/**
 * Model for amendments to other orders or regulations
 */
const AmendmentExtractionModel = {
  ...BaseExtractionModel,
  extractor: 'amendments',
  amendments: [
    {
      id: null,                  // Unique identifier for this amendment
      amendmentType: null,       // Type of amendment (e.g., 'addition', 'modification', 'revocation')
      targetDocument: null,      // Document being amended (e.g., another EO, regulation)
      targetSection: null,       // Section being amended
      originalText: null,        // Original text being amended
      newText: null,             // New text after amendment
      textContext: null,         // Text surrounding the amendment for context
      confidence: 0.0,           // Confidence in this specific amendment
      effectiveDate: null        // When the amendment takes effect
    }
  ]
};

/**
 * Create a new extraction model instance
 * @param {string} extractorType Type of extractor
 * @param {Object} data Initial data
 * @returns {Object} New model instance
 */
function createExtractionModel(extractorType, data = {}) {
  let model;
  
  // Select the appropriate model based on extractor type
  switch (extractorType) {
    case 'dates':
      model = { ...DateExtractionModel };
      break;
    case 'requirements':
      model = { ...RequirementExtractionModel };
      break;
    case 'impacts':
      model = { ...ImpactExtractionModel };
      break;
    case 'entities':
      model = { ...EntityExtractionModel };
      break;
    case 'definitions':
      model = { ...DefinitionExtractionModel };
      break;
    case 'exemptions':
      model = { ...ExemptionExtractionModel };
      break;
    case 'authorities':
      model = { ...AuthorityExtractionModel };
      break;
    case 'amendments':
      model = { ...AmendmentExtractionModel };
      break;
    default:
      model = { ...BaseExtractionModel, extractor: extractorType };
      break;
  }
  
  // Merge in any provided data
  return {
    ...model,
    ...data,
    extractionDate: data.extractionDate || new Date().toISOString()
  };
}

module.exports = {
  BaseExtractionModel,
  DateExtractionModel,
  RequirementExtractionModel,
  ImpactExtractionModel,
  EntityExtractionModel,
  DefinitionExtractionModel,
  ExemptionExtractionModel,
  AuthorityExtractionModel,
  AmendmentExtractionModel,
  createExtractionModel
};