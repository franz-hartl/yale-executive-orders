/**
 * order_renderer.js
 * 
 * Renderer for executive order information.
 * Following "Essential Simplicity" design philosophy.
 */

const BaseRenderer = require('./base_renderer');

/**
 * Specialized renderer for executive order information
 */
class OrderRenderer extends BaseRenderer {
  /**
   * Create a new order renderer
   * 
   * @param {Object} options Renderer options
   */
  constructor(options = {}) {
    // Define default values for executive order fields
    const defaults = {
      order_number: 'N/A',
      title: 'Untitled Executive Order',
      president: '',
      signing_date: '',
      publication_date: '',
      summary: 'No summary available.',
      status: 'Unknown',
      url: '',
      impact_level: 'Unknown'
    };
    
    // Define custom formatters for executive order data
    const formatters = {
      orderNumber: (value) => {
        if (!value) return 'N/A';
        // Format as "EO #####" if it's just a number
        if (/^\d+$/.test(value)) {
          return `EO ${value}`;
        }
        return value;
      },
      
      impactLevel: (value) => {
        if (!value) return 'Unknown';
        // Format impact level with appropriate emphasis
        const levelMap = {
          'high': '<strong class="impact-high">High</strong>',
          'medium': '<span class="impact-medium">Medium</span>',
          'low': '<span class="impact-low">Low</span>',
          'minimal': '<span class="impact-minimal">Minimal</span>'
        };
        
        return levelMap[value.toLowerCase()] || value;
      },
      
      status: (value) => {
        if (!value) return 'Unknown';
        // Format status with appropriate styling
        const statusMap = {
          'active': '<span class="status-active">Active</span>',
          'revoked': '<span class="status-revoked">Revoked</span>',
          'superseded': '<span class="status-superseded">Superseded</span>',
          'amended': '<span class="status-amended">Amended</span>',
          'stayed': '<span class="status-stayed">Stayed by Court</span>'
        };
        
        return statusMap[value.toLowerCase()] || value;
      },
      
      requirementsList: (requirements) => {
        if (!requirements || !Array.isArray(requirements) || requirements.length === 0) {
          return '*No specific requirements identified.*';
        }
        
        return requirements.map(req => {
          let output = `* **${req.title || 'Requirement'}**`;
          if (req.description) output += `: ${req.description}`;
          if (req.deadline) output += ` *(Due: ${req.deadline})*`;
          return output;
        }).join('\n');
      },
      
      deadlinesList: (deadlines) => {
        if (!deadlines || !Array.isArray(deadlines) || deadlines.length === 0) {
          return '*No specific deadlines identified.*';
        }
        
        // Sort deadlines by date
        const sortedDeadlines = [...deadlines].sort((a, b) => {
          return new Date(a.date) - new Date(b.date);
        });
        
        return sortedDeadlines.map(deadline => {
          let output = `* **${this.formatters.date(deadline.date)}**`;
          if (deadline.description) output += `: ${deadline.description}`;
          if (deadline.requirement) output += ` (${deadline.requirement})`;
          return output;
        }).join('\n');
      },
      
      impactAreasList: (areas) => {
        if (!areas || !Array.isArray(areas) || areas.length === 0) {
          return '*No specific impact areas identified.*';
        }
        
        return areas.map(area => {
          if (typeof area === 'string') {
            return `* ${area}`;
          } else {
            let output = `* **${area.name || 'Impact Area'}**`;
            if (area.description) output += `: ${area.description}`;
            return output;
          }
        }).join('\n');
      },
      
      categoryList: (categories) => {
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
          return '*No categories assigned.*';
        }
        
        if (categories.every(c => typeof c === 'string')) {
          return categories.join(', ');
        }
        
        return categories.map(cat => cat.name || cat).join(', ');
      },
      
      yaleImpactsList: (impacts) => {
        if (!impacts || !Array.isArray(impacts) || impacts.length === 0) {
          return '*No Yale-specific impacts identified.*';
        }
        
        return impacts.map(impact => {
          let output = `* **${impact.area || impact.name || 'Impact'}**`;
          if (impact.description) output += `: ${impact.description}`;
          if (impact.level) output += ` *(Impact: ${impact.level})*`;
          if (impact.department) output += ` *(Affects: ${impact.department})*`;
          return output;
        }).join('\n');
      },
      
      departmentList: (departments) => {
        if (!departments || !Array.isArray(departments) || departments.length === 0) {
          return '*No department-specific information available.*';
        }
        
        return departments.map(dept => {
          if (typeof dept === 'string') {
            return `* ${dept}`;
          }
          
          let output = `* **${dept.name || 'Department'}**`;
          if (dept.impact) output += `: ${dept.impact}`;
          if (dept.actions && dept.actions.length) {
            output += '\n  * Actions:';
            dept.actions.forEach(action => {
              output += `\n    * ${action}`;
            });
          }
          return output;
        }).join('\n');
      },
      
      conflictsList: (conflicts) => {
        if (!conflicts || !Array.isArray(conflicts) || conflicts.length === 0) {
          return '*No conflicts identified.*';
        }
        
        return conflicts.map(conflict => {
          let output = `* **Conflict in ${conflict.type || 'information'}**`;
          if (conflict.description) output += `: ${conflict.description}`;
          if (conflict.status) output += ` *(Status: ${conflict.status})*`;
          return output;
        }).join('\n');
      }
    };
    
    // Initialize with defaults and custom formatters
    super({
      ...options,
      formatters: { ...formatters, ...(options.formatters || {}) },
      defaults: { ...defaults, ...(options.defaults || {}) }
    });
  }
  
  /**
   * Process executive order data for rendering
   * 
   * @param {Object} order Executive order data
   * @returns {Object} Processed data ready for template
   */
  processOrderData(order) {
    // Start with order data and apply defaults
    const data = this.applyDefaults(order);
    
    // Add derived and formatted values
    return {
      ...data,
      formatted_order_number: this.formatters.orderNumber(data.order_number),
      formatted_signing_date: this.formatters.date(data.signing_date),
      formatted_publication_date: this.formatters.date(data.publication_date),
      formatted_impact_level: this.formatters.impactLevel(data.impact_level),
      formatted_status: this.formatters.status(data.status),
      
      // Apply list formatters if arrays are present
      requirements_list: data.requirements ? 
        this.formatters.requirementsList(data.requirements) : '',
      
      deadlines_list: data.deadlines ? 
        this.formatters.deadlinesList(data.deadlines) : '',
      
      impact_areas_list: data.impact_areas ? 
        this.formatters.impactAreasList(data.impact_areas) : '',
      
      categories_list: data.categories ? 
        this.formatters.categoryList(data.categories) : '',
      
      yale_impacts_list: data.yale_impacts ? 
        this.formatters.yaleImpactsList(data.yale_impacts) : '',
      
      departments_list: data.departments ? 
        this.formatters.departmentList(data.departments) : '',
      
      conflicts_list: data.conflicts ? 
        this.formatters.conflictsList(data.conflicts) : ''
    };
  }
  
  /**
   * Render a section of a template
   * 
   * @param {Object} section Section configuration
   * @param {Object} data Data for rendering
   * @returns {string} Rendered section
   */
  renderSection(section, data) {
    // Check if section should be rendered
    if (!section.renderIfMissing) {
      // Check if any variables in the content are present in the data
      const variableRegex = /\{\{([^}]+)\}\}/g;
      let match;
      let hasData = false;
      
      while ((match = variableRegex.exec(section.content)) !== null) {
        const variable = match[1].trim().split(':')[0].trim();
        const value = this._resolveValue(data, variable);
        
        if (value !== null && value !== undefined && value !== '') {
          hasData = true;
          break;
        }
      }
      
      if (!hasData && !section.renderEmpty) {
        return '';
      }
    }
    
    // Render the section title if showTitle is true
    let result = '';
    if (section.title && section.showTitle !== false) {
      result += this.render(section.title, data) + '\n\n';
    }
    
    // Render the section content
    const content = this.render(section.content, data);
    
    // If content is empty and fallback is provided, use fallback
    if ((!content || content.trim() === '') && section.fallback) {
      result += section.fallback;
    } else {
      result += content;
    }
    
    return result;
  }
  
  /**
   * Render a complete template with all sections
   * 
   * @param {Object} template Template configuration
   * @param {Object} order Executive order data
   * @returns {string} Fully rendered template
   */
  renderTemplate(template, order) {
    // Process the order data
    const data = this.processOrderData(order);
    
    // Render each section
    const renderedSections = template.sections.map(section => {
      // Skip if section is not required and renderIfMissing is false
      if (!section.required && section.renderIfMissing === false) {
        // Check if we have data for this section
        const sectionData = data[section.id];
        if (!sectionData) return '';
      }
      
      return this.renderSection(section, data);
    });
    
    // Join sections with double newlines
    return renderedSections.filter(section => section).join('\n\n');
  }
}

module.exports = OrderRenderer;