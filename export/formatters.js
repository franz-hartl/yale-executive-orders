/**
 * formatters.js
 * 
 * This module contains formatters that transform database data into
 * standardized output formats according to the defined schema contracts.
 * It separates formatting logic from data retrieval logic.
 */

const schema = require('../data_contracts/order_output_schema');

/**
 * Format an executive order to match the core schema
 * @param {Object} order - Executive order from database
 * @returns {Object} - Formatted order matching core schema
 */
function formatExecutiveOrder(order) {
  // Core fields that should be present for all orders
  const formattedOrder = {
    id: order.id,
    order_number: order.order_number,
    title: order.title,
    signing_date: order.signing_date,
    publication_date: order.publication_date || order.signing_date,
    president: order.president,
    summary: order.summary || '',
    url: order.url || '',
    impact_level: order.impact_level || 'Medium',
    status: order.status || 'Active',
    categories: (order.categories || []).map(c => typeof c === 'string' ? c : c.name),
    impact_areas: (order.impact_areas || []).map(area => typeof area === 'string' ? area : area.name),
    university_impact_areas: formatUniversityImpactAreas(order.university_impact_areas || []),
    has_plain_language_summary: !!order.plain_language_summary,
    has_executive_brief: !!order.executive_brief,
    has_comprehensive_analysis: !!order.comprehensive_analysis,
    summary_formats_available: []
  };
  
  // Add available summary formats
  if (order.plain_language_summary) {
    formattedOrder.summary_formats_available.push('standard');
  }
  
  if (order.executive_brief) {
    formattedOrder.summary_formats_available.push('executive_brief');
  }
  
  if (order.comprehensive_analysis) {
    formattedOrder.summary_formats_available.push('comprehensive');
  }
  
  return formattedOrder;
}

/**
 * Format university impact areas to match the schema
 * @param {Array} areas - University impact areas from database
 * @returns {Array} - Formatted university impact areas
 */
function formatUniversityImpactAreas(areas) {
  return areas.map(area => {
    // Handle both object and string formats
    if (typeof area === 'string') {
      return {
        name: area,
        description: '',
        notes: ''
      };
    }
    
    return {
      name: area.name,
      description: area.description || '',
      notes: area.notes || ''
    };
  });
}

/**
 * Format statistics to match the statistics schema
 * @param {Object} rawStats - Raw statistics from database
 * @returns {Object} - Formatted statistics
 */
function formatStatistics(rawStats) {
  return {
    impactLevels: rawStats.impactLevels || [],
    universityImpactAreas: rawStats.universityImpactAreas || [],
    categories: rawStats.categories || [],
    timeline: rawStats.timeline || []
  };
}

/**
 * Format system info to match the system info schema
 * @param {Object} rawInfo - Raw system info
 * @returns {Object} - Formatted system info
 */
function formatSystemInfo(rawInfo) {
  return {
    topicName: rawInfo.topicName || 'Executive Order Analysis',
    topicDescription: rawInfo.topicDescription || 'Analysis of executive orders and their impact',
    orderCount: rawInfo.orderCount || 0,
    version: rawInfo.version || '1.0.0',
    lastUpdated: rawInfo.lastUpdated || new Date().toISOString(),
    isStaticVersion: rawInfo.isStaticVersion !== undefined ? rawInfo.isStaticVersion : true
  };
}

/**
 * Create institution-specific extensions for an order
 * This is an extension point that each institution can customize
 * @param {Object} order - Executive order with institution-specific data
 * @param {string} institutionId - Institution identifier (e.g., 'yale')
 * @returns {Object} - Institution-specific extensions
 */
function createInstitutionExtensions(order, institutionId) {
  // Base extension object
  const extensions = {};
  
  // Institution-specific logic
  switch (institutionId.toLowerCase()) {
    case 'yale':
      // Yale-specific extensions
      extensions.yale = {
        relevance_score: order.yale_guidance?.yale_university?.relevance_score || 5,
        affected_departments: order.yale_guidance?.yale_university?.affected_departments || [],
        primary_departments: order.yale_guidance?.yale_university?.primary_departments || [],
        secondary_departments: order.yale_guidance?.yale_university?.secondary_departments || [],
        action_items: order.yale_guidance?.yale_university?.action_items || [],
        compliance_actions: order.yale_compliance_actions || [],
        impact_areas: order.yale_impact_areas || [],
        source_insights: order.yale_guidance?.yale_university?.source_insights || {}
      };
      break;
      
    // Add other institutions as needed
    // case 'harvard':
    //   extensions.harvard = { ... };
    //   break;
    
    default:
      // No institution-specific extensions
      break;
  }
  
  return extensions;
}

module.exports = {
  formatExecutiveOrder,
  formatUniversityImpactAreas,
  formatStatistics,
  formatSystemInfo,
  createInstitutionExtensions
};