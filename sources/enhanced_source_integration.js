/**
 * enhanced_source_integration.js
 * 
 * Main integration module for the enhanced source adapter system.
 * This module serves as the core orchestrator for source data acquisition,
 * knowledge extraction, cross-source analysis, and narrative generation.
 */

const logger = require('../utils/logger');
const EnhancedBaseSource = require('./enhanced_base_source');
const { KnowledgeExtractor } = require('../extraction/knowledge_extractor');
const path = require('path');

/**
 * Enhanced Source Integration System
 * Orchestrates the interaction between source adapters, knowledge extraction, and analysis
 */
class EnhancedSourceIntegration {
  /**
   * Constructor for EnhancedSourceIntegration
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    // Initialize logger
    this.logger = options.logger || logger.createNamedLogger('EnhancedSourceIntegration');
    
    // Initialize components
    this.sourceRegistry = options.sourceRegistry || new Map();
    this.knowledgeExtractor = new KnowledgeExtractor(options);
    
    // Configuration
    this.options = {
      storagePath: options.storagePath || path.join(__dirname, '..', 'data', 'enhanced_sources'),
      enabledSources: options.enabledSources || ['nih', 'nsf', 'cogr', 'ace'],
      ...options
    };
  }
  
  /**
   * Initialize the system
   * @returns {Promise<boolean>} True if initialization was successful
   */
  async initialize() {
    try {
      this.logger.info('Initializing Enhanced Source Integration System');
      
      // Register sources
      await this._registerSources();
      
      // Initialize source adapters
      await this._initializeSources();
      
      this.logger.info('Enhanced Source Integration System initialized successfully');
      return true;
    } catch (error) {
      this.logger.error(`Initialization error: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Register source adapters
   * @returns {Promise<void>}
   * @private
   */
  async _registerSources() {
    // Register each source type with enhanced adapters
    for (const sourceType of this.options.enabledSources) {
      try {
        // Dynamically load the enhanced source adapter
        const sourceAdapter = await this._createSourceAdapter(sourceType);
        
        if (sourceAdapter) {
          this.sourceRegistry.set(sourceAdapter.id, sourceAdapter);
          this.logger.info(`Registered enhanced source: ${sourceAdapter.name} (${sourceAdapter.id})`);
        }
      } catch (error) {
        this.logger.error(`Failed to register source ${sourceType}: ${error.message}`);
      }
    }
    
    this.logger.info(`Registered ${this.sourceRegistry.size} source adapters`);
  }
  
  /**
   * Create a source adapter instance
   * @param {string} sourceType Type of source
   * @returns {Promise<EnhancedBaseSource>} Source adapter instance
   * @private
   */
  async _createSourceAdapter(sourceType) {
    switch (sourceType.toLowerCase()) {
      case 'nih':
        return new EnhancedNIHSource({
          id: 'nih-enhanced',
          storageDir: path.join(this.options.storagePath, 'nih')
        });
        
      case 'nsf':
        return new EnhancedNSFSource({
          id: 'nsf-enhanced',
          storageDir: path.join(this.options.storagePath, 'nsf')
        });
        
      case 'cogr':
        return new EnhancedCOGRSource({
          id: 'cogr-enhanced',
          storageDir: path.join(this.options.storagePath, 'cogr')
        });
        
      case 'ace':
        return new EnhancedACESource({
          id: 'ace-enhanced',
          storageDir: path.join(this.options.storagePath, 'ace')
        });
        
      default:
        this.logger.warn(`Unknown source type: ${sourceType}`);
        return null;
    }
  }
  
  /**
   * Initialize all sources
   * @returns {Promise<void>}
   * @private
   */
  async _initializeSources() {
    for (const [id, source] of this.sourceRegistry.entries()) {
      try {
        await source.initialize();
        this.logger.info(`Initialized source: ${source.name}`);
      } catch (error) {
        this.logger.error(`Failed to initialize source ${source.name}: ${error.message}`);
      }
    }
  }
  
  /**
   * Process an executive order through the system
   * @param {string} orderNumber Executive order number
   * @param {Object} options Processing options
   * @returns {Promise<Object>} Processing results
   */
  async processOrder(orderNumber, options = {}) {
    this.logger.info(`Processing executive order ${orderNumber}`);
    
    try {
      // Step 1: Get order data from all sources
      const sourceResults = await this._collectSourceData(orderNumber, options);
      
      // Step 2: Extract knowledge from each source
      const knowledgeResults = await this._extractKnowledge(sourceResults, options);
      
      // Step 3: Combine knowledge from multiple sources
      const unifiedKnowledge = this._combineKnowledge(knowledgeResults, options);
      
      // Prepare results
      return {
        orderNumber,
        processingDate: new Date().toISOString(),
        sourceResults,
        knowledgeResults: this._summarizeKnowledgeResults(knowledgeResults),
        unifiedKnowledge,
        success: true
      };
    } catch (error) {
      this.logger.error(`Error processing order ${orderNumber}: ${error.message}`);
      return {
        orderNumber,
        processingDate: new Date().toISOString(),
        error: error.message,
        success: false
      };
    }
  }
  
  /**
   * Collect data from all sources
   * @param {string} orderNumber Executive order number
   * @param {Object} options Collection options
   * @returns {Promise<Object>} Source results by source ID
   * @private
   */
  async _collectSourceData(orderNumber, options = {}) {
    this.logger.info(`Collecting data for order ${orderNumber} from sources`);
    
    const sourceResults = {};
    
    // Fetch from each source
    for (const [id, source] of this.sourceRegistry.entries()) {
      try {
        this.logger.debug(`Fetching from source: ${source.name}`);
        
        // Fetch data with order number
        const result = await source.fetchData({
          orderNumber,
          ...options
        });
        
        sourceResults[id] = {
          sourceId: id,
          sourceName: source.name,
          changed: result.changed,
          success: true,
          data: result.data
        };
      } catch (error) {
        this.logger.warn(`Error fetching from source ${source.name}: ${error.message}`);
        sourceResults[id] = {
          sourceId: id,
          sourceName: source.name,
          success: false,
          error: error.message
        };
      }
    }
    
    return sourceResults;
  }
  
  /**
   * Extract knowledge from source data
   * @param {Object} sourceResults Source results by source ID
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Knowledge results by source ID
   * @private
   */
  async _extractKnowledge(sourceResults, options = {}) {
    this.logger.info('Extracting knowledge from source data');
    
    const knowledgeResults = {};
    
    // Process each source's data
    for (const [sourceId, result] of Object.entries(sourceResults)) {
      if (!result.success || !result.data) continue;
      
      try {
        this.logger.debug(`Extracting knowledge from source: ${result.sourceName}`);
        const extractedKnowledge = await this.knowledgeExtractor.extractAll(
          {
            ...result.data,
            sourceId: result.sourceId,
            sourceName: result.sourceName
          }, 
          options
        );
        
        knowledgeResults[sourceId] = {
          sourceId,
          sourceName: result.sourceName,
          success: true,
          knowledge: extractedKnowledge
        };
      } catch (error) {
        this.logger.warn(`Error extracting knowledge from source ${result.sourceName}: ${error.message}`);
        knowledgeResults[sourceId] = {
          sourceId,
          sourceName: result.sourceName,
          success: false,
          error: error.message
        };
      }
    }
    
    return knowledgeResults;
  }
  
  /**
   * Combine knowledge from multiple sources
   * @param {Object} knowledgeResults Knowledge results by source ID
   * @param {Object} options Combination options
   * @returns {Object} Combined knowledge
   * @private
   */
  _combineKnowledge(knowledgeResults, options = {}) {
    this.logger.info('Combining knowledge from multiple sources');
    
    // Select the best knowledge for each extraction type
    const combinedKnowledge = {
      orderNumber: null,
      title: null,
      dates: [],
      requirements: [],
      impacts: [],
      entities: [],
      definitions: [],
      authorities: [],
      yaleImpactAreas: [],
      yaleStakeholders: [],
      sources: [],
      extractionDate: new Date().toISOString()
    };
    
    // Track knowledge items by ID to avoid duplicates
    const knowledgeItemsById = new Map();
    
    // Process each source's knowledge
    for (const { success, sourceName, sourceId, knowledge } of Object.values(knowledgeResults)) {
      if (!success || !knowledge) continue;
      
      // Add to sources
      combinedKnowledge.sources.push({
        id: sourceId,
        name: sourceName
      });
      
      // Use the first non-null order number and title we find
      if (!combinedKnowledge.orderNumber && knowledge.orderNumber) {
        combinedKnowledge.orderNumber = knowledge.orderNumber;
      }
      
      if (!combinedKnowledge.title && knowledge.title) {
        combinedKnowledge.title = knowledge.title;
      }
      
      // Merge Yale-specific info
      if (knowledge.yaleImpactAreas) {
        for (const area of knowledge.yaleImpactAreas) {
          if (!combinedKnowledge.yaleImpactAreas.some(a => a.id === area.id)) {
            combinedKnowledge.yaleImpactAreas.push(area);
          }
        }
      }
      
      if (knowledge.yaleStakeholders) {
        for (const stakeholder of knowledge.yaleStakeholders) {
          if (!combinedKnowledge.yaleStakeholders.some(s => s.id === stakeholder.id)) {
            combinedKnowledge.yaleStakeholders.push(stakeholder);
          }
        }
      }
      
      // Merge knowledge items from each type
      this._mergeKnowledgeItems(combinedKnowledge, 'dates', knowledge.dates || [], knowledgeItemsById);
      this._mergeKnowledgeItems(combinedKnowledge, 'requirements', knowledge.requirements || [], knowledgeItemsById);
      this._mergeKnowledgeItems(combinedKnowledge, 'impacts', knowledge.impacts || [], knowledgeItemsById);
      this._mergeKnowledgeItems(combinedKnowledge, 'entities', knowledge.entities || [], knowledgeItemsById);
      this._mergeKnowledgeItems(combinedKnowledge, 'definitions', knowledge.definitions || [], knowledgeItemsById);
      this._mergeKnowledgeItems(combinedKnowledge, 'authorities', knowledge.authorities || [], knowledgeItemsById);
    }
    
    return combinedKnowledge;
  }
  
  /**
   * Merge knowledge items of a specific type
   * @param {Object} target Target object to merge into
   * @param {string} type Type of knowledge items
   * @param {Array} items Items to merge
   * @param {Map} itemsById Map of items by ID to avoid duplicates
   * @private
   */
  _mergeKnowledgeItems(target, type, items, itemsById) {
    for (const item of items) {
      // Skip if null or missing ID
      if (!item || !item.id) continue;
      
      // Check if we've already processed this item
      if (itemsById.has(item.id)) {
        // Merge additional data with existing item
        const existingItem = itemsById.get(item.id);
        
        // Merge source information
        if (item.sourceId && !existingItem.sourcesInfo.some(s => s.id === item.sourceId)) {
          existingItem.sourcesInfo.push({
            id: item.sourceId,
            name: item.sourceName,
            confidence: item.confidence
          });
          
          // Update confidence as highest confidence from any source
          existingItem.confidence = Math.max(
            existingItem.confidence,
            item.confidence || 0.5
          );
        }
      } else {
        // Add source information array
        const enhancedItem = {
          ...item,
          sourcesInfo: [
            {
              id: item.sourceId,
              name: item.sourceName,
              confidence: item.confidence
            }
          ]
        };
        
        // Add to target array
        target[type].push(enhancedItem);
        
        // Track by ID
        itemsById.set(item.id, enhancedItem);
      }
    }
  }
  
  /**
   * Create summary of knowledge extraction results
   * @param {Object} knowledgeResults Knowledge results by source ID
   * @returns {Array} Summary of knowledge extraction
   * @private
   */
  _summarizeKnowledgeResults(knowledgeResults) {
    return Object.values(knowledgeResults).map(result => {
      if (!result.success) {
        return {
          sourceId: result.sourceId,
          sourceName: result.sourceName,
          success: false,
          error: result.error
        };
      }
      
      const knowledge = result.knowledge;
      const counts = {};
      
      // Count items in each category
      for (const field of ['dates', 'requirements', 'impacts', 'entities', 'definitions', 'authorities']) {
        counts[field] = Array.isArray(knowledge[field]) ? knowledge[field].length : 0;
      }
      
      return {
        sourceId: result.sourceId,
        sourceName: result.sourceName,
        success: true,
        extractionCounts: counts,
        totalItems: Object.values(counts).reduce((sum, count) => sum + count, 0),
        metrics: knowledge.sourceAnalysis || {}
      };
    });
  }
  
  /**
   * Get all available sources
   * @param {boolean} onlyEnabled Whether to include only enabled sources
   * @returns {Array} Source information
   */
  getAllSources(onlyEnabled = true) {
    const sources = [];
    
    for (const [id, source] of this.sourceRegistry.entries()) {
      if (onlyEnabled && !source.enabled) continue;
      
      sources.push({
        id: source.id,
        name: source.name,
        description: source.description,
        enabled: source.enabled,
        authorityScore: source.authorityScore
      });
    }
    
    return sources;
  }
  
  /**
   * Get a specific source by ID
   * @param {string} sourceId Source ID
   * @returns {EnhancedBaseSource|null} Source adapter or null if not found
   */
  getSource(sourceId) {
    return this.sourceRegistry.get(sourceId) || null;
  }
}

/**
 * Enhanced NIH Source
 */
class EnhancedNIHSource extends EnhancedBaseSource {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Enhanced NIH Source',
      description: 'Enhanced adapter for NIH notices and policies',
      authorityScore: 0.85, // NIH has high authority in healthcare/research domains
      ...options
    });
    
    this.baseUrl = 'https://grants.nih.gov';
    this.noticesUrl = options.noticesUrl || 'https://grants.nih.gov/grants/guide/notice-files/';
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'external_sources', 'nih');
  }
  
  /**
   * Initialize the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing Enhanced NIH Source');
    // For now, just ensure storage directory exists
    const fs = require('fs');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }
  
  /**
   * Acquire raw data from source
   * @param {Object} options Fetch options
   * @returns {Promise<Object>} Raw source data
   * @protected
   */
  async _acquireRawData(options) {
    // Implementation would be based on the existing NIHSource.fetchOrders
    // For initial version, replicate the behavior of the original adapter
    
    // Try to find existing data
    const searchPattern = options.orderNumber ? 
      `*Executive*Order*${options.orderNumber}*.json` : 
      '*.json';
    
    try {
      const glob = require('glob');
      const fs = require('fs');
      const files = glob.sync(path.join(this.storageDir, searchPattern));
      
      if (files.length > 0) {
        // Use the most recent file
        const mostRecentFile = files.sort().pop();
        this.logger.info(`Using cached NIH data from ${path.basename(mostRecentFile)}`);
        
        const data = JSON.parse(fs.readFileSync(mostRecentFile, 'utf8'));
        return data;
      }
    } catch (error) {
      this.logger.warn(`Error finding cached NIH data: ${error.message}`);
    }
    
    // For now, return sample/mock data
    // This would be replaced with real implementation connecting to NIH
    return {
      order_number: options.orderNumber,
      title: `NIH Analysis of Executive Order ${options.orderNumber}`,
      source: 'NIH',
      summary: 'Sample NIH analysis of executive order impacts on biomedical research.',
      full_text: 'Sample text from NIH about the executive order requirements for NIH-funded research. This includes guidance on compliance steps that universities and researchers should take.',
      contentType: 'notice',
      url: `${this.baseUrl}/policies/eo-${options.orderNumber}`
    };
  }
  
  /**
   * Extract structured knowledge from raw data
   * @param {Object} rawData Raw data from source
   * @returns {Promise<Object>} Extracted knowledge
   * @protected
   */
  async _extractKnowledge(rawData) {
    // For initial version, return basic structured data
    // This would be enhanced with more sophisticated extraction in a full implementation
    return {
      orderNumber: rawData.order_number,
      title: rawData.title,
      summary: rawData.summary,
      source: 'NIH',
      type: 'policy_guidance',
      url: rawData.url,
      // Would include more extraction in actual implementation
      keyHighlights: [
        'Guidance for NIH-funded research',
        'Compliance requirements for universities',
        'Changes to grant application process'
      ]
    };
  }
  
  /**
   * Map extracted knowledge to Yale taxonomy
   * @param {Object} knowledge Extracted knowledge
   * @returns {Promise<Object>} Knowledge mapped to Yale taxonomy
   * @protected
   */
  async _mapToYaleTaxonomy(knowledge) {
    const baseMapping = await super._mapToYaleTaxonomy(knowledge);
    
    // NIH sources strongly relate to research and healthcare
    // Ensure these areas are represented with high confidence
    const yaleImpactAreas = baseMapping.yaleImpactAreas || [];
    const yaleStakeholders = baseMapping.yaleStakeholders || [];
    
    // Add core Yale impact areas if not already present
    const coreAreas = [
      { id: 1, name: 'Research & Innovation', confidence: 0.9 },
      { id: 7, name: 'Healthcare & Public Health', confidence: 0.85 }
    ];
    
    for (const coreArea of coreAreas) {
      if (!yaleImpactAreas.some(area => area.id === coreArea.id)) {
        yaleImpactAreas.push(coreArea);
      }
    }
    
    // Add core Yale stakeholders if not already present
    const coreStakeholders = [
      { id: 2, name: 'Office of Research Administration', confidence: 0.9 },
      { id: 5, name: 'Yale School of Medicine', confidence: 0.85 }
    ];
    
    for (const coreStakeholder of coreStakeholders) {
      if (!yaleStakeholders.some(s => s.id === coreStakeholder.id)) {
        yaleStakeholders.push(coreStakeholder);
      }
    }
    
    return {
      ...knowledge,
      yaleImpactAreas,
      yaleStakeholders,
      confidenceScore: {
        overall: 0.85,
        impactAreasScore: 0.9,
        stakeholdersScore: 0.85,
        sourceAuthority: this.authorityScore
      }
    };
  }
}

/**
 * Enhanced NSF Source
 */
class EnhancedNSFSource extends EnhancedBaseSource {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Enhanced NSF Source',
      description: 'Enhanced adapter for NSF implementation information',
      authorityScore: 0.85, // NSF has high authority in research domain
      ...options
    });
    
    this.baseUrl = 'https://www.nsf.gov';
    this.policyUrl = options.policyUrl || 'https://www.nsf.gov/bfa/dias/policy/';
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'external_sources', 'nsf');
  }
  
  /**
   * Initialize the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing Enhanced NSF Source');
    // For now, just ensure storage directory exists
    const fs = require('fs');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }
  
  /**
   * Acquire raw data from source
   * @param {Object} options Fetch options
   * @returns {Promise<Object>} Raw source data
   * @protected
   */
  async _acquireRawData(options) {
    // Implementation would be based on the existing NSFSource.fetchOrders
    // For initial version, replicate the behavior of the original adapter
    
    // Try to find existing data
    const searchPattern = options.orderNumber ? 
      `*Executive*Order*${options.orderNumber}*.json` : 
      '*.json';
    
    try {
      const glob = require('glob');
      const fs = require('fs');
      const files = glob.sync(path.join(this.storageDir, searchPattern));
      
      if (files.length > 0) {
        // Use the most recent file
        const mostRecentFile = files.sort().pop();
        this.logger.info(`Using cached NSF data from ${path.basename(mostRecentFile)}`);
        
        const data = JSON.parse(fs.readFileSync(mostRecentFile, 'utf8'));
        return data;
      }
    } catch (error) {
      this.logger.warn(`Error finding cached NSF data: ${error.message}`);
    }
    
    // For now, return sample/mock data
    // This would be replaced with real implementation connecting to NSF
    return {
      order_number: options.orderNumber,
      title: `NSF Implementation of Executive Order ${options.orderNumber}`,
      source: 'NSF',
      summary: 'Sample NSF implementation guidance for the executive order.',
      full_text: 'Sample text from NSF about specific implementation measures for the executive order. This includes detailed procedures for grant recipients and research institutions to follow.',
      contentType: 'implementation',
      url: `${this.baseUrl}/policy/eo-${options.orderNumber}-implementation`
    };
  }
  
  /**
   * Extract structured knowledge from raw data
   * @param {Object} rawData Raw data from source
   * @returns {Promise<Object>} Extracted knowledge
   * @protected
   */
  async _extractKnowledge(rawData) {
    // For initial version, return basic structured data
    // This would be enhanced with more sophisticated extraction in a full implementation
    return {
      orderNumber: rawData.order_number,
      title: rawData.title,
      summary: rawData.summary,
      source: 'NSF',
      type: 'implementation_guidance',
      url: rawData.url,
      // Would include more extraction in actual implementation
      implementationSteps: [
        'Modified grant proposal requirements',
        'New reporting obligations',
        'Certification requirements for institutions'
      ]
    };
  }
  
  /**
   * Map extracted knowledge to Yale taxonomy
   * @param {Object} knowledge Extracted knowledge
   * @returns {Promise<Object>} Knowledge mapped to Yale taxonomy
   * @protected
   */
  async _mapToYaleTaxonomy(knowledge) {
    const baseMapping = await super._mapToYaleTaxonomy(knowledge);
    
    // NSF sources strongly relate to research, especially in STEM fields
    // Ensure these areas are represented with high confidence
    const yaleImpactAreas = baseMapping.yaleImpactAreas || [];
    const yaleStakeholders = baseMapping.yaleStakeholders || [];
    
    // Add core Yale impact areas if not already present
    const coreAreas = [
      { id: 1, name: 'Research & Innovation', confidence: 0.95 },
      { id: 2, name: 'Research Security & Export Control', confidence: 0.8 }
    ];
    
    for (const coreArea of coreAreas) {
      if (!yaleImpactAreas.some(area => area.id === coreArea.id)) {
        yaleImpactAreas.push(coreArea);
      }
    }
    
    // Add core Yale stakeholders if not already present
    const coreStakeholders = [
      { id: 2, name: 'Office of Research Administration', confidence: 0.9 },
      { id: 4, name: 'Graduate School of Arts and Sciences', confidence: 0.8 }
    ];
    
    for (const coreStakeholder of coreStakeholders) {
      if (!yaleStakeholders.some(s => s.id === coreStakeholder.id)) {
        yaleStakeholders.push(coreStakeholder);
      }
    }
    
    return {
      ...knowledge,
      yaleImpactAreas,
      yaleStakeholders,
      confidenceScore: {
        overall: 0.85,
        impactAreasScore: 0.9,
        stakeholdersScore: 0.85,
        sourceAuthority: this.authorityScore
      }
    };
  }
}

/**
 * Enhanced COGR Source
 */
class EnhancedCOGRSource extends EnhancedBaseSource {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Enhanced COGR Source',
      description: 'Enhanced adapter for COGR analysis of EO impacts on research institutions',
      authorityScore: 0.8, // COGR has good authority for university research policy
      ...options
    });
    
    this.baseUrl = 'https://www.cogr.edu';
    this.trackerUrl = options.trackerUrl || 'https://www.cogr.edu/executive-order-tracker';
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'external_sources', 'cogr');
  }
  
  /**
   * Initialize the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing Enhanced COGR Source');
    // For now, just ensure storage directory exists
    const fs = require('fs');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }
  
  /**
   * Acquire raw data from source
   * @param {Object} options Fetch options
   * @returns {Promise<Object>} Raw source data
   * @protected
   */
  async _acquireRawData(options) {
    // Implementation would be based on the existing COGRSource.fetchOrders
    // For initial version, replicate the behavior of the original adapter
    
    // Try to find existing data
    const searchPattern = options.orderNumber ? 
      `*Executive*Order*${options.orderNumber}*.json` : 
      '*.json';
    
    try {
      const glob = require('glob');
      const fs = require('fs');
      const files = glob.sync(path.join(this.storageDir, searchPattern));
      
      if (files.length > 0) {
        // Use the most recent file
        const mostRecentFile = files.sort().pop();
        this.logger.info(`Using cached COGR data from ${path.basename(mostRecentFile)}`);
        
        const data = JSON.parse(fs.readFileSync(mostRecentFile, 'utf8'));
        return data;
      }
    } catch (error) {
      this.logger.warn(`Error finding cached COGR data: ${error.message}`);
    }
    
    // For now, return sample/mock data
    // This would be replaced with real implementation connecting to COGR
    return {
      order_number: options.orderNumber,
      title: `COGR Analysis of Executive Order ${options.orderNumber}`,
      source: 'COGR',
      summary: 'Sample COGR analysis of the executive order impacts on research institutions.',
      full_text: 'Sample COGR analysis text focusing on research institution impacts and compliance strategies. Includes specific recommendations for university research administrators.',
      contentType: 'analysis',
      url: `${this.baseUrl}/executive-order-tracker/eo-${options.orderNumber}`,
      analysis_links: [
        { url: `${this.baseUrl}/sites/default/files/EO-${options.orderNumber}-Analysis.pdf`, text: 'COGR Analysis Brief' }
      ]
    };
  }
  
  /**
   * Extract structured knowledge from raw data
   * @param {Object} rawData Raw data from source
   * @returns {Promise<Object>} Extracted knowledge
   * @protected
   */
  async _extractKnowledge(rawData) {
    // For initial version, return basic structured data
    // This would be enhanced with more sophisticated extraction in a full implementation
    return {
      orderNumber: rawData.order_number,
      title: rawData.title,
      summary: rawData.summary,
      source: 'COGR',
      type: 'impact_analysis',
      url: rawData.url,
      analysisLinks: rawData.analysis_links,
      // Would include more extraction in actual implementation
      institutionalImpacts: [
        'Research administration procedures',
        'Compliance reporting requirements',
        'Financial implications for research institutions'
      ]
    };
  }
  
  /**
   * Map extracted knowledge to Yale taxonomy
   * @param {Object} knowledge Extracted knowledge
   * @returns {Promise<Object>} Knowledge mapped to Yale taxonomy
   * @protected
   */
  async _mapToYaleTaxonomy(knowledge) {
    const baseMapping = await super._mapToYaleTaxonomy(knowledge);
    
    // COGR sources focus on research compliance and administrative impacts
    // Ensure these areas are represented with high confidence
    const yaleImpactAreas = baseMapping.yaleImpactAreas || [];
    const yaleStakeholders = baseMapping.yaleStakeholders || [];
    
    // Add core Yale impact areas if not already present
    const coreAreas = [
      { id: 1, name: 'Research & Innovation', confidence: 0.9 },
      { id: 8, name: 'Financial & Operations', confidence: 0.85 },
      { id: 9, name: 'Governance & Legal', confidence: 0.8 }
    ];
    
    for (const coreArea of coreAreas) {
      if (!yaleImpactAreas.some(area => area.id === coreArea.id)) {
        yaleImpactAreas.push(coreArea);
      }
    }
    
    // Add core Yale stakeholders if not already present
    const coreStakeholders = [
      { id: 2, name: 'Office of Research Administration', confidence: 0.9 },
      { id: 10, name: 'Office of General Counsel', confidence: 0.8 }
    ];
    
    for (const coreStakeholder of coreStakeholders) {
      if (!yaleStakeholders.some(s => s.id === coreStakeholder.id)) {
        yaleStakeholders.push(coreStakeholder);
      }
    }
    
    return {
      ...knowledge,
      yaleImpactAreas,
      yaleStakeholders,
      confidenceScore: {
        overall: 0.8,
        impactAreasScore: 0.85,
        stakeholdersScore: 0.8,
        sourceAuthority: this.authorityScore
      }
    };
  }
}

/**
 * Enhanced ACE Source
 */
class EnhancedACESource extends EnhancedBaseSource {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Enhanced ACE Source',
      description: 'Enhanced adapter for ACE higher education policy analyses',
      authorityScore: 0.75, // ACE has good authority for higher education policy
      ...options
    });
    
    this.baseUrl = 'https://www.acenet.edu';
    this.policyUrl = options.policyUrl || 'https://www.acenet.edu/Policy-Advocacy/Pages/default.aspx';
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'external_sources', 'ace');
  }
  
  /**
   * Initialize the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing Enhanced ACE Source');
    // For now, just ensure storage directory exists
    const fs = require('fs');
    fs.mkdirSync(this.storageDir, { recursive: true });
  }
  
  /**
   * Acquire raw data from source
   * @param {Object} options Fetch options
   * @returns {Promise<Object>} Raw source data
   * @protected
   */
  async _acquireRawData(options) {
    // Implementation would be based on the existing ACESource.fetchOrders
    // For initial version, replicate the behavior of the original adapter
    
    // Try to find existing data
    const searchPattern = options.orderNumber ? 
      `*Executive*Order*${options.orderNumber}*.json` : 
      '*.json';
    
    try {
      const glob = require('glob');
      const fs = require('fs');
      const files = glob.sync(path.join(this.storageDir, searchPattern));
      
      if (files.length > 0) {
        // Use the most recent file
        const mostRecentFile = files.sort().pop();
        this.logger.info(`Using cached ACE data from ${path.basename(mostRecentFile)}`);
        
        const data = JSON.parse(fs.readFileSync(mostRecentFile, 'utf8'));
        return data;
      }
    } catch (error) {
      this.logger.warn(`Error finding cached ACE data: ${error.message}`);
    }
    
    // For now, return sample/mock data
    // This would be replaced with real implementation connecting to ACE
    return {
      order_number: options.orderNumber,
      title: `ACE Analysis of Executive Order ${options.orderNumber}`,
      source: 'ACE',
      summary: 'Sample ACE analysis of the executive order impacts on higher education institutions.',
      full_text: 'Sample ACE analysis text focusing on higher education policy implications. Provides guidance on institutional policy considerations and implementation strategies.',
      contentType: 'analysis',
      url: `${this.baseUrl}/Policy-Advocacy/Pages/executive-order-${options.orderNumber}.aspx`
    };
  }
  
  /**
   * Extract structured knowledge from raw data
   * @param {Object} rawData Raw data from source
   * @returns {Promise<Object>} Extracted knowledge
   * @protected
   */
  async _extractKnowledge(rawData) {
    // For initial version, return basic structured data
    // This would be enhanced with more sophisticated extraction in a full implementation
    return {
      orderNumber: rawData.order_number,
      title: rawData.title,
      summary: rawData.summary,
      source: 'ACE',
      type: 'policy_analysis',
      url: rawData.url,
      // Would include more extraction in actual implementation
      higherEdConsiderations: [
        'Institutional policy implications',
        'Student and faculty impacts',
        'Academic program considerations'
      ]
    };
  }
  
  /**
   * Map extracted knowledge to Yale taxonomy
   * @param {Object} knowledge Extracted knowledge
   * @returns {Promise<Object>} Knowledge mapped to Yale taxonomy
   * @protected
   */
  async _mapToYaleTaxonomy(knowledge) {
    const baseMapping = await super._mapToYaleTaxonomy(knowledge);
    
    // ACE sources focus on higher education policy and institutional governance
    // Ensure these areas are represented with high confidence
    const yaleImpactAreas = baseMapping.yaleImpactAreas || [];
    const yaleStakeholders = baseMapping.yaleStakeholders || [];
    
    // Add core Yale impact areas if not already present
    const coreAreas = [
      { id: 10, name: 'Academic Programs', confidence: 0.9 },
      { id: 9, name: 'Governance & Legal', confidence: 0.85 },
      { id: 3, name: 'International & Immigration', confidence: 0.75 }
    ];
    
    for (const coreArea of coreAreas) {
      if (!yaleImpactAreas.some(area => area.id === coreArea.id)) {
        yaleImpactAreas.push(coreArea);
      }
    }
    
    // Add core Yale stakeholders if not already present
    const coreStakeholders = [
      { id: 1, name: 'Provost\'s Office', confidence: 0.9 },
      { id: 10, name: 'Office of General Counsel', confidence: 0.85 }
    ];
    
    for (const coreStakeholder of coreStakeholders) {
      if (!yaleStakeholders.some(s => s.id === coreStakeholder.id)) {
        yaleStakeholders.push(coreStakeholder);
      }
    }
    
    return {
      ...knowledge,
      yaleImpactAreas,
      yaleStakeholders,
      confidenceScore: {
        overall: 0.8,
        impactAreasScore: 0.85,
        stakeholdersScore: 0.8,
        sourceAuthority: this.authorityScore
      }
    };
  }
}

module.exports = {
  EnhancedSourceIntegration,
  EnhancedNIHSource,
  EnhancedNSFSource,
  EnhancedCOGRSource,
  EnhancedACESource
};