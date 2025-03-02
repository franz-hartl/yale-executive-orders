/**
 * resolution_strategies.js
 * 
 * Implements different strategies for resolving conflicts between facts.
 * Following "Essential Simplicity" design philosophy.
 */

const { conflictSchema } = require('../models/conflict_record');

/**
 * Source priority levels (higher number = higher priority)
 * These can be customized based on institution preferences
 */
const SOURCE_PRIORITIES = {
  'Federal Register': 10,        // Official source, highest priority
  'White House': 9,              // Official announcements
  'Department of Justice': 8,    // Legal interpretations
  'National Institutes of Health': 7,  // Relevant for research
  'National Science Foundation': 7,    // Relevant for research
  'Council on Governmental Relations (COGR)': 6,  // Research university focused
  'American Council on Education (ACE)': 5,       // Higher education focused
  'Yale Analysis': 4,            // Internal analysis
  'default': 1                   // Default priority for unknown sources
};

/**
 * Resolves conflicts based on source priority
 * 
 * @param {Object} fact1 First fact with sources
 * @param {Object} fact2 Second fact with sources
 * @param {Array} sourcesInfo Source metadata information
 * @returns {Object} Resolution result
 */
function resolveBySourcePriority(fact1, fact2, sourcesInfo) {
  // Create a map of source_id to source_name
  const sourceMap = sourcesInfo.reduce((map, source) => {
    map[source.id] = source.source_name;
    return map;
  }, {});
  
  // Find the highest priority source for each fact
  let fact1Priority = 0;
  let fact2Priority = 0;
  
  for (const source of fact1.sources) {
    const sourceName = sourceMap[source.sourceId] || 'unknown';
    const priority = SOURCE_PRIORITIES[sourceName] || SOURCE_PRIORITIES.default;
    if (priority > fact1Priority) fact1Priority = priority;
  }
  
  for (const source of fact2.sources) {
    const sourceName = sourceMap[source.sourceId] || 'unknown';
    const priority = SOURCE_PRIORITIES[sourceName] || SOURCE_PRIORITIES.default;
    if (priority > fact2Priority) fact2Priority = priority;
  }
  
  // Determine which fact to prefer
  if (fact1Priority > fact2Priority) {
    return {
      selectedFactId: fact1.id,
      strategy: conflictSchema.resolutionStrategies.SOURCE_PRIORITY,
      notes: `Selected fact from higher priority source (${fact1Priority} > ${fact2Priority})`
    };
  } else if (fact2Priority > fact1Priority) {
    return {
      selectedFactId: fact2.id,
      strategy: conflictSchema.resolutionStrategies.SOURCE_PRIORITY,
      notes: `Selected fact from higher priority source (${fact2Priority} > ${fact1Priority})`
    };
  } else {
    // If priorities are equal, we can't resolve by source priority
    return null;
  }
}

/**
 * Resolves conflicts based on fact confidence
 * 
 * @param {Object} fact1 First fact
 * @param {Object} fact2 Second fact
 * @returns {Object} Resolution result
 */
function resolveByConfidence(fact1, fact2) {
  // Only resolve if confidence differs significantly (>10%)
  if (Math.abs(fact1.confidence - fact2.confidence) < 0.1) {
    return null;
  }
  
  if (fact1.confidence > fact2.confidence) {
    return {
      selectedFactId: fact1.id,
      strategy: conflictSchema.resolutionStrategies.CONFIDENCE,
      notes: `Selected fact with higher confidence (${fact1.confidence.toFixed(2)} > ${fact2.confidence.toFixed(2)})`
    };
  } else {
    return {
      selectedFactId: fact2.id,
      strategy: conflictSchema.resolutionStrategies.CONFIDENCE,
      notes: `Selected fact with higher confidence (${fact2.confidence.toFixed(2)} > ${fact1.confidence.toFixed(2)})`
    };
  }
}

/**
 * Resolves conflicts based on recency (extraction date)
 * 
 * @param {Object} fact1 First fact with sources
 * @param {Object} fact2 Second fact with sources
 * @returns {Object} Resolution result
 */
function resolveByRecency(fact1, fact2) {
  // Find the newest extraction date for each fact
  let fact1Latest = new Date(0);
  let fact2Latest = new Date(0);
  
  for (const source of fact1.sources) {
    if (source.extractionDate) {
      const date = new Date(source.extractionDate);
      if (date > fact1Latest) fact1Latest = date;
    }
  }
  
  for (const source of fact2.sources) {
    if (source.extractionDate) {
      const date = new Date(source.extractionDate);
      if (date > fact2Latest) fact2Latest = date;
    }
  }
  
  // Only resolve if dates differ by at least one day
  const timeDifference = Math.abs(fact1Latest - fact2Latest);
  if (timeDifference < 86400000) { // 24 hours in milliseconds
    return null;
  }
  
  if (fact1Latest > fact2Latest) {
    return {
      selectedFactId: fact1.id,
      strategy: conflictSchema.resolutionStrategies.RECENCY,
      notes: `Selected more recent fact (${fact1Latest.toISOString()} > ${fact2Latest.toISOString()})`
    };
  } else {
    return {
      selectedFactId: fact2.id,
      strategy: conflictSchema.resolutionStrategies.RECENCY,
      notes: `Selected more recent fact (${fact2Latest.toISOString()} > ${fact1Latest.toISOString()})`
    };
  }
}

/**
 * Resolves conflicts based on newest source publication date
 * 
 * @param {Object} fact1 First fact with sources
 * @param {Object} fact2 Second fact with sources
 * @param {Array} sourcesInfo Source metadata information
 * @returns {Object} Resolution result
 */
function resolveByNewestSource(fact1, fact2, sourcesInfo) {
  // Create a map of source_id to last_updated
  const sourceMap = sourcesInfo.reduce((map, source) => {
    map[source.id] = source.last_updated;
    return map;
  }, {});
  
  // Find the newest source date for each fact
  let fact1Latest = new Date(0);
  let fact2Latest = new Date(0);
  
  for (const source of fact1.sources) {
    const updateDate = sourceMap[source.sourceId];
    if (updateDate) {
      const date = new Date(updateDate);
      if (date > fact1Latest) fact1Latest = date;
    }
  }
  
  for (const source of fact2.sources) {
    const updateDate = sourceMap[source.sourceId];
    if (updateDate) {
      const date = new Date(updateDate);
      if (date > fact2Latest) fact2Latest = date;
    }
  }
  
  // Only resolve if dates differ by at least one day
  const timeDifference = Math.abs(fact1Latest - fact2Latest);
  if (timeDifference < 86400000) { // 24 hours in milliseconds
    return null;
  }
  
  if (fact1Latest > fact2Latest) {
    return {
      selectedFactId: fact1.id,
      strategy: conflictSchema.resolutionStrategies.NEWEST_SOURCE,
      notes: `Selected fact from newer source (${fact1Latest.toISOString()} > ${fact2Latest.toISOString()})`
    };
  } else {
    return {
      selectedFactId: fact2.id,
      strategy: conflictSchema.resolutionStrategies.NEWEST_SOURCE,
      notes: `Selected fact from newer source (${fact2Latest.toISOString()} > ${fact1Latest.toISOString()})`
    };
  }
}

/**
 * Try all resolution strategies in sequence
 * 
 * @param {Object} fact1 First fact
 * @param {Object} fact2 Second fact
 * @param {Array} sourcesInfo Source metadata information
 * @returns {Object|null} Resolution result or null if no strategy succeeded
 */
function resolveConflict(fact1, fact2, sourcesInfo) {
  // Try resolving by source priority first
  let resolution = resolveBySourcePriority(fact1, fact2, sourcesInfo);
  if (resolution) return resolution;
  
  // Then try by newest source
  resolution = resolveByNewestSource(fact1, fact2, sourcesInfo);
  if (resolution) return resolution;
  
  // Then try by recency
  resolution = resolveByRecency(fact1, fact2);
  if (resolution) return resolution;
  
  // Finally try by confidence
  resolution = resolveByConfidence(fact1, fact2);
  if (resolution) return resolution;
  
  // If no strategy worked, return null
  return null;
}

/**
 * Determine conflict severity based on conflict type and content
 * 
 * @param {string} conflictType Type of conflict
 * @param {Object} fact1 First fact
 * @param {Object} fact2 Second fact
 * @returns {string} Severity level
 */
function determineConflictSeverity(conflictType, fact1, fact2) {
  switch (conflictType) {
    case conflictSchema.conflictTypes.DATE:
      // Date conflicts can be high severity if related to deadlines
      if (fact1.value.dateType === 'deadline' || fact2.value.dateType === 'deadline') {
        return conflictSchema.severityLevels.HIGH;
      } else if (fact1.value.dateType === 'effective' || fact2.value.dateType === 'effective') {
        return conflictSchema.severityLevels.HIGH;
      }
      return conflictSchema.severityLevels.MEDIUM;
      
    case conflictSchema.conflictTypes.REQUIREMENT:
      // Requirement conflicts are generally high severity
      return conflictSchema.severityLevels.HIGH;
      
    case conflictSchema.conflictTypes.STATUS:
      // Status conflicts are high severity (especially if one is 'revoked' or 'stayed')
      if (fact1.value.includes('revoked') || fact2.value.includes('revoked') ||
          fact1.value.includes('stayed') || fact2.value.includes('stayed')) {
        return conflictSchema.severityLevels.HIGH;
      }
      return conflictSchema.severityLevels.MEDIUM;
      
    case conflictSchema.conflictTypes.IMPACT:
      // Impact conflicts are medium severity
      return conflictSchema.severityLevels.MEDIUM;
      
    case conflictSchema.conflictTypes.GUIDANCE:
      // Guidance conflicts are usually medium severity
      return conflictSchema.severityLevels.MEDIUM;
      
    default:
      // Default to medium for unknown conflict types
      return conflictSchema.severityLevels.MEDIUM;
  }
}

module.exports = {
  resolveBySourcePriority,
  resolveByConfidence,
  resolveByRecency,
  resolveByNewestSource,
  resolveConflict,
  determineConflictSeverity,
  SOURCE_PRIORITIES
};