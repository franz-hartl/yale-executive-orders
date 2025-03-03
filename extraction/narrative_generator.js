/**
 * narrative_generator.js
 * 
 * Transforms extracted knowledge into narrative formats for various audiences.
 * This module is responsible for generating human-readable content from 
 * structured knowledge, with a focus on Yale-specific context.
 */

const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Narrative Generator class for transforming knowledge into readable narratives
 */
class NarrativeGenerator {
  /**
   * Constructor for NarrativeGenerator
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.logger = options.logger || logger.createNamedLogger('NarrativeGenerator');
    
    // Initialize template registry
    this.templateRegistry = new TemplateRegistry(options);
    
    // Initialize formatter
    this.formatter = new NarrativeFormatter(options);
    
    // Templates directory
    this.templatesDir = options.templatesDir || path.join(__dirname, '..', 'templates');
    
    // Configuration
    this.options = {
      defaultTemplates: ['executiveSummary', 'yaleBrief', 'implementationChecklist'],
      includeSourceAttribution: true,
      confidenceThreshold: 0.6,
      ...options
    };
  }
  
  /**
   * Generate all narratives from knowledge
   * @param {Object} knowledge Extracted knowledge
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Generated narratives by template name
   */
  async generateAllNarratives(knowledge, options = {}) {
    this.logger.info('Generating narratives from extracted knowledge');
    
    const narrativeResults = {};
    const narrativePromises = [];
    
    // Get requested templates
    const templates = options.templates || this.options.defaultTemplates;
    
    // Generate each requested narrative concurrently
    for (const templateName of templates) {
      narrativePromises.push(
        this.generateNarrative(templateName, knowledge, options)
          .then(result => {
            narrativeResults[templateName] = result;
          })
          .catch(error => {
            this.logger.error(`Error generating ${templateName} narrative: ${error.message}`);
            narrativeResults[templateName] = { 
              error: error.message,
              success: false 
            };
          })
      );
    }
    
    // Wait for all generators to complete
    await Promise.all(narrativePromises);
    
    return narrativeResults;
  }
  
  /**
   * Generate a specific narrative
   * @param {string} templateName Template name
   * @param {Object} knowledge Extracted knowledge
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Generated narrative
   */
  async generateNarrative(templateName, knowledge, options = {}) {
    try {
      // Get the template
      const template = this.templateRegistry.getTemplate(templateName);
      
      if (!template) {
        throw new Error(`Template not found: ${templateName}`);
      }
      
      this.logger.debug(`Generating ${templateName} narrative`);
      
      // Apply the template to the knowledge
      const narrativeData = await template.generate(knowledge, options);
      
      // Format the narrative
      const formattedNarrative = this.formatter.format(narrativeData, templateName, options);
      
      return {
        success: true,
        templateName,
        generationDate: new Date().toISOString(),
        narrative: formattedNarrative,
        metadata: {
          knowledgeItemsUsed: this._countKnowledgeItems(knowledge),
          templateVersion: template.version,
          confidenceScore: template.calculateConfidence(knowledge)
        }
      };
    } catch (error) {
      this.logger.error(`Narrative generation error (${templateName}): ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Count knowledge items used in generation
   * @param {Object} knowledge Knowledge object
   * @returns {Object} Counts by type
   * @private
   */
  _countKnowledgeItems(knowledge) {
    return Object.keys(knowledge)
      .filter(key => Array.isArray(knowledge[key]))
      .reduce((counts, key) => {
        counts[key] = knowledge[key].length;
        return counts;
      }, {});
  }
}

/**
 * Registry for narrative templates
 */
class TemplateRegistry {
  /**
   * Constructor for TemplateRegistry
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.templates = new Map();
    this.logger = options.logger || logger.createNamedLogger('TemplateRegistry');
    
    // Register built-in templates
    this.registerTemplate('executiveSummary', new ExecutiveSummaryTemplate());
    this.registerTemplate('detailedAnalysis', new DetailedAnalysisTemplate());
    this.registerTemplate('implementationChecklist', new ImplementationChecklistTemplate());
    this.registerTemplate('yaleBrief', new YaleBriefTemplate());
    this.registerTemplate('regulatoryGuide', new RegulatoryGuideTemplate());
  }
  
  /**
   * Register a template
   * @param {string} name Template name
   * @param {BaseTemplate} template Template instance
   */
  registerTemplate(name, template) {
    this.templates.set(name, template);
    this.logger.debug(`Registered template: ${name}`);
  }
  
  /**
   * Get a template by name
   * @param {string} name Template name
   * @returns {BaseTemplate|null} Template instance or null if not found
   */
  getTemplate(name) {
    return this.templates.get(name);
  }
  
  /**
   * Get all template names
   * @returns {Array<string>} Array of template names
   */
  getAllTemplateNames() {
    return Array.from(this.templates.keys());
  }
}

/**
 * Base class for narrative templates
 */
class BaseTemplate {
  /**
   * Constructor for BaseTemplate
   */
  constructor() {
    this.name = 'BaseTemplate';
    this.version = '1.0.0';
    this.description = 'Base template for narratives';
  }
  
  /**
   * Generate a narrative from knowledge
   * @param {Object} knowledge Extracted knowledge
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Narrative data
   */
  async generate(knowledge, options) {
    throw new Error('Must be implemented by subclass');
  }
  
  /**
   * Calculate confidence in the generated narrative
   * @param {Object} knowledge Extracted knowledge
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(knowledge) {
    // Default implementation
    return 0.5;
  }
  
  /**
   * Build attribution footer for narratives
   * @param {Object} knowledge Knowledge used to generate the narrative
   * @param {Object} options Generation options
   * @returns {Object} Attribution footer data
   * @protected
   */
  _buildAttributionFooter(knowledge, options = {}) {
    const sources = new Set();
    
    // Collect all sources
    if (knowledge.sourceId && knowledge.sourceName) {
      sources.add({
        id: knowledge.sourceId,
        name: knowledge.sourceName
      });
    }
    
    if (Array.isArray(knowledge.sources)) {
      for (const source of knowledge.sources) {
        sources.add({
          id: source.id,
          name: source.name
        });
      }
    }
    
    // Format source names
    const sourceNames = Array.from(sources).map(s => s.name);
    
    return {
      attribution: `Based on analysis of content from: ${sourceNames.join(', ')}`,
      generatedDate: new Date().toISOString(),
      confidence: this.calculateConfidence(knowledge),
      disclaimer: options.disclaimer || 'This narrative is an AI-generated interpretation and should be verified by qualified personnel.'
    };
  }
}

/**
 * Executive Summary Template
 */
class ExecutiveSummaryTemplate extends BaseTemplate {
  /**
   * Constructor for ExecutiveSummaryTemplate
   */
  constructor() {
    super();
    this.name = 'ExecutiveSummaryTemplate';
    this.version = '1.0.0';
    this.description = 'Executive summary of an executive order';
  }
  
  /**
   * Generate an executive summary
   * @param {Object} knowledge Extracted knowledge
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Executive summary data
   */
  async generate(knowledge, options = {}) {
    // Build the narrative structure for executive summary
    const narrative = {
      title: `Executive Summary: ${knowledge.title || 'Executive Order Analysis'}`,
      orderNumber: knowledge.orderNumber,
      sections: []
    };
    
    // Add summary section
    narrative.sections.push({
      type: 'summary',
      title: 'Overview',
      content: this._generateOverview(knowledge)
    });
    
    // Add key requirements section
    narrative.sections.push({
      type: 'requirements',
      title: 'Key Requirements',
      content: this._generateKeyRequirements(knowledge)
    });
    
    // Add key dates section if we have dates
    if (knowledge.dates && knowledge.dates.length > 0) {
      narrative.sections.push({
        type: 'dates',
        title: 'Key Dates',
        content: this._generateKeyDates(knowledge)
      });
    }
    
    // Add impacts section
    narrative.sections.push({
      type: 'impacts',
      title: 'Primary Impacts',
      content: this._generatePrimaryImpacts(knowledge)
    });
    
    // Add attribution footer
    narrative.footer = this._buildAttributionFooter(knowledge, options);
    
    return narrative;
  }
  
  /**
   * Generate overview section
   * @param {Object} knowledge Extracted knowledge
   * @returns {string} Overview text
   * @private
   */
  _generateOverview(knowledge) {
    // In a full implementation, this would generate a cohesive summary
    // For this skeleton, we'll compose a simple overview
    
    const orderNumber = knowledge.orderNumber;
    const title = knowledge.title || `Executive Order ${orderNumber}`;
    
    return `Executive Order ${orderNumber}, "${title}", introduces a set of requirements and policy changes that may impact organization operations and compliance obligations. This summary highlights the key points most relevant for executive decision-making.`;
  }
  
  /**
   * Generate key requirements section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Key requirements
   * @private
   */
  _generateKeyRequirements(knowledge) {
    const requirements = knowledge.requirements || [];
    
    // Sort by priority and confidence
    const sortedRequirements = [...requirements].sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
      
      if (priorityDiff !== 0) return priorityDiff;
      return (b.confidence || 0) - (a.confidence || 0);
    });
    
    // Return the top requirements (up to 5)
    return sortedRequirements.slice(0, 5).map(req => ({
      description: req.description,
      priority: req.priority,
      deadline: req.deadline,
      confidence: req.confidence
    }));
  }
  
  /**
   * Generate key dates section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Key dates
   * @private
   */
  _generateKeyDates(knowledge) {
    const dates = knowledge.dates || [];
    
    // Sort by date
    const sortedDates = [...dates].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
    
    // Return formatted dates
    return sortedDates.map(date => ({
      date: date.date,
      type: date.dateType,
      description: date.description
    }));
  }
  
  /**
   * Generate primary impacts section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Primary impacts
   * @private
   */
  _generatePrimaryImpacts(knowledge) {
    const impacts = knowledge.impacts || [];
    
    // Sort by severity
    const sortedImpacts = [...impacts].sort((a, b) => {
      const severityMap = { high: 3, medium: 2, low: 1 };
      return (severityMap[b.severity] || 0) - (severityMap[a.severity] || 0);
    });
    
    // Return the top impacts (up to 5)
    return sortedImpacts.slice(0, 5).map(impact => ({
      description: impact.description,
      severity: impact.severity,
      type: impact.impactType,
      timeframe: impact.timeframe
    }));
  }
  
  /**
   * Calculate confidence in the generated narrative
   * @param {Object} knowledge Extracted knowledge
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(knowledge) {
    // Calculate based on available knowledge
    let score = 0.5; // Base score
    
    // Adjust based on requirements
    const requirements = knowledge.requirements || [];
    if (requirements.length >= 5) {
      score += 0.1;
    } else if (requirements.length > 0) {
      score += 0.05;
    }
    
    // Adjust based on impacts
    const impacts = knowledge.impacts || [];
    if (impacts.length >= 5) {
      score += 0.1;
    } else if (impacts.length > 0) {
      score += 0.05;
    }
    
    // Adjust based on dates
    const dates = knowledge.dates || [];
    if (dates.length > 0) {
      score += 0.05;
    }
    
    // Cap at 0.95
    return Math.min(0.95, score);
  }
}

/**
 * Detailed Analysis Template
 */
class DetailedAnalysisTemplate extends BaseTemplate {
  /**
   * Constructor for DetailedAnalysisTemplate
   */
  constructor() {
    super();
    this.name = 'DetailedAnalysisTemplate';
    this.version = '1.0.0';
    this.description = 'Detailed analysis of an executive order';
  }
  
  /**
   * Generate a detailed analysis
   * @param {Object} knowledge Extracted knowledge
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Detailed analysis data
   */
  async generate(knowledge, options = {}) {
    // Build the narrative structure for detailed analysis
    const narrative = {
      title: `Detailed Analysis: ${knowledge.title || 'Executive Order Analysis'}`,
      orderNumber: knowledge.orderNumber,
      sections: []
    };
    
    // Add introduction section
    narrative.sections.push({
      type: 'introduction',
      title: 'Introduction',
      content: this._generateIntroduction(knowledge)
    });
    
    // Add context and authority section
    narrative.sections.push({
      type: 'context',
      title: 'Context and Authority',
      content: this._generateContextAndAuthority(knowledge)
    });
    
    // Add key provisions section
    narrative.sections.push({
      type: 'provisions',
      title: 'Key Provisions',
      content: this._generateKeyProvisions(knowledge)
    });
    
    // Add requirements analysis section
    narrative.sections.push({
      type: 'requirements-analysis',
      title: 'Requirements Analysis',
      content: this._generateRequirementsAnalysis(knowledge)
    });
    
    // Add impact assessment section
    narrative.sections.push({
      type: 'impact-assessment',
      title: 'Impact Assessment',
      content: this._generateImpactAssessment(knowledge)
    });
    
    // Add implementation timeline
    narrative.sections.push({
      type: 'timeline',
      title: 'Implementation Timeline',
      content: this._generateImplementationTimeline(knowledge)
    });
    
    // Add conclusion section
    narrative.sections.push({
      type: 'conclusion',
      title: 'Conclusion',
      content: this._generateConclusion(knowledge)
    });
    
    // Add attribution footer
    narrative.footer = this._buildAttributionFooter(knowledge, options);
    
    return narrative;
  }
  
  // Implementation of each section generator method would go here...
  
  /**
   * Generate introduction section
   * @param {Object} knowledge Extracted knowledge
   * @returns {string} Introduction text
   * @private
   */
  _generateIntroduction(knowledge) {
    return `This analysis examines Executive Order ${knowledge.orderNumber}, "${knowledge.title}", and its implications. The executive order addresses key policy areas and establishes new requirements that merit careful consideration from organizational leadership.`;
  }
  
  /**
   * Generate context and authority section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Object} Context and authority data
   * @private
   */
  _generateContextAndAuthority(knowledge) {
    const authorities = knowledge.authorities || [];
    
    return {
      text: "This executive order draws authority from the following sources and should be understood in the context of existing regulatory frameworks.",
      authorities: authorities.map(auth => ({
        citation: auth.citation,
        description: auth.description,
        type: auth.authorityType
      }))
    };
  }
  
  /**
   * Generate key provisions section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Key provisions
   * @private
   */
  _generateKeyProvisions(knowledge) {
    // This would be implemented to extract and format key provisions
    // For now, just returning a placeholder
    return [
      "The executive order establishes new compliance requirements for organizations.",
      "It creates reporting obligations to specified government agencies.",
      "It establishes deadlines for implementation of various provisions.",
      "It may impact existing operational processes and procedures."
    ];
  }
  
  /**
   * Generate requirements analysis section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Requirements analysis
   * @private
   */
  _generateRequirementsAnalysis(knowledge) {
    const requirements = knowledge.requirements || [];
    
    // Group by type
    const requirementsByType = requirements.reduce((groups, req) => {
      const type = req.requirementType || 'general';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(req);
      return groups;
    }, {});
    
    // Format each group
    return Object.entries(requirementsByType).map(([type, reqs]) => ({
      type,
      title: this._formatRequirementType(type),
      requirements: reqs.map(req => ({
        description: req.description,
        priority: req.priority,
        deadline: req.deadline,
        targetEntities: req.targetEntities,
        isConditional: req.isConditional,
        condition: req.condition
      }))
    }));
  }
  
  /**
   * Format requirement type for display
   * @param {string} type Requirement type
   * @returns {string} Formatted type
   * @private
   */
  _formatRequirementType(type) {
    const mapping = {
      'agency_action': 'Agency Actions',
      'reporting': 'Reporting Requirements',
      'compliance': 'Compliance Requirements',
      'prohibition': 'Prohibitions',
      'deadline': 'Deadlines',
      'general': 'General Requirements'
    };
    
    return mapping[type] || type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  }
  
  /**
   * Generate impact assessment section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Object} Impact assessment data
   * @private
   */
  _generateImpactAssessment(knowledge) {
    const impacts = knowledge.impacts || [];
    
    // Group by type
    const impactsByType = impacts.reduce((groups, impact) => {
      const type = impact.impactType || 'general';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(impact);
      return groups;
    }, {});
    
    return {
      summary: "The executive order has several important impacts that organizations should assess carefully.",
      impactsByType: Object.entries(impactsByType).map(([type, typeImpacts]) => ({
        type,
        title: this._formatImpactType(type),
        impacts: typeImpacts.map(impact => ({
          description: impact.description,
          severity: impact.severity,
          timeframe: impact.timeframe,
          affectedEntities: impact.affectedEntities
        }))
      }))
    };
  }
  
  /**
   * Format impact type for display
   * @param {string} type Impact type
   * @returns {string} Formatted type
   * @private
   */
  _formatImpactType(type) {
    const mapping = {
      'financial': 'Financial Impacts',
      'operational': 'Operational Impacts',
      'compliance': 'Compliance Impacts',
      'security': 'Security Impacts',
      'general': 'General Impacts'
    };
    
    return mapping[type] || type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  }
  
  /**
   * Generate implementation timeline
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Implementation timeline
   * @private
   */
  _generateImplementationTimeline(knowledge) {
    const dates = knowledge.dates || [];
    
    // Sort by date
    const sortedDates = [...dates].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
    
    return sortedDates.map(date => ({
      date: date.date,
      type: date.dateType,
      description: date.description,
      label: this._formatDateLabel(date)
    }));
  }
  
  /**
   * Format date label for display
   * @param {Object} date Date object
   * @returns {string} Formatted label
   * @private
   */
  _formatDateLabel(date) {
    if (!date.date) return 'TBD';
    
    const dateObj = new Date(date.date);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
  }
  
  /**
   * Generate conclusion section
   * @param {Object} knowledge Extracted knowledge
   * @returns {string} Conclusion text
   * @private
   */
  _generateConclusion(knowledge) {
    return `Executive Order ${knowledge.orderNumber} represents significant policy direction that will require careful attention and proactive compliance planning. Organizations should review the detailed requirements and develop a comprehensive implementation strategy to address all aspects of this order.`;
  }
  
  /**
   * Calculate confidence in the generated narrative
   * @param {Object} knowledge Extracted knowledge
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(knowledge) {
    // Calculate based on comprehensive knowledge coverage
    let score = 0.5; // Base score
    
    // Check for each knowledge type
    const knowledgeTypes = ['requirements', 'impacts', 'dates', 'authorities', 'entities', 'definitions'];
    let presentTypes = 0;
    
    for (const type of knowledgeTypes) {
      if (knowledge[type] && knowledge[type].length > 0) {
        presentTypes++;
      }
    }
    
    // Adjust score based on knowledge coverage
    score += (presentTypes / knowledgeTypes.length) * 0.4;
    
    // Cap at 0.95
    return Math.min(0.95, score);
  }
}

/**
 * Implementation Checklist Template
 */
class ImplementationChecklistTemplate extends BaseTemplate {
  /**
   * Constructor for ImplementationChecklistTemplate
   */
  constructor() {
    super();
    this.name = 'ImplementationChecklistTemplate';
    this.version = '1.0.0';
    this.description = 'Implementation checklist for an executive order';
  }
  
  /**
   * Generate an implementation checklist
   * @param {Object} knowledge Extracted knowledge
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Implementation checklist data
   */
  async generate(knowledge, options = {}) {
    // Build the narrative structure for implementation checklist
    const narrative = {
      title: `Implementation Checklist: ${knowledge.title || 'Executive Order Analysis'}`,
      orderNumber: knowledge.orderNumber,
      sections: []
    };
    
    // Add introduction section
    narrative.sections.push({
      type: 'introduction',
      title: 'Introduction',
      content: this._generateIntroduction(knowledge)
    });
    
    // Add initial actions section
    narrative.sections.push({
      type: 'initial-actions',
      title: 'Initial Actions',
      content: this._generateInitialActions(knowledge)
    });
    
    // Add compliance requirements section
    narrative.sections.push({
      type: 'compliance-requirements',
      title: 'Compliance Requirements',
      content: this._generateComplianceRequirements(knowledge)
    });
    
    // Add timeline section
    narrative.sections.push({
      type: 'timeline',
      title: 'Implementation Timeline',
      content: this._generateImplementationTimeline(knowledge)
    });
    
    // Add resource requirements section
    narrative.sections.push({
      type: 'resource-requirements',
      title: 'Resource Requirements',
      content: this._generateResourceRequirements(knowledge)
    });
    
    // Add monitoring and reporting section
    narrative.sections.push({
      type: 'monitoring',
      title: 'Monitoring and Reporting',
      content: this._generateMonitoringRequirements(knowledge)
    });
    
    // Add attribution footer
    narrative.footer = this._buildAttributionFooter(knowledge, options);
    
    return narrative;
  }
  
  /**
   * Generate introduction section
   * @param {Object} knowledge Extracted knowledge
   * @returns {string} Introduction text
   * @private
   */
  _generateIntroduction(knowledge) {
    return `This checklist provides a structured approach to implementing the requirements of Executive Order ${knowledge.orderNumber}. Use this document to track progress and ensure comprehensive compliance with all provisions of the order.`;
  }
  
  // Implementation of each section generator method would go here...
  
  /**
   * Generate initial actions section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Initial actions
   * @private
   */
  _generateInitialActions(knowledge) {
    // This would be implemented to extract and format initial actions
    return [
      { action: "Review the full text of the executive order", status: "Not Started" },
      { action: "Identify key stakeholders for implementation", status: "Not Started" },
      { action: "Establish an implementation team", status: "Not Started" },
      { action: "Develop an implementation timeline", status: "Not Started" },
      { action: "Conduct a preliminary impact assessment", status: "Not Started" }
    ];
  }
  
  /**
   * Generate compliance requirements section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Compliance requirements
   * @private
   */
  _generateComplianceRequirements(knowledge) {
    const requirements = knowledge.requirements || [];
    
    // Sort by priority
    const sortedRequirements = [...requirements].sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
    });
    
    return sortedRequirements.map(req => ({
      requirement: req.description,
      priority: req.priority,
      deadline: req.deadline,
      status: "Not Started",
      assignedTo: "",
      notes: ""
    }));
  }
  
  /**
   * Generate implementation timeline
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Implementation timeline
   * @private
   */
  _generateImplementationTimeline(knowledge) {
    const dates = knowledge.dates || [];
    
    // Sort by date
    const sortedDates = [...dates].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });
    
    return sortedDates.map(date => ({
      date: date.date,
      milestone: date.description || `${this._formatDateLabel(date)} - ${date.dateType || 'Deadline'}`,
      status: "Not Started"
    }));
  }
  
  /**
   * Generate resource requirements section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Object} Resource requirements
   * @private
   */
  _generateResourceRequirements(knowledge) {
    // This would be implemented to identify resources needed
    return {
      personnel: [
        { role: "Program Manager", responsibility: "Overall implementation coordination" },
        { role: "Compliance Officer", responsibility: "Ensure regulatory requirements are met" },
        { role: "Legal Counsel", responsibility: "Legal interpretation and guidance" }
      ],
      systems: [
        { name: "Compliance Tracking System", purpose: "Monitor implementation progress" },
        { name: "Reporting System", purpose: "Generate required reports" }
      ],
      budget: [
        { item: "Staff time", estimate: "TBD" },
        { item: "System modifications", estimate: "TBD" },
        { item: "Training", estimate: "TBD" }
      ]
    };
  }
  
  /**
   * Generate monitoring requirements section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Monitoring requirements
   * @private
   */
  _generateMonitoringRequirements(knowledge) {
    // This would be implemented to identify monitoring needs
    return [
      { activity: "Weekly progress review meetings", frequency: "Weekly", responsible: "Program Manager" },
      { activity: "Monthly compliance status reports", frequency: "Monthly", responsible: "Compliance Officer" },
      { activity: "Quarterly executive briefings", frequency: "Quarterly", responsible: "Program Manager" }
    ];
  }
  
  /**
   * Format date label for display
   * @param {Object} date Date object
   * @returns {string} Formatted label
   * @private
   */
  _formatDateLabel(date) {
    if (!date.date) return 'TBD';
    
    const dateObj = new Date(date.date);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
  }
  
  /**
   * Calculate confidence in the generated narrative
   * @param {Object} knowledge Extracted knowledge
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(knowledge) {
    // Calculate based on availability of requirements and dates
    let score = 0.5; // Base score
    
    // Check requirements
    const requirements = knowledge.requirements || [];
    if (requirements.length >= 10) {
      score += 0.25;
    } else if (requirements.length >= 5) {
      score += 0.15;
    } else if (requirements.length > 0) {
      score += 0.05;
    }
    
    // Check dates
    const dates = knowledge.dates || [];
    if (dates.length >= 5) {
      score += 0.15;
    } else if (dates.length > 0) {
      score += 0.05;
    }
    
    // Cap at 0.9 - implementation checklists need review
    return Math.min(0.9, score);
  }
}

/**
 * Yale Brief Template
 */
class YaleBriefTemplate extends BaseTemplate {
  /**
   * Constructor for YaleBriefTemplate
   */
  constructor() {
    super();
    this.name = 'YaleBriefTemplate';
    this.version = '1.0.0';
    this.description = 'Yale-specific executive brief';
  }
  
  /**
   * Generate a Yale-specific brief
   * @param {Object} knowledge Extracted knowledge
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Yale brief data
   */
  async generate(knowledge, options = {}) {
    // Build the narrative structure for Yale brief
    const narrative = {
      title: `Yale Brief: ${knowledge.title || 'Executive Order Analysis'}`,
      orderNumber: knowledge.orderNumber,
      sections: []
    };
    
    // Add executive summary section
    narrative.sections.push({
      type: 'summary',
      title: 'Executive Summary',
      content: this._generateSummary(knowledge)
    });
    
    // Add Yale impact section
    narrative.sections.push({
      type: 'yale-impact',
      title: 'Yale-Specific Impacts',
      content: this._generateYaleImpacts(knowledge)
    });
    
    // Add stakeholder guidance section
    narrative.sections.push({
      type: 'stakeholder-guidance',
      title: 'Stakeholder Guidance',
      content: this._generateStakeholderGuidance(knowledge)
    });
    
    // Add key requirements section
    narrative.sections.push({
      type: 'requirements',
      title: 'Key Requirements',
      content: this._generateKeyRequirements(knowledge)
    });
    
    // Add recommended actions section
    narrative.sections.push({
      type: 'actions',
      title: 'Recommended Actions',
      content: this._generateRecommendedActions(knowledge)
    });
    
    // Add attribution footer
    narrative.footer = this._buildAttributionFooter(knowledge, options);
    
    return narrative;
  }
  
  /**
   * Generate summary section
   * @param {Object} knowledge Extracted knowledge
   * @returns {string} Summary text
   * @private
   */
  _generateSummary(knowledge) {
    return `Executive Order ${knowledge.orderNumber} introduces significant changes that affect university operations. This brief summarizes the key impacts specific to Yale University, highlighting areas requiring immediate attention and providing guidance for affected stakeholders.`;
  }
  
  /**
   * Generate Yale impacts section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Yale impacts
   * @private
   */
  _generateYaleImpacts(knowledge) {
    const yaleImpactAreas = knowledge.yaleImpactAreas || [];
    const impacts = knowledge.impacts || [];
    
    // For each impact area, find related impacts
    return yaleImpactAreas.map(area => {
      // For a real implementation, this would use more sophisticated matching
      // Here we're doing a simple string matching for demonstration
      const areaKeywords = area.name.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      
      const relatedImpacts = impacts.filter(impact => {
        const description = impact.description?.toLowerCase() || '';
        return areaKeywords.some(keyword => description.includes(keyword));
      });
      
      return {
        areaId: area.id,
        areaName: area.name,
        confidence: area.confidence,
        description: `Impact on ${area.name}`,
        impacts: relatedImpacts.map(impact => ({
          description: impact.description,
          severity: impact.severity,
          timeframe: impact.timeframe
        }))
      };
    });
  }
  
  /**
   * Generate stakeholder guidance section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Stakeholder guidance
   * @private
   */
  _generateStakeholderGuidance(knowledge) {
    const yaleStakeholders = knowledge.yaleStakeholders || [];
    
    return yaleStakeholders.map(stakeholder => {
      // Generate guidance specific to each stakeholder
      const guidance = this._generateGuidanceForStakeholder(stakeholder, knowledge);
      
      return {
        stakeholderId: stakeholder.id,
        stakeholderName: stakeholder.name,
        confidence: stakeholder.confidence,
        guidance
      };
    });
  }
  
  /**
   * Generate guidance for a specific stakeholder
   * @param {Object} stakeholder Stakeholder object
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Guidance items
   * @private
   */
  _generateGuidanceForStakeholder(stakeholder, knowledge) {
    // In a full implementation, this would generate customized guidance
    // Here we're providing generic guidance
    
    // Basic guidance items for all stakeholders
    const guidance = [
      "Review the executive order to understand specific requirements",
      "Identify affected processes and systems",
      "Develop a compliance plan with timelines"
    ];
    
    // Add stakeholder-specific guidance based on name
    if (stakeholder.name.includes('Research')) {
      guidance.push(
        "Review all active research grants and contracts for compliance",
        "Update research compliance procedures as needed"
      );
    } else if (stakeholder.name.includes('Legal') || stakeholder.name.includes('Counsel')) {
      guidance.push(
        "Conduct legal analysis of compliance requirements",
        "Develop interpretation guidance for university departments"
      );
    } else if (stakeholder.name.includes('Provost')) {
      guidance.push(
        "Coordinate university-wide implementation strategy",
        "Ensure resource allocation for compliance activities"
      );
    }
    
    return guidance;
  }
  
  /**
   * Generate key requirements section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Key requirements
   * @private
   */
  _generateKeyRequirements(knowledge) {
    const requirements = knowledge.requirements || [];
    
    // Sort by priority
    const sortedRequirements = [...requirements].sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
    });
    
    // Return the top requirements (up to 5)
    return sortedRequirements.slice(0, 5).map(req => ({
      description: req.description,
      priority: req.priority,
      deadline: req.deadline,
      yaleSpecificNotes: this._generateYaleSpecificNotes(req)
    }));
  }
  
  /**
   * Generate Yale-specific notes for a requirement
   * @param {Object} requirement Requirement object
   * @returns {string} Yale-specific notes
   * @private
   */
  _generateYaleSpecificNotes(requirement) {
    // In a full implementation, this would generate customized notes
    return "Review existing Yale policies to ensure alignment with this requirement.";
  }
  
  /**
   * Generate recommended actions section
   * @param {Object} knowledge Extracted knowledge
   * @returns {Array} Recommended actions
   * @private
   */
  _generateRecommendedActions(knowledge) {
    // This would generate Yale-specific recommended actions
    return [
      {
        description: "Form a Yale working group with key stakeholders",
        priority: "high",
        timeline: "Immediate",
        assignedTo: "Provost's Office"
      },
      {
        description: "Conduct a comprehensive impact analysis for Yale",
        priority: "high",
        timeline: "Within 2 weeks",
        assignedTo: "Office of General Counsel"
      },
      {
        description: "Develop Yale-specific implementation strategy",
        priority: "medium",
        timeline: "Within 1 month",
        assignedTo: "Affected department heads"
      },
      {
        description: "Schedule compliance training for affected staff",
        priority: "medium",
        timeline: "Within 2 months",
        assignedTo: "Human Resources"
      }
    ];
  }
  
  /**
   * Calculate confidence in the generated narrative
   * @param {Object} knowledge Extracted knowledge
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(knowledge) {
    // Calculate based on Yale-specific information
    let score = 0.5; // Base score
    
    // Check Yale impact areas
    const yaleImpactAreas = knowledge.yaleImpactAreas || [];
    if (yaleImpactAreas.length >= 3) {
      score += 0.2;
    } else if (yaleImpactAreas.length > 0) {
      score += 0.1;
    }
    
    // Check Yale stakeholders
    const yaleStakeholders = knowledge.yaleStakeholders || [];
    if (yaleStakeholders.length >= 3) {
      score += 0.2;
    } else if (yaleStakeholders.length > 0) {
      score += 0.1;
    }
    
    // Adjust based on general knowledge
    const requirements = knowledge.requirements || [];
    if (requirements.length > 0) {
      score += 0.05;
    }
    
    // Cap at 0.95
    return Math.min(0.95, score);
  }
}

/**
 * Regulatory Guide Template
 */
class RegulatoryGuideTemplate extends BaseTemplate {
  /**
   * Constructor for RegulatoryGuideTemplate
   */
  constructor() {
    super();
    this.name = 'RegulatoryGuideTemplate';
    this.version = '1.0.0';
    this.description = 'Regulatory guide for an executive order';
  }
  
  /**
   * Generate a regulatory guide
   * @param {Object} knowledge Extracted knowledge
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Regulatory guide data
   */
  async generate(knowledge, options = {}) {
    // Build the narrative structure for regulatory guide
    const narrative = {
      title: `Regulatory Guide: ${knowledge.title || 'Executive Order Analysis'}`,
      orderNumber: knowledge.orderNumber,
      sections: []
    };
    
    // Add sections...
    // Implementation would be similar to other templates
    
    // Add attribution footer
    narrative.footer = this._buildAttributionFooter(knowledge, options);
    
    return narrative;
  }
  
  /**
   * Calculate confidence in the generated narrative
   * @param {Object} knowledge Extracted knowledge
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(knowledge) {
    // Calculate based on available knowledge
    return 0.7; // Default score for now
  }
}

/**
 * Formatter for narratives
 */
class NarrativeFormatter {
  /**
   * Constructor for NarrativeFormatter
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.options = {
      defaultFormat: 'html',
      stylesheets: {
        html: options.htmlStylesheet || null
      },
      ...options
    };
  }
  
  /**
   * Format a narrative
   * @param {Object} narrativeData Narrative data
   * @param {string} templateName Template name
   * @param {Object} options Formatting options
   * @returns {string|Object} Formatted narrative
   */
  format(narrativeData, templateName, options = {}) {
    // Get the output format
    const format = options.format || this.options.defaultFormat;
    
    switch (format) {
      case 'html':
        return this.formatAsHtml(narrativeData, templateName, options);
      case 'markdown':
        return this.formatAsMarkdown(narrativeData, templateName, options);
      case 'json':
        return narrativeData; // Return raw data
      default:
        return this.formatAsText(narrativeData, templateName, options);
    }
  }
  
  /**
   * Format a narrative as HTML
   * @param {Object} narrativeData Narrative data
   * @param {string} templateName Template name
   * @param {Object} options Formatting options
   * @returns {string} HTML content
   */
  formatAsHtml(narrativeData, templateName, options = {}) {
    // This would use a proper HTML templating system
    // For now, just create basic HTML
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${narrativeData.title}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
    .narrative { max-width: 800px; margin: 0 auto; }
    h1 { color: #00356b; } /* Yale Blue */
    h2 { color: #0f4d92; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    section { margin-bottom: 20px; }
    footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 0.9em; color: #666; }
    .attribution { font-style: italic; }
    .disclaimer { font-weight: bold; }
    .yale-specific { background-color: #f8f9fa; border-left: 4px solid #00356b; padding: 10px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="narrative ${templateName.toLowerCase()}">`;
    
    // Add title
    html += `<h1>${narrativeData.title}</h1>`;
    
    // Add sections
    for (const section of narrativeData.sections || []) {
      html += `<section class="${section.type}">`;
      html += `<h2>${section.title}</h2>`;
      
      // Handle different content types
      html += this._formatSectionContentAsHtml(section.content, section.type);
      
      html += `</section>`;
    }
    
    // Add footer
    if (narrativeData.footer) {
      html += `<footer>
        <p class="attribution">${narrativeData.footer.attribution}</p>
        <p class="disclaimer">${narrativeData.footer.disclaimer}</p>
        <p class="generation-info">Generated on ${new Date(narrativeData.footer.generatedDate).toLocaleDateString()}</p>
      </footer>`;
    }
    
    html += `</div>
</body>
</html>`;

    return html;
  }
  
  /**
   * Format section content as HTML
   * @param {*} content Section content
   * @param {string} sectionType Section type
   * @returns {string} HTML content
   * @private
   */
  _formatSectionContentAsHtml(content, sectionType) {
    if (typeof content === 'string') {
      return `<p>${content}</p>`;
    }
    
    if (Array.isArray(content)) {
      if (content.length === 0) {
        return '<p><em>No information available</em></p>';
      }
      
      // Check if array contains complex objects or simple strings
      if (typeof content[0] === 'string') {
        return `<ul>${content.map(item => `<li>${item}</li>`).join('')}</ul>`;
      }
      
      // Handle specific section types
      switch (sectionType) {
        case 'yale-impact':
          return this._formatYaleImpactsAsHtml(content);
        case 'stakeholder-guidance':
          return this._formatStakeholderGuidanceAsHtml(content);
        case 'requirements':
          return this._formatRequirementsAsHtml(content);
        case 'actions':
          return this._formatActionsAsHtml(content);
        case 'timeline':
          return this._formatTimelineAsHtml(content);
        default:
          // Generic object array formatting
          return `<ul class="${sectionType}-list">
            ${content.map(item => `<li>${this._formatObjectAsHtml(item)}</li>`).join('')}
          </ul>`;
      }
    }
    
    if (typeof content === 'object') {
      return this._formatObjectAsHtml(content);
    }
    
    return `<p>${String(content)}</p>`;
  }
  
  /**
   * Format Yale impacts as HTML
   * @param {Array} impacts Yale impacts
   * @returns {string} HTML content
   * @private
   */
  _formatYaleImpactsAsHtml(impacts) {
    if (impacts.length === 0) {
      return '<p><em>No Yale-specific impacts identified</em></p>';
    }
    
    let html = '<div class="yale-impacts">';
    
    for (const impact of impacts) {
      html += `<div class="yale-specific impact-area">
        <h3>${impact.areaName}</h3>
        <p>${impact.description || ''}</p>`;
      
      if (impact.impacts && impact.impacts.length > 0) {
        html += '<ul>';
        for (const subImpact of impact.impacts) {
          html += `<li>
            <strong>${subImpact.description}</strong>
            ${subImpact.severity ? ` (Severity: ${subImpact.severity})` : ''}
            ${subImpact.timeframe ? ` (Timeframe: ${subImpact.timeframe})` : ''}
          </li>`;
        }
        html += '</ul>';
      }
      
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Format stakeholder guidance as HTML
   * @param {Array} guidance Stakeholder guidance
   * @returns {string} HTML content
   * @private
   */
  _formatStakeholderGuidanceAsHtml(guidance) {
    if (guidance.length === 0) {
      return '<p><em>No stakeholder guidance available</em></p>';
    }
    
    let html = '<div class="stakeholder-guidance">';
    
    for (const item of guidance) {
      html += `<div class="yale-specific stakeholder">
        <h3>${item.stakeholderName}</h3>`;
      
      if (item.guidance && item.guidance.length > 0) {
        html += '<ul>';
        for (const guidanceItem of item.guidance) {
          html += `<li>${guidanceItem}</li>`;
        }
        html += '</ul>';
      }
      
      html += '</div>';
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * Format requirements as HTML
   * @param {Array} requirements Requirements
   * @returns {string} HTML content
   * @private
   */
  _formatRequirementsAsHtml(requirements) {
    if (requirements.length === 0) {
      return '<p><em>No requirements identified</em></p>';
    }
    
    let html = '<div class="requirements">';
    
    html += '<ul>';
    for (const req of requirements) {
      html += `<li>
        <strong>${req.description}</strong>
        ${req.priority ? `<br><span class="priority priority-${req.priority}">Priority: ${req.priority}</span>` : ''}
        ${req.deadline ? `<br><span class="deadline">Deadline: ${req.deadline}</span>` : ''}
        ${req.yaleSpecificNotes ? `<br><div class="yale-specific note">${req.yaleSpecificNotes}</div>` : ''}
      </li>`;
    }
    html += '</ul>';
    
    html += '</div>';
    return html;
  }
  
  /**
   * Format actions as HTML
   * @param {Array} actions Actions
   * @returns {string} HTML content
   * @private
   */
  _formatActionsAsHtml(actions) {
    if (actions.length === 0) {
      return '<p><em>No recommended actions available</em></p>';
    }
    
    let html = '<div class="recommended-actions">';
    
    html += '<ul>';
    for (const action of actions) {
      html += `<li>
        <strong>${action.description}</strong>
        ${action.priority ? `<br><span class="priority priority-${action.priority}">Priority: ${action.priority}</span>` : ''}
        ${action.timeline ? `<br><span class="timeline">Timeline: ${action.timeline}</span>` : ''}
        ${action.assignedTo ? `<br><span class="assigned-to">Assigned to: ${action.assignedTo}</span>` : ''}
      </li>`;
    }
    html += '</ul>';
    
    html += '</div>';
    return html;
  }
  
  /**
   * Format timeline as HTML
   * @param {Array} timeline Timeline
   * @returns {string} HTML content
   * @private
   */
  _formatTimelineAsHtml(timeline) {
    if (timeline.length === 0) {
      return '<p><em>No timeline information available</em></p>';
    }
    
    let html = '<div class="timeline">';
    
    html += '<ul>';
    for (const item of timeline) {
      html += `<li>
        <strong>${item.date || 'TBD'}</strong>: ${item.milestone || item.description}
        ${item.status ? `<br><span class="status status-${item.status.toLowerCase().replace(/\s+/g, '-')}">Status: ${item.status}</span>` : ''}
      </li>`;
    }
    html += '</ul>';
    
    html += '</div>';
    return html;
  }
  
  /**
   * Format an object as HTML
   * @param {Object} obj Object to format
   * @returns {string} HTML content
   * @private
   */
  _formatObjectAsHtml(obj) {
    if (!obj) return '';
    
    const html = [];
    
    // Look for key properties to display prominently
    const keyProps = ['description', 'title', 'name'];
    for (const prop of keyProps) {
      if (obj[prop]) {
        html.push(`<strong>${obj[prop]}</strong>`);
        break;
      }
    }
    
    // Add other important properties
    const secondaryProps = ['severity', 'priority', 'status', 'date', 'deadline', 'timeframe'];
    for (const prop of secondaryProps) {
      if (obj[prop]) {
        html.push(`<span class="${prop}">${prop.charAt(0).toUpperCase() + prop.slice(1)}: ${obj[prop]}</span>`);
      }
    }
    
    // Handle nested arrays
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length > 0) {
        html.push(`<div class="${key}-list"><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong><ul>`);
        for (const item of value) {
          if (typeof item === 'string') {
            html.push(`<li>${item}</li>`);
          } else {
            html.push(`<li>${this._formatObjectAsHtml(item)}</li>`);
          }
        }
        html.push('</ul></div>');
      }
    }
    
    return html.join('<br>');
  }
  
  /**
   * Format a narrative as markdown
   * @param {Object} narrativeData Narrative data
   * @param {string} templateName Template name
   * @param {Object} options Formatting options
   * @returns {string} Markdown content
   */
  formatAsMarkdown(narrativeData, templateName, options = {}) {
    // Create markdown representation
    let markdown = `# ${narrativeData.title}\n\n`;
    
    // Add sections
    for (const section of narrativeData.sections || []) {
      markdown += `## ${section.title}\n\n`;
      
      // Handle different content types
      markdown += this._formatSectionContentAsMarkdown(section.content, section.type);
      
      markdown += '\n\n';
    }
    
    // Add footer
    if (narrativeData.footer) {
      markdown += `---\n\n`;
      markdown += `*${narrativeData.footer.attribution}*\n\n`;
      markdown += `**Disclaimer:** ${narrativeData.footer.disclaimer}\n\n`;
      markdown += `Generated on ${new Date(narrativeData.footer.generatedDate).toLocaleDateString()}\n`;
    }
    
    return markdown;
  }
  
  /**
   * Format section content as markdown
   * @param {*} content Section content
   * @param {string} sectionType Section type
   * @returns {string} Markdown content
   * @private
   */
  _formatSectionContentAsMarkdown(content, sectionType) {
    if (typeof content === 'string') {
      return content;
    }
    
    if (Array.isArray(content)) {
      if (content.length === 0) {
        return '*No information available*';
      }
      
      // Check if array contains complex objects or simple strings
      if (typeof content[0] === 'string') {
        return content.map(item => `* ${item}`).join('\n');
      }
      
      // Handle specific section types
      switch (sectionType) {
        case 'yale-impact':
          return this._formatYaleImpactsAsMarkdown(content);
        case 'stakeholder-guidance':
          return this._formatStakeholderGuidanceAsMarkdown(content);
        case 'requirements':
          return this._formatRequirementsAsMarkdown(content);
        default:
          // Generic object array formatting
          return content.map(item => `* ${this._formatObjectAsMarkdown(item)}`).join('\n');
      }
    }
    
    if (typeof content === 'object') {
      return this._formatObjectAsMarkdown(content);
    }
    
    return String(content);
  }
  
  /**
   * Format Yale impacts as markdown
   * @param {Array} impacts Yale impacts
   * @returns {string} Markdown content
   * @private
   */
  _formatYaleImpactsAsMarkdown(impacts) {
    if (impacts.length === 0) {
      return '*No Yale-specific impacts identified*';
    }
    
    let markdown = '';
    
    for (const impact of impacts) {
      markdown += `### ${impact.areaName}\n\n`;
      markdown += `${impact.description || ''}\n\n`;
      
      if (impact.impacts && impact.impacts.length > 0) {
        for (const subImpact of impact.impacts) {
          markdown += `* **${subImpact.description}**`;
          if (subImpact.severity) markdown += ` (Severity: ${subImpact.severity})`;
          if (subImpact.timeframe) markdown += ` (Timeframe: ${subImpact.timeframe})`;
          markdown += '\n';
        }
        markdown += '\n';
      }
    }
    
    return markdown;
  }
  
  /**
   * Format stakeholder guidance as markdown
   * @param {Array} guidance Stakeholder guidance
   * @returns {string} Markdown content
   * @private
   */
  _formatStakeholderGuidanceAsMarkdown(guidance) {
    if (guidance.length === 0) {
      return '*No stakeholder guidance available*';
    }
    
    let markdown = '';
    
    for (const item of guidance) {
      markdown += `### ${item.stakeholderName}\n\n`;
      
      if (item.guidance && item.guidance.length > 0) {
        for (const guidanceItem of item.guidance) {
          markdown += `* ${guidanceItem}\n`;
        }
        markdown += '\n';
      }
    }
    
    return markdown;
  }
  
  /**
   * Format requirements as markdown
   * @param {Array} requirements Requirements
   * @returns {string} Markdown content
   * @private
   */
  _formatRequirementsAsMarkdown(requirements) {
    if (requirements.length === 0) {
      return '*No requirements identified*';
    }
    
    let markdown = '';
    
    for (const req of requirements) {
      markdown += `* **${req.description}**\n`;
      if (req.priority) markdown += `  - Priority: ${req.priority}\n`;
      if (req.deadline) markdown += `  - Deadline: ${req.deadline}\n`;
      if (req.yaleSpecificNotes) {
        markdown += `  - *Yale Note:* ${req.yaleSpecificNotes}\n`;
      }
      markdown += '\n';
    }
    
    return markdown;
  }
  
  /**
   * Format an object as markdown
   * @param {Object} obj Object to format
   * @returns {string} Markdown content
   * @private
   */
  _formatObjectAsMarkdown(obj) {
    if (!obj) return '';
    
    const markdown = [];
    
    // Look for key properties to display prominently
    const keyProps = ['description', 'title', 'name'];
    for (const prop of keyProps) {
      if (obj[prop]) {
        markdown.push(`**${obj[prop]}**`);
        break;
      }
    }
    
    // Add other important properties
    const secondaryProps = ['severity', 'priority', 'status', 'date', 'deadline', 'timeframe'];
    for (const prop of secondaryProps) {
      if (obj[prop]) {
        markdown.push(`${prop.charAt(0).toUpperCase() + prop.slice(1)}: ${obj[prop]}`);
      }
    }
    
    // Handle nested arrays
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length > 0) {
        markdown.push(`**${key.charAt(0).toUpperCase() + key.slice(1)}:**`);
        for (const item of value) {
          if (typeof item === 'string') {
            markdown.push(`  - ${item}`);
          } else {
            markdown.push(`  - ${this._formatObjectAsMarkdown(item)}`);
          }
        }
      }
    }
    
    return markdown.join('\n');
  }
  
  /**
   * Format a narrative as plain text
   * @param {Object} narrativeData Narrative data
   * @param {string} templateName Template name
   * @param {Object} options Formatting options
   * @returns {string} Plain text content
   */
  formatAsText(narrativeData, templateName, options = {}) {
    // Create plain text representation
    let text = `${narrativeData.title}\n${'='.repeat(narrativeData.title.length)}\n\n`;
    
    // Add sections
    for (const section of narrativeData.sections || []) {
      text += `${section.title}\n${'-'.repeat(section.title.length)}\n\n`;
      
      // Handle different content types
      text += this._formatSectionContentAsText(section.content, section.type);
      
      text += '\n\n';
    }
    
    // Add footer
    if (narrativeData.footer) {
      text += `${'-'.repeat(80)}\n\n`;
      text += `${narrativeData.footer.attribution}\n\n`;
      text += `Disclaimer: ${narrativeData.footer.disclaimer}\n\n`;
      text += `Generated on ${new Date(narrativeData.footer.generatedDate).toLocaleDateString()}\n`;
    }
    
    return text;
  }
  
  /**
   * Format section content as text
   * @param {*} content Section content
   * @param {string} sectionType Section type
   * @returns {string} Text content
   * @private
   */
  _formatSectionContentAsText(content, sectionType) {
    if (typeof content === 'string') {
      return content;
    }
    
    if (Array.isArray(content)) {
      if (content.length === 0) {
        return 'No information available';
      }
      
      // Check if array contains complex objects or simple strings
      if (typeof content[0] === 'string') {
        return content.map(item => `* ${item}`).join('\n');
      }
      
      // Generic object array formatting
      return content.map(item => `* ${this._formatObjectAsText(item)}`).join('\n');
    }
    
    if (typeof content === 'object') {
      return this._formatObjectAsText(content);
    }
    
    return String(content);
  }
  
  /**
   * Format an object as text
   * @param {Object} obj Object to format
   * @returns {string} Text content
   * @private
   */
  _formatObjectAsText(obj) {
    if (!obj) return '';
    
    const lines = [];
    
    // Look for key properties to display prominently
    const keyProps = ['description', 'title', 'name'];
    for (const prop of keyProps) {
      if (obj[prop]) {
        lines.push(obj[prop]);
        break;
      }
    }
    
    // Add other important properties
    const secondaryProps = ['severity', 'priority', 'status', 'date', 'deadline', 'timeframe'];
    for (const prop of secondaryProps) {
      if (obj[prop]) {
        lines.push(`${prop.charAt(0).toUpperCase() + prop.slice(1)}: ${obj[prop]}`);
      }
    }
    
    // Handle nested arrays briefly
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length > 0) {
        lines.push(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value.length} items`);
      }
    }
    
    return lines.join(', ');
  }
}

module.exports = {
  NarrativeGenerator,
  TemplateRegistry,
  BaseTemplate,
  ExecutiveSummaryTemplate,
  DetailedAnalysisTemplate,
  ImplementationChecklistTemplate,
  YaleBriefTemplate,
  RegulatoryGuideTemplate,
  NarrativeFormatter
};