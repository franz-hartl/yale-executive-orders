/**
 * template_schema.js
 * 
 * Defines the schema for templates in the Yale Executive Orders system.
 * Following "Essential Simplicity" design philosophy.
 */

/**
 * Schema for templates
 */
const templateSchema = {
  // Template types
  types: {
    EXECUTIVE_BRIEF: 'executive_brief',      // Short 1-2 paragraph summary for executives
    STANDARD_SUMMARY: 'standard_summary',    // Standard detailed summary
    DETAILED_ANALYSIS: 'detailed_analysis',  // Comprehensive analysis with details
    COMPLIANCE_GUIDE: 'compliance_guide',    // Compliance-focused guidance
    IMPACT_ASSESSMENT: 'impact_assessment',  // Impact assessment for university
    YALE_BRIEF: 'yale_brief'                 // Yale-specific executive brief
  },
  
  // Template sections
  sections: {
    HEADER: 'header',                      // Title and basic information
    SUMMARY: 'summary',                    // Brief summary
    KEY_POINTS: 'key_points',              // Key takeaways as bullet points
    BACKGROUND: 'background',              // Background information
    REQUIREMENTS: 'requirements',          // Compliance requirements
    DEADLINES: 'deadlines',                // Key deadlines
    IMPACT_ANALYSIS: 'impact_analysis',    // Analysis of impacts
    YALE_IMPACT: 'yale_impact',            // Yale-specific impacts
    DEPARTMENT_ACTIONS: 'department_actions', // Department-specific actions
    RESOURCES: 'resources',                // Additional resources
    FOOTNOTES: 'footnotes'                 // References and footnotes
  },
  
  // Template section options
  sectionOptions: {
    required: false,              // Whether the section is required
    fallback: null,               // Fallback content if data is missing
    maxLength: null,              // Maximum length in characters
    renderEmpty: false,           // Whether to render empty sections
    renderIfMissing: true,        // Whether to render the section if data is missing
    showTitle: true               // Whether to show the section title
  },
  
  // Template variables that can be used in content
  variables: {
    ORDER_NUMBER: '{{order_number}}',
    TITLE: '{{title}}',
    PRESIDENT: '{{president}}',
    SIGNING_DATE: '{{signing_date}}',
    PUBLICATION_DATE: '{{publication_date}}',
    SUMMARY_TEXT: '{{summary}}',
    STATUS: '{{status}}',
    URL: '{{url}}',
    EFFECTIVE_DATE: '{{effective_date}}',
    REQUIREMENTS_LIST: '{{requirements}}',
    DEADLINES_LIST: '{{deadlines}}',
    IMPACT_LEVEL: '{{impact_level}}',
    IMPACT_AREAS: '{{impact_areas}}',
    YALE_IMPACTS: '{{yale_impacts}}',
    DEPARTMENT_LIST: '{{departments}}',
    CATEGORIES: '{{categories}}',
    CONFLICTS: '{{conflicts}}'
  },
  
  // Common template formatting options
  formatting: {
    dateFormat: 'MMMM D, YYYY',    // Default date format
    listBullet: '• ',              // Bullet character for lists
    headerLevel: 3,                // Default header level (h3)
    paragraphSpacing: true,        // Add spacing between paragraphs
    emphasizeDeadlines: true,      // Whether to emphasize deadline text
    highlightYaleImpact: true      // Whether to highlight Yale-specific impact
  }
};

/**
 * Default template configurations
 */
const defaultTemplates = {
  // Executive brief template (1-2 paragraphs)
  [templateSchema.types.EXECUTIVE_BRIEF]: {
    name: 'Executive Brief',
    description: 'Short 1-2 paragraph summary for busy executives',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Executive Order ${templateSchema.variables.ORDER_NUMBER}: ${templateSchema.variables.TITLE}\n` +
                 `*Issued by President ${templateSchema.variables.PRESIDENT} on ${templateSchema.variables.SIGNING_DATE}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: templateSchema.sections.SUMMARY,
        title: '',
        content: templateSchema.variables.SUMMARY_TEXT,
        required: true,
        fallback: '*No summary available.*'
      },
      {
        id: templateSchema.sections.KEY_POINTS,
        title: '**Key Points:**',
        content: templateSchema.variables.KEY_POINTS,
        required: false,
        renderIfMissing: false
      },
      {
        id: templateSchema.sections.IMPACT_ANALYSIS,
        title: '**University Impact:**',
        content: `Impact Level: ${templateSchema.variables.IMPACT_LEVEL}\n` +
                 `Impact Areas: ${templateSchema.variables.IMPACT_AREAS}`,
        required: false,
        renderIfMissing: false
      }
    ]
  },
  
  // Standard summary template
  [templateSchema.types.STANDARD_SUMMARY]: {
    name: 'Standard Summary',
    description: 'Comprehensive summary with key information',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Executive Order ${templateSchema.variables.ORDER_NUMBER}: ${templateSchema.variables.TITLE}\n` +
                 `*Issued by President ${templateSchema.variables.PRESIDENT} on ${templateSchema.variables.SIGNING_DATE}*\n\n` +
                 `*Status: ${templateSchema.variables.STATUS}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: templateSchema.sections.SUMMARY,
        title: '## Summary',
        content: templateSchema.variables.SUMMARY_TEXT,
        required: true,
        fallback: '*No summary available for this executive order.*'
      },
      {
        id: templateSchema.sections.KEY_POINTS,
        title: '## Key Points',
        content: templateSchema.variables.KEY_POINTS,
        required: false,
        fallback: '*Key points not available.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.REQUIREMENTS,
        title: '## Requirements',
        content: templateSchema.variables.REQUIREMENTS_LIST,
        required: false,
        fallback: '*No specific requirements identified.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.DEADLINES,
        title: '## Key Deadlines',
        content: templateSchema.variables.DEADLINES_LIST,
        required: false,
        fallback: '*No specific deadlines identified.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.IMPACT_ANALYSIS,
        title: '## University Impact',
        content: `**Impact Level:** ${templateSchema.variables.IMPACT_LEVEL}\n\n` +
                 `**Impact Areas:** ${templateSchema.variables.IMPACT_AREAS}\n\n` +
                 `${templateSchema.variables.IMPACT_ANALYSIS}`,
        required: false,
        fallback: '*Impact analysis not available.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.RESOURCES,
        title: '## Additional Resources',
        content: templateSchema.variables.RESOURCES,
        required: false,
        renderIfMissing: false
      },
      {
        id: templateSchema.sections.FOOTNOTES,
        title: '## References',
        content: templateSchema.variables.FOOTNOTES,
        required: false,
        renderIfMissing: false
      }
    ]
  },
  
  // Yale-specific brief
  [templateSchema.types.YALE_BRIEF]: {
    name: 'Yale Executive Brief',
    description: 'Yale-specific executive brief with institutional context',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Yale Executive Brief: EO ${templateSchema.variables.ORDER_NUMBER}\n` +
                 `*${templateSchema.variables.TITLE}*\n\n` +
                 `*Issued by President ${templateSchema.variables.PRESIDENT} on ${templateSchema.variables.SIGNING_DATE}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: templateSchema.sections.SUMMARY,
        title: '## Overview',
        content: templateSchema.variables.SUMMARY_TEXT,
        required: true,
        fallback: '*No summary available.*'
      },
      {
        id: templateSchema.sections.YALE_IMPACT,
        title: '## Yale Impact Assessment',
        content: `${templateSchema.variables.YALE_IMPACTS}`,
        required: true,
        fallback: '*Yale-specific impact assessment not available.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.DEPARTMENT_ACTIONS,
        title: '## Departmental Considerations',
        content: `${templateSchema.variables.DEPARTMENT_LIST}`,
        required: false,
        fallback: '*Department-specific guidance not yet available.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.DEADLINES,
        title: '## Key Deadlines for Yale',
        content: templateSchema.variables.DEADLINES_LIST,
        required: false,
        fallback: '*No specific deadlines identified for Yale University.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.RESOURCES,
        title: '## Resources',
        content: `* [Full Executive Order Text](${templateSchema.variables.URL})\n` +
                 `* [Yale Compliance Portal](https://compliance.yale.edu)\n` +
                 `${templateSchema.variables.RESOURCES}`,
        required: false,
        renderIfMissing: true
      }
    ]
  },
  
  // Impact assessment template
  [templateSchema.types.IMPACT_ASSESSMENT]: {
    name: 'Impact Assessment',
    description: 'Detailed assessment of impacts on universities',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Impact Assessment: EO ${templateSchema.variables.ORDER_NUMBER}\n` +
                 `*${templateSchema.variables.TITLE}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: templateSchema.sections.SUMMARY,
        title: '## Executive Summary',
        content: templateSchema.variables.SUMMARY_TEXT,
        required: true,
        fallback: '*No summary available.*'
      },
      {
        id: templateSchema.sections.IMPACT_ANALYSIS,
        title: '## Impact Analysis',
        content: `**Overall Impact Level:** ${templateSchema.variables.IMPACT_LEVEL}\n\n` +
                 `**Categories:** ${templateSchema.variables.CATEGORIES}\n\n` +
                 `**Impact Areas:** ${templateSchema.variables.IMPACT_AREAS}\n\n` +
                 `${templateSchema.variables.IMPACT_ANALYSIS}`,
        required: true,
        fallback: '*Detailed impact analysis not available.*'
      },
      {
        id: templateSchema.sections.YALE_IMPACT,
        title: '## Yale-Specific Impact',
        content: `${templateSchema.variables.YALE_IMPACTS}`,
        required: false,
        fallback: '*Yale-specific impact assessment not available.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.CONFLICTS,
        title: '## Information Conflicts',
        content: templateSchema.variables.CONFLICTS,
        required: false,
        renderIfMissing: false
      },
      {
        id: templateSchema.sections.RESOURCES,
        title: '## Related Resources',
        content: templateSchema.variables.RESOURCES,
        required: false,
        renderIfMissing: false
      }
    ]
  },
  
  // Compliance guide template
  [templateSchema.types.COMPLIANCE_GUIDE]: {
    name: 'Compliance Guide',
    description: 'Focused guidance on compliance requirements',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Compliance Guide: EO ${templateSchema.variables.ORDER_NUMBER}\n` +
                 `*${templateSchema.variables.TITLE}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: templateSchema.sections.SUMMARY,
        title: '## Overview',
        content: templateSchema.variables.SUMMARY_TEXT,
        required: true,
        fallback: '*No summary available.*'
      },
      {
        id: templateSchema.sections.REQUIREMENTS,
        title: '## Compliance Requirements',
        content: templateSchema.variables.REQUIREMENTS_LIST,
        required: true,
        fallback: '*No specific requirements identified.*'
      },
      {
        id: templateSchema.sections.DEADLINES,
        title: '## Compliance Timeline',
        content: templateSchema.variables.DEADLINES_LIST,
        required: true,
        fallback: '*No specific deadlines identified.*'
      },
      {
        id: templateSchema.sections.DEPARTMENT_ACTIONS,
        title: '## Department Responsibilities',
        content: templateSchema.variables.DEPARTMENT_LIST,
        required: false,
        fallback: '*Department-specific guidance not yet available.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.RESOURCES,
        title: '## Compliance Resources',
        content: templateSchema.variables.RESOURCES,
        required: false,
        renderIfMissing: true
      }
    ]
  }
};

module.exports = {
  templateSchema,
  defaultTemplates
};