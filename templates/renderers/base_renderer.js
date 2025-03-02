/**
 * base_renderer.js
 * 
 * Base class for all template renderers.
 * Following "Essential Simplicity" design philosophy.
 */

/**
 * Base renderer with common functionality for all renderers
 */
class BaseRenderer {
  /**
   * Create a new renderer
   * 
   * @param {Object} options Renderer options
   * @param {Object} [options.formatters={}] Custom formatters
   * @param {boolean} [options.escapeHtml=true] Whether to escape HTML in variables
   * @param {Object} [options.defaults={}] Default values for missing data
   */
  constructor({
    formatters = {},
    escapeHtml = true,
    defaults = {}
  } = {}) {
    this.formatters = {
      // Default formatters
      date: (value, format = 'MMMM D, YYYY') => {
        if (!value) return '';
        try {
          const date = new Date(value);
          // Simple date formatting (could be replaced with a library)
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
          
          return format
            .replace('YYYY', date.getFullYear())
            .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
            .replace('M', date.getMonth() + 1)
            .replace('MMMM', months[date.getMonth()])
            .replace('MMM', months[date.getMonth()].substring(0, 3))
            .replace('DD', String(date.getDate()).padStart(2, '0'))
            .replace('D', date.getDate());
        } catch (error) {
          console.warn(`Error formatting date: ${value}`, error);
          return value;
        }
      },
      
      list: (items, bullet = '• ') => {
        if (!items || !Array.isArray(items) || items.length === 0) return '';
        return items.map(item => `${bullet}${item}`).join('\n');
      },
      
      paragraph: (text) => {
        if (!text) return '';
        return `<p>${text}</p>`;
      },
      
      capitalize: (text) => {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1);
      },
      
      truncate: (text, length = 100) => {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
      },
      
      ...formatters // Merge in custom formatters
    };
    
    this.escapeHtml = escapeHtml;
    this.defaults = defaults;
  }
  
  /**
   * Render a template with data
   * 
   * @param {string} template Template string
   * @param {Object} data Data to use for rendering
   * @returns {string} Rendered template
   */
  render(template, data) {
    if (!template) return '';
    
    // Create context with defaults for missing values
    const context = { ...this.defaults, ...data };
    
    // Replace variables in the template
    return template.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      // Check if formatter is specified (e.g., {{date:YYYY-MM-DD}})
      const parts = variable.trim().split(':');
      const name = parts[0].trim();
      const format = parts.length > 1 ? parts[1].trim() : null;
      
      // Get variable value
      let value = this._resolveValue(context, name);
      
      // Apply formatter if one is specified
      if (format && this.formatters[format]) {
        value = this.formatters[format](value);
      } else if (name.includes('.') && format) {
        // For nested properties with a specific formatter (e.g., {{date.signing:date}})
        const formatter = this.formatters[format];
        if (formatter) {
          value = formatter(value);
        }
      }
      
      // Handle null or undefined values
      if (value === null || value === undefined) {
        return '';
      }
      
      // Escape HTML if needed
      return this.escapeHtml ? this._escapeHtml(String(value)) : String(value);
    });
  }
  
  /**
   * Resolve a value from a context object, supporting dot notation
   * 
   * @param {Object} context Data context
   * @param {string} path Property path (e.g., 'order.signing_date')
   * @returns {*} Resolved value
   * @private
   */
  _resolveValue(context, path) {
    const parts = path.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value === null || value === undefined) return null;
      value = value[part];
    }
    
    return value;
  }
  
  /**
   * Escape HTML in a string
   * 
   * @param {string} html String to escape
   * @returns {string} Escaped string
   * @private
   */
  _escapeHtml(html) {
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  /**
   * Apply default values to a data object
   * 
   * @param {Object} data Data object
   * @returns {Object} Data with defaults applied
   */
  applyDefaults(data) {
    return { ...this.defaults, ...data };
  }
}

module.exports = BaseRenderer;