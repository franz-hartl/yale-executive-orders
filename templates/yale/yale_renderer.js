/**
 * yale_renderer.js
 * 
 * Yale-specific renderer for executive order information.
 * Following "Essential Simplicity" design philosophy.
 */

const OrderRenderer = require('../renderers/order_renderer');

/**
 * Yale-specific renderer for executive order information
 */
class YaleRenderer extends OrderRenderer {
  /**
   * Create a new Yale-specific renderer
   * 
   * @param {Object} options Renderer options
   */
  constructor(options = {}) {
    // Yale-specific defaults
    const yaleDefaults = {
      institution_name: 'Yale University',
      institution_type: 'Private Research University',
      compliance_contact: 'Yale Office of Research Administration',
      compliance_email: 'researchadmin@yale.edu',
      compliance_url: 'https://research.yale.edu/compliance',
      legal_contact: 'Yale Office of the General Counsel',
      legal_email: 'general.counsel@yale.edu'
    };
    
    // Yale-specific formatters
    const yaleFormatters = {
      yaleDepartmentList: (departments) => {
        if (!departments || !Array.isArray(departments) || departments.length === 0) {
          return '*No Yale department-specific information available.*';
        }
        
        // Group departments by impact level
        const grouped = departments.reduce((acc, dept) => {
          const level = (dept.impact_level || 'medium').toLowerCase();
          if (!acc[level]) acc[level] = [];
          acc[level].push(dept);
          return acc;
        }, {});
        
        // Order by impact level: high, medium, low
        const levels = ['high', 'medium', 'low'];
        
        let result = '';
        for (const level of levels) {
          if (grouped[level] && grouped[level].length > 0) {
            result += `**${level.charAt(0).toUpperCase() + level.slice(1)} Impact:**\n\n`;
            
            for (const dept of grouped[level]) {
              result += `* **${dept.name}**`;
              
              if (dept.impact_description) {
                result += `: ${dept.impact_description}`;
              }
              
              if (dept.actions && dept.actions.length > 0) {
                result += '\n  * Required Actions:';
                dept.actions.forEach(action => {
                  let actionText = `\n    * ${action.description || action}`;
                  if (action.deadline) {
                    actionText += ` *(Due: ${this.formatters.date(action.deadline)})*`;
                  }
                  result += actionText;
                });
              }
              
              result += '\n\n';
            }
          }
        }
        
        return result.trim() || '*No Yale department-specific information available.*';
      },
      
      yaleImpactAreas: (impactAreas) => {
        if (!impactAreas || !Array.isArray(impactAreas) || impactAreas.length === 0) {
          return '*No Yale-specific impact areas identified.*';
        }
        
        return impactAreas.map(area => {
          let result = `* **${area.name}**`;
          
          if (area.rating) {
            const ratingMap = {
              'high': '🔴 High',
              'medium': '🟠 Medium',
              'low': '🟢 Low',
              'minimal': '⚪ Minimal'
            };
            
            result += ` *(Impact: ${ratingMap[area.rating.toLowerCase()] || area.rating})*`;
          }
          
          if (area.description) {
            result += `: ${area.description}`;
          }
          
          return result;
        }).join('\n');
      },
      
      yaleComplianceActions: (actions) => {
        if (!actions || !Array.isArray(actions) || actions.length === 0) {
          return '*No Yale-specific compliance actions required.*';
        }
        
        // Group actions by required vs optional
        const required = actions.filter(a => a.required !== false);
        const optional = actions.filter(a => a.required === false);
        
        let result = '';
        
        if (required.length > 0) {
          result += '**Required Actions:**\n\n';
          required.forEach(action => {
            let actionText = `* **${action.title || 'Action Required'}**`;
            if (action.description) actionText += `: ${action.description}`;
            if (action.deadline) actionText += ` *(Due: ${this.formatters.date(action.deadline)})*`;
            if (action.department) actionText += ` *(Responsible: ${action.department})*`;
            
            result += actionText + '\n';
          });
          result += '\n';
        }
        
        if (optional.length > 0) {
          result += '**Recommended Actions:**\n\n';
          optional.forEach(action => {
            let actionText = `* **${action.title || 'Recommended Action'}**`;
            if (action.description) actionText += `: ${action.description}`;
            if (action.deadline) actionText += ` *(Recommended by: ${this.formatters.date(action.deadline)})*`;
            if (action.department) actionText += ` *(Suggested for: ${action.department})*`;
            
            result += actionText + '\n';
          });
        }
        
        return result.trim();
      },
      
      yaleContactInfo: (departments) => {
        if (!departments || !Array.isArray(departments) || departments.length === 0) {
          return '';
        }
        
        let result = '**Yale Contacts:**\n\n';
        
        departments.forEach(dept => {
          if (dept.contact_info) {
            result += `* **${dept.name}**: ${dept.contact_info}\n`;
          }
        });
        
        // Add default Yale contacts
        result += `* **General Compliance Questions**: ${yaleDefaults.compliance_contact} (${yaleDefaults.compliance_email})\n`;
        result += `* **Legal Guidance**: ${yaleDefaults.legal_contact} (${yaleDefaults.legal_email})\n`;
        
        return result;
      }
    };
    
    // Initialize with Yale-specific defaults and formatters
    super({
      ...options,
      formatters: { ...yaleFormatters, ...(options.formatters || {}) },
      defaults: { ...yaleDefaults, ...(options.defaults || {}) }
    });
  }
  
  /**
   * Process executive order data with Yale-specific enhancements
   * 
   * @param {Object} order Executive order data
   * @returns {Object} Processed data ready for Yale templates
   */
  processOrderData(order) {
    // Get base processed data
    const data = super.processOrderData(order);
    
    // Add Yale-specific formatted data
    return {
      ...data,
      
      // Format Yale department information
      yale_departments_list: data.yale_departments ? 
        this.formatters.yaleDepartmentList(data.yale_departments) : '',
      
      // Format Yale impact areas
      yale_impact_areas_list: data.yale_impact_areas ? 
        this.formatters.yaleImpactAreas(data.yale_impact_areas) : '',
      
      // Format Yale compliance actions
      yale_compliance_actions_list: data.yale_compliance_actions ? 
        this.formatters.yaleComplianceActions(data.yale_compliance_actions) : '',
      
      // Format Yale contact information
      yale_contact_info: data.yale_departments ? 
        this.formatters.yaleContactInfo(data.yale_departments) : '',
      
      // Add institution information
      institution_info: `This analysis is specific to ${this.defaults.institution_name}, a ${this.defaults.institution_type}.`
    };
  }
  
  /**
   * Render a Yale-specific template section
   * 
   * @param {Object} section Section configuration
   * @param {Object} data Data for rendering
   * @returns {string} Rendered section with Yale-specific formatting
   */
  renderSection(section, data) {
    // Add Yale-specific formatting for certain sections
    if (section.id === 'yale_impact') {
      // Ensure we have the Yale-specific data
      if (!data.yale_impact_areas_list && !data.yale_impacts_list) {
        if (section.fallback) {
          return section.title ? this.render(section.title, data) + '\n\n' + section.fallback : section.fallback;
        }
        return '';
      }
    }
    
    if (section.id === 'department_actions') {
      // Ensure we have the Yale department data
      if (!data.yale_departments_list && !data.departments_list) {
        if (section.fallback) {
          return section.title ? this.render(section.title, data) + '\n\n' + section.fallback : section.fallback;
        }
        return '';
      }
    }
    
    // Use the base renderer for other sections
    return super.renderSection(section, data);
  }
  
  /**
   * Generate a Yale-specific compliance checklist
   * 
   * @param {Object} order Executive order data
   * @returns {string} Markdown formatted compliance checklist
   */
  generateComplianceChecklist(order) {
    const data = this.processOrderData(order);
    
    // Create a checklist header
    let checklist = `# Yale Compliance Checklist: EO ${data.order_number}\n\n`;
    checklist += `## ${data.title}\n\n`;
    
    // Add key dates
    checklist += '## Key Dates\n\n';
    if (data.deadlines && data.deadlines.length > 0) {
      data.deadlines.forEach(deadline => {
        checklist += `- [ ] **${this.formatters.date(deadline.date)}**: ${deadline.description || 'Deadline'}\n`;
      });
    } else {
      checklist += '*No specific deadlines identified.*\n';
    }
    checklist += '\n';
    
    // Add required actions
    checklist += '## Required Actions\n\n';
    if (data.yale_compliance_actions && data.yale_compliance_actions.length > 0) {
      const required = data.yale_compliance_actions.filter(a => a.required !== false);
      
      if (required.length > 0) {
        required.forEach(action => {
          checklist += `- [ ] **${action.title}**`;
          if (action.deadline) checklist += ` (Due: ${this.formatters.date(action.deadline)})`;
          checklist += '\n';
          if (action.description) checklist += `  - ${action.description}\n`;
          if (action.department) checklist += `  - Responsible: ${action.department}\n`;
          checklist += '\n';
        });
      } else {
        checklist += '*No required compliance actions identified.*\n\n';
      }
    } else {
      checklist += '*No required compliance actions identified.*\n\n';
    }
    
    // Add department contacts
    checklist += '## Department Contacts\n\n';
    if (data.yale_departments && data.yale_departments.length > 0) {
      data.yale_departments.forEach(dept => {
        if (dept.contact_info) {
          checklist += `- **${dept.name}**: ${dept.contact_info}\n`;
        }
      });
    }
    checklist += `- **Compliance Office**: ${this.defaults.compliance_contact} (${this.defaults.compliance_email})\n`;
    checklist += `- **Legal Guidance**: ${this.defaults.legal_contact} (${this.defaults.legal_email})\n\n`;
    
    // Add resources
    checklist += '## Resources\n\n';
    checklist += `- [Full Executive Order Text](${data.url || '#'})\n`;
    checklist += `- [Yale Compliance Portal](${this.defaults.compliance_url})\n`;
    
    if (data.resources && data.resources.length > 0) {
      data.resources.forEach(resource => {
        if (typeof resource === 'string') {
          checklist += `- ${resource}\n`;
        } else {
          checklist += `- [${resource.title || 'Resource'}](${resource.url || '#'}): ${resource.description || ''}\n`;
        }
      });
    }
    
    return checklist;
  }
}

module.exports = YaleRenderer;