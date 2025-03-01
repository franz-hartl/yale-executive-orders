/**
 * order_output_schema.js
 * 
 * This file defines the standard JSON schema for executive order exports.
 * It represents the clean contract between the data processing layer and presentation layer.
 */

module.exports = {
  // Core schema for executive orders
  coreSchema: {
    id: "number", // Database ID
    order_number: "string", // Executive order number (e.g., "EO 14067")
    title: "string", // Order title
    signing_date: "string", // ISO date
    publication_date: "string", // ISO date, optional
    president: "string", // President who signed
    summary: "string", // Brief summary
    url: "string", // URL to official source
    impact_level: "string", // "Critical", "High", "Medium", "Low"
    status: "string", // "Active", "Superseded", "Revoked"
    categories: "string[]", // Array of category names
    impact_areas: "string[]", // Array of impact area names
    university_impact_areas: "object[]", // Array of university impact area objects
    has_plain_language_summary: "boolean", // Whether a plain language summary exists
    has_executive_brief: "boolean", // Whether an executive brief exists
    has_comprehensive_analysis: "boolean", // Whether a comprehensive analysis exists
    summary_formats_available: "string[]" // Array of available summary types
  },

  // Schema for university impact areas
  universityImpactAreaSchema: {
    name: "string", // Name of the impact area
    description: "string", // Description of the impact area
    notes: "string" // Optional notes specific to this order
  },

  // Schema for institution-neutral statistics
  statisticsSchema: {
    impactLevels: "object[]", // Impact level statistics
    universityImpactAreas: "object[]", // University impact area statistics
    categories: "object[]", // Category statistics 
    timeline: "object[]" // Timeline statistics by month
  },

  // Schema for impact analysis
  impactAnalysisSchema: {
    name: "string", // Name of the impact area
    description: "string", // Description of the impact area
    consensus_rating: "string", // Overall impact rating
    source_insights: "object[]" // Array of source-specific insights
  },

  // Schema for shared system information  
  systemInfoSchema: {
    topicName: "string", // Topic name
    topicDescription: "string", // Description of the topic
    orderCount: "number", // Number of orders in the system
    version: "string", // Version of the data format
    lastUpdated: "string", // ISO date of last update
    isStaticVersion: "boolean" // Whether this is a static export
  },

  // Institution-specific extension points
  extensionPoints: {
    // These are areas where institution-specific data can be added
    // without breaking the core contract

    // Extension for institution-specific impact areas
    institutionImpactAreas: "object[]",

    // Extension for institution-specific departments/divisions
    institutionDepartments: "object[]",

    // Extension for institution-specific compliance actions
    institutionComplianceActions: "object[]",

    // Extension for institution-specific impact mapping
    institutionImpactMapping: "object[]"
  }
};