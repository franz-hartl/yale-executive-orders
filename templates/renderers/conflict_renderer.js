/**
 * conflict_renderer.js
 * 
 * Specialized renderer for conflict information.
 * Following "Essential Simplicity" design philosophy.
 */

const BaseRenderer = require('./base_renderer');
const { conflictSchema } = require('../../models/conflict_record');

/**
 * Renderer for conflict information
 */
class ConflictRenderer extends BaseRenderer {
  /**
   * Create a new conflict renderer
   * 
   * @param {Object} options Renderer options
   */
  constructor(options = {}) {
    // Default values
    const defaults = {
      order_number: 'Unknown',
      title: 'Unknown Executive Order',
      conflict_count: 0,
      unresolved_count: 0,
      resolved_count: 0,
      flagged_count: 0
    };
    
    // Custom formatters
    const formatters = {
      severityBadge: (severity) => {
        const badges = {
          [conflictSchema.severityLevels.HIGH]: '🔴 **HIGH**',
          [conflictSchema.severityLevels.MEDIUM]: '🟠 **MEDIUM**',
          [conflictSchema.severityLevels.LOW]: '🟢 **LOW**'
        };
        
        return badges[severity] || severity;
      },
      
      statusBadge: (status) => {
        const badges = {
          [conflictSchema.statusValues.UNRESOLVED]: '⚠️ **UNRESOLVED**',
          [conflictSchema.statusValues.RESOLVED_AUTO]: '✅ **AUTO-RESOLVED**',
          [conflictSchema.statusValues.RESOLVED_MANUAL]: '✓ **RESOLVED**',
          [conflictSchema.statusValues.FLAGGED]: '🚩 **FLAGGED**'
        };
        
        return badges[status] || status;
      },
      
      factTypeLabel: (factType) => {
        const labels = {
          'date': 'Date Information',
          'requirement': 'Requirement',
          'impact': 'Impact Assessment',
          'entity': 'Entity Information',
          'definition': 'Definition',
          'exemption': 'Exemption',
          'authority': 'Legal Authority',
          'amendment': 'Amendment',
          'status': 'Status Information',
          'guidance': 'Implementation Guidance'
        };
        
        return labels[factType] || factType;
      },
      
      resolutionStrategy: (strategy) => {
        const strategies = {
          [conflictSchema.resolutionStrategies.SOURCE_PRIORITY]: 'Source Priority',
          [conflictSchema.resolutionStrategies.RECENCY]: 'Most Recent Information',
          [conflictSchema.resolutionStrategies.CONFIDENCE]: 'Higher Confidence Score',
          [conflictSchema.resolutionStrategies.MANUAL]: 'Manual Resolution',
          [conflictSchema.resolutionStrategies.COMBINED]: 'Combined Information',
          [conflictSchema.resolutionStrategies.NEWEST_SOURCE]: 'Newest Source'
        };
        
        return strategies[strategy] || strategy;
      },
      
      conflictList: (conflicts) => {
        if (!conflicts || conflicts.length === 0) {
          return '*No conflicts detected.*';
        }
        
        // Group conflicts by status
        const grouped = conflicts.reduce((acc, conflict) => {
          if (!acc[conflict.status]) acc[conflict.status] = [];
          acc[conflict.status].push(conflict);
          return acc;
        }, {});
        
        // Define status order for display
        const statusOrder = [
          conflictSchema.statusValues.UNRESOLVED,
          conflictSchema.statusValues.FLAGGED,
          conflictSchema.statusValues.RESOLVED_MANUAL,
          conflictSchema.statusValues.RESOLVED_AUTO
        ];
        
        let result = '';
        
        // Display conflicts by status group
        for (const status of statusOrder) {
          if (grouped[status] && grouped[status].length > 0) {
            result += `### ${this.formatters.statusBadge(status)} (${grouped[status].length})\n\n`;
            
            // Sort by severity within status
            const sorted = [...grouped[status]].sort((a, b) => {
              const severityOrder = {
                [conflictSchema.severityLevels.HIGH]: 0,
                [conflictSchema.severityLevels.MEDIUM]: 1,
                [conflictSchema.severityLevels.LOW]: 2
              };
              
              return severityOrder[a.severity] - severityOrder[b.severity];
            });
            
            for (const conflict of sorted) {
              result += `#### Conflict #${conflict.id}: ${this.formatters.factTypeLabel(conflict.conflictType)} (${this.formatters.severityBadge(conflict.severity)})\n\n`;
              
              if (conflict.description) {
                result += `**Issue:** ${conflict.description}\n\n`;
              }
              
              if (conflict.fact1 && conflict.fact2) {
                result += '**Conflicting Information:**\n\n';
                result += `- Source 1: ${conflict.fact1.source || 'Unknown source'}\n`;
                result += `  ${conflict.fact1.value}\n\n`;
                result += `- Source 2: ${conflict.fact2.source || 'Unknown source'}\n`;
                result += `  ${conflict.fact2.value}\n\n`;
              }
              
              if (conflict.status === conflictSchema.statusValues.RESOLVED_AUTO || 
                  conflict.status === conflictSchema.statusValues.RESOLVED_MANUAL) {
                result += '**Resolution:**\n\n';
                
                if (conflict.resolutionStrategy) {
                  result += `Method: ${this.formatters.resolutionStrategy(conflict.resolutionStrategy)}\n\n`;
                }
                
                if (conflict.resolutionDate) {
                  result += `Date: ${this.formatters.date(conflict.resolutionDate)}\n\n`;
                }
                
                if (conflict.resolutionBy) {
                  result += `Resolved by: ${conflict.resolutionBy}\n\n`;
                }
                
                if (conflict.resolutionNotes) {
                  result += `Notes: ${conflict.resolutionNotes}\n\n`;
                }
              }
              
              if (conflict.status === conflictSchema.statusValues.FLAGGED) {
                result += '**Flagged for attention:**\n\n';
                result += `${conflict.resolutionNotes || 'No additional notes provided.'}\n\n`;
              }
              
              if (conflict.actions && conflict.actions.length > 0) {
                result += '**Recommended Actions:**\n\n';
                for (const action of conflict.actions) {
                  result += `- ${action}\n`;
                }
                result += '\n';
              }
              
              result += '---\n\n';
            }
          }
        }
        
        return result;
      },
      
      conflictSummary: (conflicts) => {
        if (!conflicts || conflicts.length === 0) {
          return '*No conflicts detected.*';
        }
        
        // Count conflicts by type and status
        const byType = conflicts.reduce((acc, conflict) => {
          if (!acc[conflict.conflictType]) acc[conflict.conflictType] = 0;
          acc[conflict.conflictType]++;
          return acc;
        }, {});
        
        const byStatus = conflicts.reduce((acc, conflict) => {
          if (!acc[conflict.status]) acc[conflict.status] = 0;
          acc[conflict.status]++;
          return acc;
        }, {});
        
        const bySeverity = conflicts.reduce((acc, conflict) => {
          if (!acc[conflict.severity]) acc[conflict.severity] = 0;
          acc[conflict.severity]++;
          return acc;
        }, {});
        
        let result = '### Conflict Summary\n\n';
        
        result += `Total conflicts: **${conflicts.length}**\n\n`;
        
        if (bySeverity[conflictSchema.severityLevels.HIGH]) {
          result += `- ${this.formatters.severityBadge(conflictSchema.severityLevels.HIGH)}: ${bySeverity[conflictSchema.severityLevels.HIGH]}\n`;
        }
        
        if (bySeverity[conflictSchema.severityLevels.MEDIUM]) {
          result += `- ${this.formatters.severityBadge(conflictSchema.severityLevels.MEDIUM)}: ${bySeverity[conflictSchema.severityLevels.MEDIUM]}\n`;
        }
        
        if (bySeverity[conflictSchema.severityLevels.LOW]) {
          result += `- ${this.formatters.severityBadge(conflictSchema.severityLevels.LOW)}: ${bySeverity[conflictSchema.severityLevels.LOW]}\n`;
        }
        
        result += '\n**By Status:**\n\n';
        
        if (byStatus[conflictSchema.statusValues.UNRESOLVED]) {
          result += `- Unresolved: ${byStatus[conflictSchema.statusValues.UNRESOLVED]}\n`;
        }
        
        if (byStatus[conflictSchema.statusValues.FLAGGED]) {
          result += `- Flagged: ${byStatus[conflictSchema.statusValues.FLAGGED]}\n`;
        }
        
        if (byStatus[conflictSchema.statusValues.RESOLVED_MANUAL]) {
          result += `- Manually Resolved: ${byStatus[conflictSchema.statusValues.RESOLVED_MANUAL]}\n`;
        }
        
        if (byStatus[conflictSchema.statusValues.RESOLVED_AUTO]) {
          result += `- Auto-Resolved: ${byStatus[conflictSchema.statusValues.RESOLVED_AUTO]}\n`;
        }
        
        result += '\n**By Type:**\n\n';
        
        for (const [type, count] of Object.entries(byType)) {
          result += `- ${this.formatters.factTypeLabel(type)}: ${count}\n`;
        }
        
        return result;
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
   * Process conflict data for rendering
   * 
   * @param {Object} data Conflict data
   * @returns {Object} Processed data
   */
  processConflictData(data) {
    // Apply defaults
    const processedData = this.applyDefaults(data);
    
    // Count conflicts by status
    if (processedData.conflicts) {
      processedData.conflict_count = processedData.conflicts.length;
      
      processedData.unresolved_count = processedData.conflicts.filter(
        c => c.status === conflictSchema.statusValues.UNRESOLVED
      ).length;
      
      processedData.resolved_count = processedData.conflicts.filter(
        c => c.status === conflictSchema.statusValues.RESOLVED_AUTO || 
             c.status === conflictSchema.statusValues.RESOLVED_MANUAL
      ).length;
      
      processedData.flagged_count = processedData.conflicts.filter(
        c => c.status === conflictSchema.statusValues.FLAGGED
      ).length;
      
      // Format conflicts for display
      processedData.conflicts_list = this.formatters.conflictList(processedData.conflicts);
      processedData.conflicts_summary = this.formatters.conflictSummary(processedData.conflicts);
    }
    
    return processedData;
  }
  
  /**
   * Render a conflict report
   * 
   * @param {Object} template Template definition
   * @param {Object} data Conflict data
   * @returns {string} Rendered report
   */
  renderConflictReport(template, data) {
    // Process the data
    const processedData = this.processConflictData(data);
    
    // Render the template
    return this.render(template, processedData);
  }
  
  /**
   * Generate a conflict summary report
   * 
   * @param {Object} data Conflict data
   * @returns {string} Summary report
   */
  generateConflictSummary(data) {
    const template = `# Conflict Report: Executive Order {{order_number}}
## {{title}}

{{conflicts_summary}}

## Conflict Details

{{conflicts_list}}

---

*Report generated on {{current_date:date}}*
`;
    
    return this.renderConflictReport(template, {
      ...data,
      current_date: new Date().toISOString()
    });
  }
}

module.exports = ConflictRenderer;