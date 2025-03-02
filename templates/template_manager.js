/**
 * template_manager.js
 * 
 * Central manager for templates in the Yale Executive Orders system.
 * Following "Essential Simplicity" design philosophy.
 */

const { templateSchema, defaultTemplates } = require('../models/template_schema');
const { yaleTemplates } = require('./yale/yale_templates');
const OrderRenderer = require('./renderers/order_renderer');
const YaleRenderer = require('./yale/yale_renderer');

/**
 * Template manager for the Yale Executive Orders system
 */
class TemplateManager {
  /**
   * Create a new template manager
   * 
   * @param {Object} options Configuration options
   * @param {Object} [options.customTemplates={}] Custom templates to add
   * @param {Object} [options.rendererOptions={}] Options for renderers
   * @param {boolean} [options.useYaleTemplates=true] Whether to include Yale templates
   */
  constructor({
    customTemplates = {},
    rendererOptions = {},
    useYaleTemplates = true
  } = {}) {
    // Initialize renderers
    this.orderRenderer = new OrderRenderer(rendererOptions);
    this.yaleRenderer = new YaleRenderer(rendererOptions);
    
    // Load templates
    this.templates = { ...defaultTemplates };
    
    // Add Yale templates if enabled
    if (useYaleTemplates) {
      this.templates = { ...this.templates, ...yaleTemplates };
    }
    
    // Add custom templates
    this.templates = { ...this.templates, ...customTemplates };
    
    // Set up renderer mapping
    this.rendererMap = {
      [templateSchema.types.EXECUTIVE_BRIEF]: this.orderRenderer,
      [templateSchema.types.STANDARD_SUMMARY]: this.orderRenderer,
      [templateSchema.types.DETAILED_ANALYSIS]: this.orderRenderer,
      [templateSchema.types.COMPLIANCE_GUIDE]: this.orderRenderer,
      [templateSchema.types.IMPACT_ASSESSMENT]: this.orderRenderer,
      [templateSchema.types.YALE_BRIEF]: this.yaleRenderer,
      'YALE_EXECUTIVE_BRIEF': this.yaleRenderer,
      'YALE_COMPREHENSIVE': this.yaleRenderer,
      'YALE_COMPLIANCE_CHECKLIST': this.yaleRenderer,
      'YALE_DEPARTMENT_GUIDANCE': this.yaleRenderer
    };
    
    // Template cache for improved performance
    this.templateCache = {};
  }
  
  /**
   * Get available template types
   * 
   * @returns {Array} Array of available template types
   */
  getAvailableTemplates() {
    return Object.keys(this.templates).map(key => ({
      id: key,
      name: this.templates[key].name,
      description: this.templates[key].description
    }));
  }
  
  /**
   * Get a template by type
   * 
   * @param {string} templateType Template type
   * @returns {Object|null} Template configuration or null if not found
   */
  getTemplate(templateType) {
    return this.templates[templateType] || null;
  }
  
  /**
   * Render an executive order with a specific template
   * 
   * @param {Object} order Executive order data
   * @param {string} templateType Template type to use
   * @returns {string} Rendered output
   */
  renderTemplate(order, templateType) {
    // Get the template
    const template = this.getTemplate(templateType);
    if (!template) {
      console.error(`Template not found: ${templateType}`);
      return `Error: Template "${templateType}" not found.`;
    }
    
    // Get the appropriate renderer
    const renderer = this.rendererMap[templateType] || this.orderRenderer;
    
    try {
      // Render the template
      return renderer.renderTemplate(template, order);
    } catch (error) {
      console.error(`Error rendering template ${templateType}:`, error);
      return `Error rendering template: ${error.message}`;
    }
  }
  
  /**
   * Render a specific section of a template
   * 
   * @param {Object} order Executive order data
   * @param {string} templateType Template type
   * @param {string} sectionId Section ID to render
   * @returns {string} Rendered section
   */
  renderSection(order, templateType, sectionId) {
    // Get the template
    const template = this.getTemplate(templateType);
    if (!template) {
      console.error(`Template not found: ${templateType}`);
      return `Error: Template "${templateType}" not found.`;
    }
    
    // Find the section
    const section = template.sections.find(s => s.id === sectionId);
    if (!section) {
      console.error(`Section not found: ${sectionId}`);
      return `Error: Section "${sectionId}" not found in template "${templateType}".`;
    }
    
    // Get the appropriate renderer
    const renderer = this.rendererMap[templateType] || this.orderRenderer;
    
    try {
      // Process the order data
      const data = renderer.processOrderData(order);
      
      // Render the section
      return renderer.renderSection(section, data);
    } catch (error) {
      console.error(`Error rendering section ${sectionId}:`, error);
      return `Error rendering section: ${error.message}`;
    }
  }
  
  /**
   * Generate a Yale compliance checklist
   * 
   * @param {Object} order Executive order data
   * @returns {string} Compliance checklist in Markdown format
   */
  generateComplianceChecklist(order) {
    return this.yaleRenderer.generateComplianceChecklist(order);
  }
  
  /**
   * Customize an existing template
   * 
   * @param {string} baseTemplateType Base template type
   * @param {Object} customizations Customizations to apply
   * @param {string} newTemplateId ID for the new template
   * @returns {string} New template ID
   */
  customizeTemplate(baseTemplateType, customizations, newTemplateId) {
    // Get the base template
    const baseTemplate = this.getTemplate(baseTemplateType);
    if (!baseTemplate) {
      throw new Error(`Base template not found: ${baseTemplateType}`);
    }
    
    // Create a deep copy of the base template
    const newTemplate = JSON.parse(JSON.stringify(baseTemplate));
    
    // Apply customizations
    if (customizations.name) newTemplate.name = customizations.name;
    if (customizations.description) newTemplate.description = customizations.description;
    
    // Update sections if provided
    if (customizations.sections) {
      for (const customSection of customizations.sections) {
        // Find the section to update
        const sectionIndex = newTemplate.sections.findIndex(s => s.id === customSection.id);
        
        if (sectionIndex >= 0) {
          // Update existing section
          newTemplate.sections[sectionIndex] = {
            ...newTemplate.sections[sectionIndex],
            ...customSection
          };
        } else if (customSection.id && customSection.content) {
          // Add new section
          newTemplate.sections.push(customSection);
        }
      }
    }
    
    // Add the new template
    this.templates[newTemplateId] = newTemplate;
    
    // Set the renderer for the new template
    const baseRenderer = this.rendererMap[baseTemplateType] || this.orderRenderer;
    this.rendererMap[newTemplateId] = baseRenderer;
    
    return newTemplateId;
  }
  
  /**
   * Create a specialized template for a specific Yale department
   * 
   * @param {string} departmentName Department name
   * @returns {string} New template ID
   */
  createDepartmentTemplate(departmentName) {
    const sanitizedName = departmentName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    const templateId = `YALE_DEPT_${sanitizedName}`;
    
    // Customize the department guidance template
    return this.customizeTemplate('YALE_DEPARTMENT_GUIDANCE', {
      name: `${departmentName} Guidance`,
      description: `Specific guidance for ${departmentName}`,
      sections: [
        {
          id: templateSchema.sections.HEADER,
          content: `# Departmental Guidance: EO {{order_number}}\n` +
                  `## {{title}}\n\n` +
                  `*For: ${departmentName}*\n\n` +
                  `*Issued: {{signing_date:date}} | Status: {{status}}*\n\n`
        }
      ]
    }, templateId);
  }
  
  /**
   * Get a list of required data fields for a template
   * 
   * @param {string} templateType Template type
   * @returns {Array} Array of required field names
   */
  getRequiredFields(templateType) {
    const template = this.getTemplate(templateType);
    if (!template) return [];
    
    const requiredFields = new Set();
    
    // Regular expression to find template variables
    const variableRegex = /\{\{([^}:]+)(?::[^}]*)?\}\}/g;
    
    // Check each section
    for (const section of template.sections) {
      if (section.required) {
        // Extract variables from content
        let match;
        while ((match = variableRegex.exec(section.content)) !== null) {
          requiredFields.add(match[1].trim());
        }
      }
    }
    
    return Array.from(requiredFields);
  }
  
  /**
   * Check if data is sufficient for a template
   * 
   * @param {Object} data Data to check
   * @param {string} templateType Template type
   * @returns {Object} Result with missing fields
   */
  validateData(data, templateType) {
    const requiredFields = this.getRequiredFields(templateType);
    const missingFields = [];
    
    for (const field of requiredFields) {
      // Handle nested fields (e.g., "order.title")
      const parts = field.split('.');
      let value = data;
      
      for (const part of parts) {
        if (value === undefined || value === null) {
          missingFields.push(field);
          break;
        }
        value = value[part];
      }
      
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }
}

module.exports = TemplateManager;