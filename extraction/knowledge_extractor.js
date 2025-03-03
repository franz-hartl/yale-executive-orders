/**
 * knowledge_extractor.js
 * 
 * Extracts structured knowledge from executive orders and related sources.
 * This module supports transformation of raw source data into standardized knowledge
 * representations that can be used for analysis and narrative generation.
 */

const logger = require('../utils/logger');
const { createKnowledgeItem, createUnifiedKnowledge } = require('../models/enhanced_knowledge_schema');

/**
 * Main knowledge extraction orchestrator
 */
class KnowledgeExtractor {
  /**
   * Constructor for KnowledgeExtractor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.logger = options.logger || logger.createNamedLogger('KnowledgeExtractor');
    
    // Configuration
    this.enabledExtractors = options.enabledExtractors || [
      'dates', 'requirements', 'impacts', 'entities', 
      'definitions', 'authorities'
    ];
    
    // Initialize extractors
    this.extractors = {};
    this._initializeExtractors();
  }
  
  /**
   * Initialize all extractors
   * @private
   */
  _initializeExtractors() {
    // Create extractors for each enabled type
    for (const extractorType of this.enabledExtractors) {
      switch (extractorType) {
        case 'dates':
          this.extractors.dates = new DateExtractor();
          break;
        case 'requirements':
          this.extractors.requirements = new RequirementExtractor();
          break;
        case 'impacts':
          this.extractors.impacts = new ImpactExtractor();
          break;
        case 'entities':
          this.extractors.entities = new EntityExtractor();
          break;
        case 'definitions':
          this.extractors.definitions = new DefinitionExtractor();
          break;
        case 'authorities':
          this.extractors.authorities = new AuthorityExtractor();
          break;
        default:
          this.logger.warn(`Unknown extractor type: ${extractorType}`);
          break;
      }
    }
  }
  
  /**
   * Extract all knowledge types from source data
   * @param {Object} sourceData Source data to extract from
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Extracted knowledge
   */
  async extractAll(sourceData, options = {}) {
    this.logger.info(`Extracting all knowledge from source: ${sourceData.source || sourceData.sourceName}`);

    const extractionResults = {};
    const extractionPromises = [];
    
    // Run all enabled extractors concurrently
    for (const extractorType of Object.keys(this.extractors)) {
      extractionPromises.push(
        this.extract(extractorType, sourceData, options)
          .then(result => {
            extractionResults[extractorType] = result;
          })
          .catch(error => {
            this.logger.error(`Error in ${extractorType} extractor: ${error.message}`);
            extractionResults[extractorType] = { 
              error: error.message,
              success: false 
            };
          })
      );
    }
    
    // Wait for all extractors to complete
    await Promise.all(extractionPromises);
    
    // Merge results into unified knowledge
    return this._mergeExtractionResults(extractionResults, sourceData);
  }
  
  /**
   * Extract specific knowledge type
   * @param {string} extractorType Type of knowledge to extract
   * @param {Object} sourceData Source data to extract from
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Extraction result
   */
  async extract(extractorType, sourceData, options = {}) {
    try {
      const extractor = this.extractors[extractorType];
      
      if (!extractor) {
        throw new Error(`Extractor not found for type: ${extractorType}`);
      }
      
      this.logger.debug(`Extracting ${extractorType} from source: ${sourceData.source || sourceData.sourceName}`);
      
      // Start timer
      const startTime = Date.now();
      
      // Perform extraction
      const extractedData = await extractor.extract(sourceData, options);
      
      // Calculate processing time
      const processingTimeMs = Date.now() - startTime;
      
      // Calculate confidence
      const confidence = extractor.calculateConfidence(extractedData);
      
      return {
        extractorType,
        success: true,
        extractionDate: new Date().toISOString(),
        data: extractedData,
        metadata: {
          confidence,
          processingTimeMs,
          sourceId: sourceData.sourceId,
          sourceName: sourceData.source || sourceData.sourceName
        }
      };
    } catch (error) {
      this.logger.error(`Error extracting ${extractorType}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Merge extraction results into unified knowledge
   * @param {Object} results Extraction results by type
   * @param {Object} sourceData Original source data
   * @returns {Object} Unified knowledge
   * @private
   */
  _mergeExtractionResults(results, sourceData) {
    this.logger.debug('Merging extraction results');
    
    // Create base unified knowledge object
    const unifiedKnowledge = createUnifiedKnowledge({
      orderNumber: sourceData.order_number || sourceData.orderNumber,
      title: sourceData.title,
      sourceId: sourceData.sourceId,
      sourceName: sourceData.source || sourceData.sourceName,
      
      // Initialize source analysis
      sourceAnalysis: {
        sources: [{
          id: sourceData.sourceId,
          name: sourceData.source || sourceData.sourceName,
          url: sourceData.url,
          type: sourceData.sourceType || 'unknown'
        }],
        primarySource: {
          id: sourceData.sourceId,
          name: sourceData.source || sourceData.sourceName
        }
      }
    });
    
    // Copy over basic metadata from source data
    if (sourceData.metadata) {
      unifiedKnowledge.metadata = {
        ...unifiedKnowledge.metadata,
        ...this._extractMetadata(sourceData)
      };
    }
    
    // Add extracted knowledge for each type
    for (const [extractorType, result] of Object.entries(results)) {
      if (!result.success || !result.data) continue;
      
      // Map to the property name in unified knowledge
      const propertyName = extractorType.endsWith('s') ? extractorType : `${extractorType}s`;
      
      // Add extracted items with source attribution
      const items = Array.isArray(result.data) ? result.data : result.data[propertyName] || [];
      
      unifiedKnowledge[propertyName] = items.map(item => ({
        ...item,
        sourceId: sourceData.sourceId,
        sourceName: sourceData.source || sourceData.sourceName,
        confidence: item.confidence || result.metadata.confidence || 0.75
      }));
      
      // Track metrics
      unifiedKnowledge.sourceAnalysis.extractorPerformance = unifiedKnowledge.sourceAnalysis.extractorPerformance || {};
      unifiedKnowledge.sourceAnalysis.extractorPerformance[extractorType] = {
        confidence: result.metadata?.confidence || 0,
        itemCount: unifiedKnowledge[propertyName].length,
        processingTimeMs: result.metadata?.processingTimeMs
      };
    }
    
    // Calculate overall metrics
    const confidenceValues = Object.values(unifiedKnowledge.sourceAnalysis.extractorPerformance || {})
      .map(perf => perf.confidence);
    
    unifiedKnowledge.sourceAnalysis.overallConfidence = confidenceValues.length > 0
      ? confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length
      : 0;
    
    // Add Yale-specific info if present in source data
    if (sourceData.yaleImpactAreas) {
      unifiedKnowledge.yaleImpactAreas = sourceData.yaleImpactAreas;
    }
    
    if (sourceData.yaleStakeholders) {
      unifiedKnowledge.yaleStakeholders = sourceData.yaleStakeholders;
    }
    
    this.logger.info(`Merged extraction results: ${Object.keys(results).length} extractors`);
    return unifiedKnowledge;
  }
  
  /**
   * Extract metadata from source data
   * @param {Object} sourceData Source data
   * @returns {Object} Extracted metadata
   * @private
   */
  _extractMetadata(sourceData) {
    return {
      orderNumber: sourceData.order_number || sourceData.orderNumber,
      title: sourceData.title,
      president: sourceData.president,
      signingDate: sourceData.signing_date || sourceData.signingDate,
      publicationDate: sourceData.publication_date || sourceData.publicationDate,
      url: sourceData.url,
      sources: [{
        id: sourceData.sourceId,
        name: sourceData.source || sourceData.sourceName,
        retrievalDate: sourceData.processingDate
      }]
    };
  }
}

/**
 * Base class for all knowledge extractors
 */
class BaseExtractor {
  /**
   * Constructor for BaseExtractor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.name = 'BaseExtractor';
    this.type = 'base';
    this.logger = logger.createNamedLogger(this.name);
  }
  
  /**
   * Extract knowledge from source data
   * @param {Object} sourceData Source data
   * @param {Object} options Extraction options
   * @returns {Promise<Array>} Extracted knowledge items
   */
  async extract(sourceData, options) {
    throw new Error('Must be implemented by subclass');
  }
  
  /**
   * Calculate confidence in extraction results
   * @param {Array} extractedData Extracted data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(extractedData) {
    // Default implementation
    return 0.75;
  }
  
  /**
   * Extract text context around a match
   * @param {string} text Full text
   * @param {number} index Match index
   * @param {number} contextSize Size of context in characters
   * @returns {string} Text context
   * @protected
   */
  _getTextContext(text, index, contextSize = 100) {
    if (!text) return '';
    
    const start = Math.max(0, index - contextSize);
    const end = Math.min(text.length, index + contextSize);
    return text.substring(start, end);
  }
}

/**
 * Extracts date information from executive orders
 */
class DateExtractor extends BaseExtractor {
  /**
   * Constructor for DateExtractor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super(options);
    this.name = 'DateExtractor';
    this.type = 'dates';
    
    // Date patterns for different types of dates
    this.datePatterns = [
      {
        pattern: /(?:effective|takes effect|shall take effect)[^.]*?on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
        type: 'effective'
      },
      {
        pattern: /(?:by|not later than|prior to|before)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
        type: 'deadline'
      },
      {
        pattern: /(?:due|submit|report|provide)[^.]*?(?:by|not later than|prior to|before)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/gi,
        type: 'submission'
      },
      {
        pattern: /(?:signed|executed|done|issued)[^.]*?(?:on|this)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+day\s+of\s+([A-Za-z]+)(?:,\s+|,?\s+in\s+the\s+year\s+)(\d{4})/gi,
        type: 'signing',
        dateParts: true
      },
      {
        pattern: /(?:implement|implementation)[^.]*?(?:by|not later than|within)\s+(\d+)\s+(?:days|months|years)/gi,
        type: 'implementation',
        relative: true
      }
    ];
  }
  
  /**
   * Extract dates from source data
   * @param {Object} sourceData Source data
   * @param {Object} options Extraction options
   * @returns {Promise<Array>} Extracted date items
   */
  async extract(sourceData, options = {}) {
    const startTime = Date.now();
    
    // Get text to analyze
    const textToAnalyze = sourceData.full_text || sourceData.text || '';
    
    // Use signing date if available, or default to the current date
    const referenceDate = sourceData.signing_date || sourceData.signingDate || new Date().toISOString().split('T')[0];
    
    // Extract dates
    const dates = this._extractDates(textToAnalyze, referenceDate);
    
    // Create date knowledge items
    const dateItems = dates.map(date => 
      createKnowledgeItem('date', {
        ...date,
        sourceId: sourceData.sourceId,
        sourceName: sourceData.source || sourceData.sourceName
      })
    );
    
    // Add processing time
    const processingTimeMs = Date.now() - startTime;
    
    return {
      dates: dateItems,
      processingTimeMs
    };
  }
  
  /**
   * Extract dates from text
   * @param {string} text Text to extract from
   * @param {string} referenceDate Reference date for relative dates
   * @returns {Array} Extracted dates
   * @private
   */
  _extractDates(text, referenceDate) {
    const extractedDates = [];
    
    if (!text) return extractedDates;
    
    // Extract using patterns
    for (const { pattern, type, dateParts, relative } of this.datePatterns) {
      let match;
      // Reset lastIndex to start search from beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          let dateString, description;
          
          if (dateParts) {
            // Handle format like "15th day of January, 2023"
            const day = match[1];
            const month = match[2];
            const year = match[3];
            dateString = `${month} ${day}, ${year}`;
          } else if (relative) {
            // Handle relative dates like "within 90 days"
            const amount = parseInt(match[1], 10);
            const unit = match[0].includes('day') ? 'days' : 
                         match[0].includes('month') ? 'months' : 'years';
            
            // Calculate date from reference date
            dateString = this._calculateRelativeDate(referenceDate, amount, unit);
            description = `${match[0]} (calculated from ${referenceDate})`;
          } else {
            // Standard date format
            dateString = match[1];
          }
          
          // Parse the date
          const date = this._parseDate(dateString);
          
          if (date) {
            // Create the date item
            extractedDates.push({
              date,
              dateType: type,
              description: description || match[0].trim(),
              textContext: this._getTextContext(text, match.index),
              isExplicit: !relative,
              confidence: relative ? 0.6 : 0.8
            });
          }
        } catch (error) {
          this.logger.warn(`Error parsing date: ${error.message}`);
        }
      }
    }
    
    return extractedDates;
  }
  
  /**
   * Parse a date string into ISO format
   * @param {string} dateString Date string
   * @returns {string} ISO date string (YYYY-MM-DD) or null if invalid
   * @private
   */
  _parseDate(dateString) {
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return null;
      }
      
      // Format as ISO date (YYYY-MM-DD)
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Calculate a relative date from a reference date
   * @param {string} referenceDate Reference date in ISO format
   * @param {number} amount Amount of time units
   * @param {string} unit Time unit (days, months, years)
   * @returns {string} Calculated date in ISO format
   * @private
   */
  _calculateRelativeDate(referenceDate, amount, unit) {
    const date = new Date(referenceDate);
    
    switch (unit) {
      case 'days':
        date.setDate(date.getDate() + amount);
        break;
      case 'months':
        date.setMonth(date.getMonth() + amount);
        break;
      case 'years':
        date.setFullYear(date.getFullYear() + amount);
        break;
    }
    
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Calculate confidence in extraction results
   * @param {Object} extractedData Extracted data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(extractedData) {
    const dates = extractedData.dates || [];
    
    if (dates.length === 0) {
      return 0.5; // Base confidence
    }
    
    // Calculate average confidence of dates
    const avgConfidence = dates.reduce((sum, date) => sum + (date.confidence || 0.5), 0) / dates.length;
    
    // Adjust based on number of dates found
    let adjustedConfidence = avgConfidence;
    
    // More dates generally means higher confidence
    if (dates.length >= 3) {
      adjustedConfidence += 0.1;
    }
    
    // Cap at 0.95
    return Math.min(0.95, adjustedConfidence);
  }
}

/**
 * Extracts requirements from executive orders
 */
class RequirementExtractor extends BaseExtractor {
  /**
   * Constructor for RequirementExtractor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super(options);
    this.name = 'RequirementExtractor';
    this.type = 'requirements';
    
    // Requirement patterns
    this.requirementPatterns = [
      {
        // Agency requirements
        pattern: /((?:The )?\w+(?:\s\w+){0,4}? (?:Agency|Department|Secretary|Administrator|Director|Office|Bureau|Commission))\s+shall\s+([^.;]+)[.;]/gi,
        type: 'agency_action'
      },
      {
        // General requirements
        pattern: /\b(?:must|required to|shall)\s+([^.;]+)[.;]/gi,
        type: 'general'
      },
      {
        // Reporting requirements
        pattern: /(?:report|submit|provide)\s+([^.;]+?)(?:\s+to\s+([^.;]+))?[.;]/gi,
        type: 'reporting'
      },
      {
        // Prohibitions
        pattern: /\b(?:shall not|may not|prohibited from|is not)\s+([^.;]+)[.;]/gi,
        type: 'prohibition'
      },
      {
        // Deadlines
        pattern: /(?:by|not later than|within|no later than)\s+([^.;]+?)\s*,\s*([^.;]+)[.;]/gi,
        type: 'deadline'
      }
    ];
    
    // Priority keywords
    this.priorityKeywords = {
      high: ['immediately', 'urgent', 'high priority', 'promptly', 'expeditiously'],
      medium: ['as soon as possible', 'timely', 'efficiently'],
      low: ['as appropriate', 'may', 'consider', 'evaluate']
    };
  }
  
  /**
   * Extract requirements from source data
   * @param {Object} sourceData Source data
   * @param {Object} options Extraction options
   * @returns {Promise<Array>} Extracted requirement items
   */
  async extract(sourceData, options = {}) {
    const startTime = Date.now();
    
    // Get text to analyze
    const textToAnalyze = sourceData.full_text || sourceData.text || '';
    
    // Extract requirements
    const requirements = this._extractRequirements(textToAnalyze);
    
    // Create requirement knowledge items
    const requirementItems = requirements.map(req => 
      createKnowledgeItem('requirement', {
        ...req,
        sourceId: sourceData.sourceId,
        sourceName: sourceData.source || sourceData.sourceName
      })
    );
    
    // Add processing time
    const processingTimeMs = Date.now() - startTime;
    
    return {
      requirements: requirementItems,
      processingTimeMs
    };
  }
  
  /**
   * Extract requirements from text
   * @param {string} text Text to extract from
   * @returns {Array} Extracted requirements
   * @private
   */
  _extractRequirements(text) {
    const extractedRequirements = [];
    
    if (!text) return extractedRequirements;
    
    // Extract using patterns
    for (const { pattern, type } of this.requirementPatterns) {
      let match;
      // Reset lastIndex to start search from beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          let description, targetEntities;
          
          if (type === 'agency_action' && match[1] && match[2]) {
            // Agency action with target entity
            targetEntities = [match[1].trim()];
            description = `${match[1]} shall ${match[2]}`;
          } else if (type === 'reporting' && match[2]) {
            // Reporting with recipient
            description = `Report ${match[1]} to ${match[2]}`;
            targetEntities = [match[2].trim()];
          } else {
            // Other requirement types
            description = match[0].trim();
            targetEntities = this._extractEntitiesFromRequirement(description);
          }
          
          // Determine priority based on keywords
          const priority = this._determinePriority(description);
          
          // Create requirement item
          extractedRequirements.push({
            id: `requirement-${extractedRequirements.length + 1}`,
            requirementType: type,
            description,
            targetEntities,
            priority,
            textContext: this._getTextContext(text, match.index),
            isConditional: description.toLowerCase().includes('if') || description.toLowerCase().includes('when'),
            confidence: 0.75
          });
        } catch (error) {
          this.logger.warn(`Error extracting requirement: ${error.message}`);
        }
      }
    }
    
    return extractedRequirements;
  }
  
  /**
   * Extract entities from requirement text
   * @param {string} text Requirement text
   * @returns {Array} Extracted entities
   * @private
   */
  _extractEntitiesFromRequirement(text) {
    const entities = [];
    
    // Simple entity extraction based on common patterns
    const entityPatterns = [
      /(?:The |the )(\w+(?:\s\w+){0,4}?) (?:Agency|Department|Secretary|Administrator|Director|Office|Bureau|Commission)/g,
      /(?:to |by |with |from )(?:the )(\w+(?:\s\w+){0,4}?) (?:Agency|Department|Office|Bureau|Commission)/g
    ];
    
    for (const pattern of entityPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          entities.push(match[1].trim());
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Determine priority of a requirement
   * @param {string} text Requirement text
   * @returns {string} Priority (high, medium, low)
   * @private
   */
  _determinePriority(text) {
    const lowerText = text.toLowerCase();
    
    // Check for high priority keywords
    for (const keyword of this.priorityKeywords.high) {
      if (lowerText.includes(keyword)) {
        return 'high';
      }
    }
    
    // Check for medium priority keywords
    for (const keyword of this.priorityKeywords.medium) {
      if (lowerText.includes(keyword)) {
        return 'medium';
      }
    }
    
    // Check for low priority keywords
    for (const keyword of this.priorityKeywords.low) {
      if (lowerText.includes(keyword)) {
        return 'low';
      }
    }
    
    // Default priority
    return 'medium';
  }
  
  /**
   * Calculate confidence in extraction results
   * @param {Object} extractedData Extracted data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(extractedData) {
    const requirements = extractedData.requirements || [];
    
    if (requirements.length === 0) {
      return 0.5; // Base confidence
    }
    
    // Calculate average confidence of requirements
    const avgConfidence = requirements.reduce((sum, req) => sum + (req.confidence || 0.5), 0) / requirements.length;
    
    // Adjust based on number of requirements found
    let adjustedConfidence = avgConfidence;
    
    // More requirements generally means higher confidence
    if (requirements.length >= 5) {
      adjustedConfidence += 0.1;
    }
    
    // Cap at 0.95
    return Math.min(0.95, adjustedConfidence);
  }
}

/**
 * Extracts impacts from executive orders
 */
class ImpactExtractor extends BaseExtractor {
  /**
   * Constructor for ImpactExtractor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super(options);
    this.name = 'ImpactExtractor';
    this.type = 'impacts';
    
    // Impact patterns
    this.impactPatterns = [
      {
        pattern: /(?:impact|affect|effect on|implications for)\s+([^.;]+)[.;]/gi,
        type: 'general'
      },
      {
        pattern: /(?:cost|funding|financial|budget|economic)\s+([^.;]+)[.;]/gi,
        type: 'financial'
      },
      {
        pattern: /(?:require|compliance|comply with|adhere to)\s+([^.;]+)[.;]/gi,
        type: 'compliance'
      },
      {
        pattern: /(?:change|modify|amend|revise)\s+([^.;]+)[.;]/gi,
        type: 'operational'
      },
      {
        pattern: /(?:risk|vulnerability|threat|security)\s+([^.;]+)[.;]/gi,
        type: 'security'
      }
    ];
    
    // Severity keywords
    this.severityKeywords = {
      high: ['significant', 'substantial', 'major', 'critical', 'extensive'],
      medium: ['moderate', 'considerable', 'notable'],
      low: ['minimal', 'minor', 'limited', 'small', 'slight']
    };
    
    // Timeframe keywords
    this.timeframeKeywords = {
      immediate: ['immediate', 'instantly', 'right away', 'at once'],
      'short-term': ['soon', 'shortly', 'near-term', 'upcoming', 'within days', 'within weeks'],
      'medium-term': ['within months', 'medium-term'],
      'long-term': ['long-term', 'long range', 'extended', 'over years', 'permanent']
    };
  }
  
  /**
   * Extract impacts from source data
   * @param {Object} sourceData Source data
   * @param {Object} options Extraction options
   * @returns {Promise<Array>} Extracted impact items
   */
  async extract(sourceData, options = {}) {
    const startTime = Date.now();
    
    // Get text to analyze
    const textToAnalyze = sourceData.full_text || sourceData.text || '';
    
    // Extract impacts
    const impacts = this._extractImpacts(textToAnalyze);
    
    // Link impacts to requirements if available
    if (sourceData.requirements || options.requirements) {
      this._linkImpactsToRequirements(impacts, sourceData.requirements || options.requirements);
    }
    
    // Create impact knowledge items
    const impactItems = impacts.map(impact => 
      createKnowledgeItem('impact', {
        ...impact,
        sourceId: sourceData.sourceId,
        sourceName: sourceData.source || sourceData.sourceName
      })
    );
    
    // Add processing time
    const processingTimeMs = Date.now() - startTime;
    
    return {
      impacts: impactItems,
      processingTimeMs
    };
  }
  
  /**
   * Extract impacts from text
   * @param {string} text Text to extract from
   * @returns {Array} Extracted impacts
   * @private
   */
  _extractImpacts(text) {
    const extractedImpacts = [];
    
    if (!text) return extractedImpacts;
    
    // Extract using patterns
    for (const { pattern, type } of this.impactPatterns) {
      let match;
      // Reset lastIndex to start search from beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          const description = match[0].trim();
          
          // Extract affected entities
          const affectedEntities = this._extractAffectedEntities(description);
          
          // Determine severity and timeframe
          const severity = this._determineSeverity(description);
          const timeframe = this._determineTimeframe(description);
          
          // Create impact item
          extractedImpacts.push({
            id: `impact-${extractedImpacts.length + 1}`,
            impactType: type,
            description,
            affectedEntities,
            severity,
            timeframe,
            isIndirect: description.toLowerCase().includes('indirect') || description.toLowerCase().includes('secondary'),
            textContext: this._getTextContext(text, match.index),
            confidence: 0.7
          });
        } catch (error) {
          this.logger.warn(`Error extracting impact: ${error.message}`);
        }
      }
    }
    
    return extractedImpacts;
  }
  
  /**
   * Extract affected entities from impact text
   * @param {string} text Impact text
   * @returns {Array} Affected entities
   * @private
   */
  _extractAffectedEntities(text) {
    const entities = [];
    
    // Simple entity extraction based on common patterns
    const entityPatterns = [
      /(?:impact|affect|effect on|implications for)(?:\s+the)?\s+(\w+(?:\s\w+){0,4}?)\b/gi,
      /(?:on|to|for)(?:\s+the)?\s+(\w+(?:\s\w+){0,4}?)\b/gi
    ];
    
    for (const pattern of entityPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          const entity = match[1].trim();
          // Filter out common stopwords
          if (!['a', 'an', 'the', 'this', 'that', 'these', 'those', 'each', 'every', 'some', 'all'].includes(entity.toLowerCase())) {
            entities.push(entity);
          }
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Determine severity of an impact
   * @param {string} text Impact text
   * @returns {string} Severity (high, medium, low)
   * @private
   */
  _determineSeverity(text) {
    const lowerText = text.toLowerCase();
    
    // Check for high severity keywords
    for (const keyword of this.severityKeywords.high) {
      if (lowerText.includes(keyword)) {
        return 'high';
      }
    }
    
    // Check for low severity keywords
    for (const keyword of this.severityKeywords.low) {
      if (lowerText.includes(keyword)) {
        return 'low';
      }
    }
    
    // Check for medium severity keywords
    for (const keyword of this.severityKeywords.medium) {
      if (lowerText.includes(keyword)) {
        return 'medium';
      }
    }
    
    // Default severity
    return 'medium';
  }
  
  /**
   * Determine timeframe of an impact
   * @param {string} text Impact text
   * @returns {string} Timeframe (immediate, short-term, medium-term, long-term)
   * @private
   */
  _determineTimeframe(text) {
    const lowerText = text.toLowerCase();
    
    // Check each timeframe category
    for (const [timeframe, keywords] of Object.entries(this.timeframeKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return timeframe;
        }
      }
    }
    
    // Default timeframe
    return 'medium-term';
  }
  
  /**
   * Link impacts to requirements
   * @param {Array} impacts Extracted impacts
   * @param {Array} requirements Requirements to link to
   * @private
   */
  _linkImpactsToRequirements(impacts, requirements) {
    if (!impacts || !requirements) return;
    
    for (const impact of impacts) {
      const relatedReqIds = [];
      
      for (const req of requirements) {
        // Check for textual similarity between impact and requirement
        if (this._areTextuallyRelated(impact.description, req.description)) {
          relatedReqIds.push(req.id);
        }
      }
      
      if (relatedReqIds.length > 0) {
        impact.relatedRequirementIds = relatedReqIds;
      }
    }
  }
  
  /**
   * Determine if two text strings are related
   * @param {string} text1 First text
   * @param {string} text2 Second text
   * @returns {boolean} Whether the texts are related
   * @private
   */
  _areTextuallyRelated(text1, text2) {
    if (!text1 || !text2) return false;
    
    // Convert to lowercase
    const lower1 = text1.toLowerCase();
    const lower2 = text2.toLowerCase();
    
    // Extract key words (excluding stopwords)
    const words1 = this._extractKeywords(lower1);
    const words2 = this._extractKeywords(lower2);
    
    // Count common words
    let commonWords = 0;
    for (const word of words1) {
      if (words2.includes(word)) {
        commonWords++;
      }
    }
    
    // Calculate similarity
    const similarity = commonWords / Math.min(words1.length, words2.length);
    
    // Return true if similarity exceeds threshold
    return similarity > 0.3;
  }
  
  /**
   * Extract keywords from text
   * @param {string} text Text to extract from
   * @returns {Array} Keywords
   * @private
   */
  _extractKeywords(text) {
    const stopwords = [
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'by', 'for', 'with',
      'about', 'to', 'from', 'of', 'that', 'this', 'these', 'those', 'is', 'are',
      'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'shall', 'will', 'should', 'would', 'can', 'could', 'may', 'might'
    ];
    
    // Split text into words
    const words = text.split(/\W+/).filter(word => word.length > 2);
    
    // Filter out stopwords
    return words.filter(word => !stopwords.includes(word));
  }
  
  /**
   * Calculate confidence in extraction results
   * @param {Object} extractedData Extracted data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(extractedData) {
    const impacts = extractedData.impacts || [];
    
    if (impacts.length === 0) {
      return 0.5; // Base confidence
    }
    
    // Calculate average confidence of impacts
    const avgConfidence = impacts.reduce((sum, impact) => sum + (impact.confidence || 0.5), 0) / impacts.length;
    
    // Adjust based on number of impacts found and their links to requirements
    let adjustedConfidence = avgConfidence;
    
    // More impacts generally means higher confidence
    if (impacts.length >= 3) {
      adjustedConfidence += 0.1;
    }
    
    // Having related requirements increases confidence
    const withRequirements = impacts.filter(impact => impact.relatedRequirementIds && impact.relatedRequirementIds.length > 0);
    if (withRequirements.length > 0) {
      adjustedConfidence += 0.1 * (withRequirements.length / impacts.length);
    }
    
    // Cap at 0.95
    return Math.min(0.95, adjustedConfidence);
  }
}

/**
 * Extractor for entities from executive orders
 */
class EntityExtractor extends BaseExtractor {
  /**
   * Constructor for EntityExtractor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super(options);
    this.name = 'EntityExtractor';
    this.type = 'entities';
    
    // Entity patterns
    this.entityPatterns = [
      // Government agencies
      {
        pattern: /((?:The )?(?:Department|Office|Bureau|Agency|Administration|Commission|Council|Committee) of (?:the )?[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g,
        type: 'agency'
      },
      // Executive roles
      {
        pattern: /((?:The )?(?:Secretary|Administrator|Director|Chair|Commissioner|Assistant Secretary|Under Secretary) of (?:the )?[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g,
        type: 'role'
      },
      // New entities created by the order
      {
        pattern: /establish(?:es|ed)?\s(?:a|an|the)\s([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,5}?)(?:\s\(["']?([A-Z]{2,8})["']?\))?/g,
        type: 'created_entity'
      },
      // Specific departments
      {
        pattern: /(Department of (?:Agriculture|Commerce|Defense|Education|Energy|Health and Human Services|Homeland Security|Housing and Urban Development|Justice|Labor|State|Transportation|Treasury|Veterans Affairs))/g,
        type: 'department'
      }
    ];
  }
  
  /**
   * Extract entities from source data
   * @param {Object} sourceData Source data
   * @param {Object} options Extraction options
   * @returns {Promise<Array>} Extracted entity items
   */
  async extract(sourceData, options = {}) {
    const startTime = Date.now();
    
    // Get text to analyze
    const textToAnalyze = sourceData.full_text || sourceData.text || '';
    
    // Extract entities
    const entities = this._extractEntities(textToAnalyze);
    
    // Create entity knowledge items
    const entityItems = entities.map(entity => 
      createKnowledgeItem('entity', {
        ...entity,
        sourceId: sourceData.sourceId,
        sourceName: sourceData.source || sourceData.sourceName
      })
    );
    
    // Add processing time
    const processingTimeMs = Date.now() - startTime;
    
    return {
      entities: entityItems,
      processingTimeMs
    };
  }
  
  /**
   * Extract entities from text
   * @param {string} text Text to extract from
   * @returns {Array} Extracted entities
   * @private
   */
  _extractEntities(text) {
    const extractedEntities = [];
    const entityMap = new Map(); // To track unique entities
    
    if (!text) return extractedEntities;
    
    // Extract using patterns
    for (const { pattern, type } of this.entityPatterns) {
      let match;
      // Reset lastIndex to start search from beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          const name = match[1].trim();
          const alias = match[2] ? match[2].trim() : undefined;
          
          // Skip if name is too short
          if (name.length < 4) continue;
          
          // Create unique key for entity
          const key = name.toLowerCase();
          
          if (!entityMap.has(key)) {
            // New entity
            const entity = {
              id: `entity-${extractedEntities.length + 1}`,
              name,
              entityType: type,
              aliases: alias ? [alias] : [],
              isCreatedByOrder: type === 'created_entity',
              responsibilities: [],
              textContext: this._getTextContext(text, match.index),
              confidence: type === 'department' ? 0.9 : 0.8
            };
            
            entityMap.set(key, entity);
            extractedEntities.push(entity);
          } else if (alias && !entityMap.get(key).aliases.includes(alias)) {
            // Add alias to existing entity
            entityMap.get(key).aliases.push(alias);
          }
        } catch (error) {
          this.logger.warn(`Error extracting entity: ${error.message}`);
        }
      }
    }
    
    // Extract responsibilities
    this._extractResponsibilities(text, entityMap);
    
    return extractedEntities;
  }
  
  /**
   * Extract responsibilities for entities
   * @param {string} text Full text
   * @param {Map} entityMap Map of entities
   * @private
   */
  _extractResponsibilities(text, entityMap) {
    // For each entity, find sentences mentioning the entity
    for (const [key, entity] of entityMap.entries()) {
      const entityName = entity.name;
      const responsibilities = new Set();
      
      // Look for sentences containing the entity name followed by shall/must/will
      const sentences = text.match(new RegExp(`[^.!?]*?${entityName}[^.!?]*?(?:shall|must|will)[^.!?]*?[.!?]`, 'gi')) || [];
      
      for (const sentence of sentences) {
        // Extract the responsibility
        const responsibility = sentence.trim();
        responsibilities.add(responsibility);
      }
      
      // Add responsibilities to entity
      entity.responsibilities = Array.from(responsibilities);
    }
  }
  
  /**
   * Calculate confidence in extraction results
   * @param {Object} extractedData Extracted data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(extractedData) {
    const entities = extractedData.entities || [];
    
    if (entities.length === 0) {
      return 0.5; // Base confidence
    }
    
    // Calculate average confidence of entities
    const avgConfidence = entities.reduce((sum, entity) => sum + (entity.confidence || 0.5), 0) / entities.length;
    
    // Adjust based on number of entities found and their responsibilities
    let adjustedConfidence = avgConfidence;
    
    // More entities generally means higher confidence
    if (entities.length >= 5) {
      adjustedConfidence += 0.1;
    }
    
    // Having responsibilities increases confidence
    const withResponsibilities = entities.filter(entity => entity.responsibilities && entity.responsibilities.length > 0);
    if (withResponsibilities.length > 0) {
      adjustedConfidence += 0.1 * (withResponsibilities.length / entities.length);
    }
    
    // Cap at 0.95
    return Math.min(0.95, adjustedConfidence);
  }
}

/**
 * Extracts definitions from executive orders
 */
class DefinitionExtractor extends BaseExtractor {
  /**
   * Constructor for DefinitionExtractor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super(options);
    this.name = 'DefinitionExtractor';
    this.type = 'definitions';
    
    // Definition patterns
    this.definitionPatterns = [
      // "term" means "definition"
      {
        pattern: /["']([^"']+)["']\s+means\s+([^.;]+)[.;]/gi
      },
      // "term" refers to "definition"
      {
        pattern: /["']([^"']+)["']\s+refers to\s+([^.;]+)[.;]/gi
      },
      // term.--The term "X" means
      {
        pattern: /([A-Za-z\s]+)\.--The term\s+["']([^"']+)["']\s+means\s+([^.;]+)[.;]/gi,
        complex: true
      },
      // The term "X" means
      {
        pattern: /The term\s+["']([^"']+)["']\s+means\s+([^.;]+)[.;]/gi
      },
      // For purposes of this Order, "X" means
      {
        pattern: /For purposes of this (?:order|section|part),\s+["']([^"']+)["']\s+means\s+([^.;]+)[.;]/gi
      },
      // As used in this Order, "X" means
      {
        pattern: /As used in this (?:order|section|part),\s+["']([^"']+)["']\s+means\s+([^.;]+)[.;]/gi
      }
    ];
  }
  
  /**
   * Extract definitions from source data
   * @param {Object} sourceData Source data
   * @param {Object} options Extraction options
   * @returns {Promise<Array>} Extracted definition items
   */
  async extract(sourceData, options = {}) {
    const startTime = Date.now();
    
    // Get text to analyze
    const textToAnalyze = sourceData.full_text || sourceData.text || '';
    
    // Extract definitions
    const definitions = this._extractDefinitions(textToAnalyze);
    
    // Create definition knowledge items
    const definitionItems = definitions.map(def => 
      createKnowledgeItem('definition', {
        ...def,
        sourceId: sourceData.sourceId,
        sourceName: sourceData.source || sourceData.sourceName
      })
    );
    
    // Add processing time
    const processingTimeMs = Date.now() - startTime;
    
    return {
      definitions: definitionItems,
      processingTimeMs
    };
  }
  
  /**
   * Extract definitions from text
   * @param {string} text Text to extract from
   * @returns {Array} Extracted definitions
   * @private
   */
  _extractDefinitions(text) {
    const extractedDefinitions = [];
    const definedTerms = new Set(); // Track already defined terms
    
    if (!text) return extractedDefinitions;
    
    // Try to identify a definitions section first
    const definitionsSection = this._findDefinitionsSection(text);
    const inDefinitionsSection = definitionsSection ? true : false;
    
    // Use definitions section if found, otherwise use the full text
    const textToSearch = definitionsSection || text;
    
    // Extract using patterns
    for (const { pattern, complex } of this.definitionPatterns) {
      let match;
      // Reset lastIndex to start search from beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(textToSearch)) !== null) {
        try {
          let term, definition;
          
          if (complex) {
            // Handle complex pattern with section header
            term = match[2].trim();
            definition = match[3].trim();
          } else {
            // Handle standard patterns
            term = match[1].trim();
            definition = match[2].trim();
          }
          
          // Skip if already defined
          if (definedTerms.has(term.toLowerCase())) continue;
          
          // Add to defined terms set
          definedTerms.add(term.toLowerCase());
          
          // Create definition item
          extractedDefinitions.push({
            term,
            definition,
            scope: inDefinitionsSection ? 'global' : 'local',
            textContext: this._getTextContext(textToSearch, match.index),
            isExplicit: true,
            confidence: inDefinitionsSection ? 0.9 : 0.8
          });
        } catch (error) {
          this.logger.warn(`Error extracting definition: ${error.message}`);
        }
      }
    }
    
    // Find related terms
    this._findRelatedTerms(extractedDefinitions);
    
    return extractedDefinitions;
  }
  
  /**
   * Find the definitions section in text if it exists
   * @param {string} text Full text
   * @returns {string|null} Definitions section or null if not found
   * @private
   */
  _findDefinitionsSection(text) {
    // Look for common definitions section headers
    const definitionsSectionPatterns = [
      /Sec\.\s+\d+\.\s+Definitions\.[^\n]*((?:.|\n)*?)(?:Sec\.\s+\d+\.|$)/i,
      /Definitions\.[^\n]*((?:.|\n)*?)(?:Sec\.\s+\d+\.|$)/i,
      /For purposes of this (?:order|Order)((?:.|\n)*?)(?:Sec\.\s+\d+\.|$)/i
    ];
    
    for (const pattern of definitionsSectionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Find related terms for each definition
   * @param {Array} definitions Extracted definitions
   * @private
   */
  _findRelatedTerms(definitions) {
    if (definitions.length <= 1) return;
    
    // For each definition, check if other defined terms appear in its definition
    for (const def of definitions) {
      const relatedTerms = [];
      
      for (const otherDef of definitions) {
        if (def.term === otherDef.term) continue;
        
        // Check if the other term appears in this definition
        if (def.definition.toLowerCase().includes(otherDef.term.toLowerCase())) {
          relatedTerms.push(otherDef.term);
        }
      }
      
      def.relatedTerms = relatedTerms;
    }
  }
  
  /**
   * Calculate confidence in extraction results
   * @param {Object} extractedData Extracted data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(extractedData) {
    const definitions = extractedData.definitions || [];
    
    if (definitions.length === 0) {
      return 0.5; // Base confidence
    }
    
    // Calculate average confidence of definitions
    const avgConfidence = definitions.reduce((sum, def) => sum + (def.confidence || 0.5), 0) / definitions.length;
    
    // Adjust based on number of definitions found
    let adjustedConfidence = avgConfidence;
    
    // More definitions generally means higher confidence
    if (definitions.length >= 5) {
      adjustedConfidence += 0.1;
    }
    
    // Having related terms increases confidence
    const withRelatedTerms = definitions.filter(def => def.relatedTerms && def.relatedTerms.length > 0);
    if (withRelatedTerms.length > 0) {
      adjustedConfidence += 0.05 * (withRelatedTerms.length / definitions.length);
    }
    
    // Cap at 0.95
    return Math.min(0.95, adjustedConfidence);
  }
}

/**
 * Extracts authorities cited in executive orders
 */
class AuthorityExtractor extends BaseExtractor {
  /**
   * Constructor for AuthorityExtractor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super(options);
    this.name = 'AuthorityExtractor';
    this.type = 'authorities';
    
    // Authority patterns
    this.authorityPatterns = [
      // By the authority vested in me
      {
        pattern: /By the authority vested in me[^,]*,?\s*(?:as ([^,]+))?,?\s*(?:by|under|pursuant to)\s+([^,;.]+)[,;.]/gi,
        type: 'presidential'
      },
      // Pursuant to
      {
        pattern: /(?:pursuant to|under the authority of|as authorized by|in accordance with)\s+([^,;.]+)[,;.]/gi,
        type: 'legal'
      },
      // Specific statutes
      {
        pattern: /(?:section|sections)\s+(\d+(?:\(\w\))?(?:\s*and\s+\d+(?:\(\w\))?)*)\s+of\s+(?:the\s+)?([^,;.]+)[,;.]/gi,
        type: 'statute'
      },
      // U.S. Code citations
      {
        pattern: /(\d+)\s+U\.S\.C\.\s+(?:§+|section)\s+(\d+(?:\w)?(?:-\d+(?:\w)?)?)/gi,
        type: 'uscode'
      },
      // Public Law citations
      {
        pattern: /Public\s+Law\s+(\d+)[-–]\s*(\d+)/gi,
        type: 'publiclaw'
      },
      // Constitution citations
      {
        pattern: /(?:United States Constitution|U\.S\. Constitution|Constitution of the United States)[^,;.]*(?:Article|Amendment)\s+([IVX]+|[0-9]+)(?:[^,;.]*Section\s+(\d+))?/gi,
        type: 'constitution'
      }
    ];
  }
  
  /**
   * Extract authorities from source data
   * @param {Object} sourceData Source data
   * @param {Object} options Extraction options
   * @returns {Promise<Array>} Extracted authority items
   */
  async extract(sourceData, options = {}) {
    const startTime = Date.now();
    
    // Get text to analyze
    const textToAnalyze = sourceData.full_text || sourceData.text || '';
    
    // Extract authorities
    const authorities = this._extractAuthorities(textToAnalyze);
    
    // Create authority knowledge items
    const authorityItems = authorities.map(authority => 
      createKnowledgeItem('authority', {
        ...authority,
        sourceId: sourceData.sourceId,
        sourceName: sourceData.source || sourceData.sourceName
      })
    );
    
    // Add processing time
    const processingTimeMs = Date.now() - startTime;
    
    return {
      authorities: authorityItems,
      processingTimeMs
    };
  }
  
  /**
   * Extract authorities from text
   * @param {string} text Text to extract from
   * @returns {Array} Extracted authorities
   * @private
   */
  _extractAuthorities(text) {
    const extractedAuthorities = [];
    
    if (!text) return extractedAuthorities;
    
    // Extract using patterns
    for (const { pattern, type } of this.authorityPatterns) {
      let match;
      // Reset lastIndex to start search from beginning
      pattern.lastIndex = 0;
      
      while ((match = pattern.exec(text)) !== null) {
        try {
          let citation, description;
          
          switch (type) {
            case 'presidential':
              // Presidential authority pattern
              citation = match[2] ? match[2].trim() : 'Presidential Authority';
              description = `Presidential authority ${match[1] ? `as ${match[1]}` : ''} under ${citation}`;
              break;
              
            case 'legal':
              // General legal authority
              citation = match[1].trim();
              description = `Authority pursuant to ${citation}`;
              break;
              
            case 'statute':
              // Specific statute sections
              citation = `Section ${match[1]} of ${match[2]}`;
              description = `Authority under ${citation}`;
              break;
              
            case 'uscode':
              // U.S. Code citation
              citation = `${match[1]} U.S.C. § ${match[2]}`;
              description = `Authority under ${citation}`;
              break;
              
            case 'publiclaw':
              // Public Law citation
              citation = `Public Law ${match[1]}-${match[2]}`;
              description = `Authority under ${citation}`;
              break;
              
            case 'constitution':
              // Constitution citation
              const article = match[1];
              const section = match[2] ? `, Section ${match[2]}` : '';
              citation = `U.S. Constitution, Article ${article}${section}`;
              description = `Constitutional authority under ${citation}`;
              break;
              
            default:
              citation = match[0].trim();
              description = `Authority under ${citation}`;
              break;
          }
          
          // Create authority item
          extractedAuthorities.push({
            id: `authority-${extractedAuthorities.length + 1}`,
            authorityType: type,
            citation,
            description,
            textContext: this._getTextContext(text, match.index),
            confidence: type === 'uscode' || type === 'constitution' ? 0.9 : 0.8
          });
        } catch (error) {
          this.logger.warn(`Error extracting authority: ${error.message}`);
        }
      }
    }
    
    return extractedAuthorities;
  }
  
  /**
   * Calculate confidence in extraction results
   * @param {Object} extractedData Extracted data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(extractedData) {
    const authorities = extractedData.authorities || [];
    
    if (authorities.length === 0) {
      return 0.5; // Base confidence
    }
    
    // Calculate average confidence of authorities
    const avgConfidence = authorities.reduce((sum, auth) => sum + (auth.confidence || 0.5), 0) / authorities.length;
    
    // Adjust based on number and types of authorities found
    let adjustedConfidence = avgConfidence;
    
    // More authorities generally means higher confidence
    if (authorities.length >= 3) {
      adjustedConfidence += 0.1;
    }
    
    // Having specific types of authorities increases confidence
    const hasUscode = authorities.some(auth => auth.authorityType === 'uscode');
    const hasConstitution = authorities.some(auth => auth.authorityType === 'constitution');
    
    if (hasUscode) adjustedConfidence += 0.05;
    if (hasConstitution) adjustedConfidence += 0.05;
    
    // Cap at 0.95
    return Math.min(0.95, adjustedConfidence);
  }
}

module.exports = {
  KnowledgeExtractor,
  BaseExtractor,
  DateExtractor,
  RequirementExtractor,
  ImpactExtractor,
  EntityExtractor,
  DefinitionExtractor,
  AuthorityExtractor
};