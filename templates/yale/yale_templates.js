/**
 * yale_templates.js
 * 
 * Yale-specific templates for executive order information.
 * Following "Essential Simplicity" design philosophy.
 */

const { templateSchema } = require('../../models/template_schema');

/**
 * Yale-specific templates
 */
const yaleTemplates = {
  // Yale executive brief template
  YALE_EXECUTIVE_BRIEF: {
    name: 'Yale Executive Brief',
    description: 'Concise summary for Yale leadership',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Yale Executive Brief: Executive Order {{order_number}}\n` +
                 `## {{title}}\n\n` +
                 `*Issued by President {{president}} on {{signing_date:date}}*\n\n` +
                 `*Status: {{status}}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: templateSchema.sections.SUMMARY,
        title: '### Summary',
        content: `{{summary}}`,
        required: true,
        fallback: '*No summary available.*'
      },
      {
        id: templateSchema.sections.YALE_IMPACT,
        title: '### Yale Impact',
        content: `{{yale_impact_areas_list}}`,
        required: true,
        fallback: '*Yale-specific impact assessment not yet available.*'
      },
      {
        id: 'key_deadlines',
        title: '### Key Deadlines',
        content: `{{deadlines_list}}`,
        required: false,
        fallback: '*No specific deadlines identified for Yale University.*',
        renderIfMissing: true
      },
      {
        id: 'priority_actions',
        title: '### Priority Actions',
        content: `{{yale_compliance_actions_list}}`,
        required: false,
        renderIfMissing: false
      },
      {
        id: 'contacts',
        title: '### Key Contacts',
        content: `{{yale_contact_info}}`,
        required: false,
        renderIfMissing: true,
        fallback: '**Questions?** Contact the Office of the General Counsel or Office of Research Administration.'
      }
    ]
  },
  
  // Yale comprehensive analysis template
  YALE_COMPREHENSIVE: {
    name: 'Yale Comprehensive Analysis',
    description: 'Detailed analysis with Yale-specific context',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Yale Analysis: Executive Order {{order_number}}\n` +
                 `## {{title}}\n\n` +
                 `*Issued by President {{president}} on {{signing_date:date}}*\n\n` +
                 `*Status: {{status}}*\n\n` +
                 `*Overall University Impact: {{formatted_impact_level}}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: templateSchema.sections.SUMMARY,
        title: '## Executive Summary',
        content: `{{summary}}`,
        required: true,
        fallback: '*No summary available.*'
      },
      {
        id: templateSchema.sections.KEY_POINTS,
        title: '## Key Points',
        content: `{{key_points}}`,
        required: false,
        fallback: '*Key points analysis not yet available.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.BACKGROUND,
        title: '## Background',
        content: `{{background}}`,
        required: false,
        renderIfMissing: false
      },
      {
        id: 'yale_institutional_context',
        title: '## Yale Institutional Context',
        content: `{{institution_info}}\n\n` +
                 `As a leading private research university, Yale has specific considerations related to this executive order, particularly in the areas of {{categories_list}}.\n\n` +
                 `The following analysis addresses the Yale-specific implications and requirements.`,
        required: true,
        renderEmpty: true
      },
      {
        id: templateSchema.sections.YALE_IMPACT,
        title: '## Impact on Yale University',
        content: `### Impact Areas\n\n` +
                 `{{yale_impact_areas_list}}\n\n` +
                 `### Affected Yale Departments\n\n` +
                 `{{yale_departments_list}}`,
        required: true,
        fallback: '*Yale-specific impact assessment is in progress.*'
      },
      {
        id: templateSchema.sections.REQUIREMENTS,
        title: '## Compliance Requirements',
        content: `{{requirements_list}}\n\n` +
                 `### Yale-Specific Requirements\n\n` +
                 `{{yale_compliance_actions_list}}`,
        required: false,
        fallback: '*Compliance requirement analysis is in progress.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.DEADLINES,
        title: '## Implementation Timeline',
        content: `{{deadlines_list}}`,
        required: false,
        fallback: '*No specific deadlines identified at this time.*',
        renderIfMissing: true
      },
      {
        id: 'information_conflicts',
        title: '## Information Conflicts',
        content: `{{conflicts_list}}`,
        required: false,
        renderIfMissing: false
      },
      {
        id: 'next_steps',
        title: '## Recommended Next Steps',
        content: `{{next_steps}}`,
        required: false,
        fallback: '*Detailed next steps will be provided as implementation guidelines develop.*',
        renderIfMissing: true
      },
      {
        id: templateSchema.sections.RESOURCES,
        title: '## Resources and References',
        content: `* [Full Executive Order Text]({{url}})\n` +
                 `* [Yale Office of Research Administration](https://research.yale.edu)\n` +
                 `* [Yale Compliance Portal](https://compliance.yale.edu)\n` +
                 `{{resources}}`,
        required: false,
        renderIfMissing: true
      },
      {
        id: 'footer',
        title: '',
        content: `---\n\n*This analysis was prepared by the Yale Executive Orders Analysis Team. Last updated: {{last_updated:date}}*`,
        required: true,
        renderEmpty: true
      }
    ]
  },
  
  // Yale compliance checklist template
  YALE_COMPLIANCE_CHECKLIST: {
    name: 'Yale Compliance Checklist',
    description: 'Actionable checklist for compliance tracking',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Yale Compliance Checklist: EO {{order_number}}\n` +
                 `## {{title}}\n\n` +
                 `*Issued: {{signing_date:date}} | Status: {{status}}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: 'overview',
        title: '## Overview',
        content: `{{executive_brief}}`,
        required: false,
        fallback: '*Brief summary not available.*',
        renderIfMissing: true
      },
      {
        id: 'key_dates',
        title: '## Key Dates',
        content: `{{deadlines_list}}`,
        required: true,
        fallback: '*No specific deadlines identified.*'
      },
      {
        id: 'required_actions',
        title: '## Required Actions',
        content: `{{yale_compliance_actions_list}}`,
        required: true,
        fallback: '*No required compliance actions identified.*'
      },
      {
        id: 'affected_departments',
        title: '## Affected Departments',
        content: `{{yale_departments_list}}`,
        required: false,
        renderIfMissing: false
      },
      {
        id: 'contacts',
        title: '## Department Contacts',
        content: `{{yale_contact_info}}`,
        required: true,
        fallback: '*Department contact information not available.*'
      },
      {
        id: templateSchema.sections.RESOURCES,
        title: '## Resources',
        content: `* [Full Executive Order Text]({{url}})\n` +
                 `* [Yale Compliance Portal](https://compliance.yale.edu)\n` +
                 `{{resources}}`,
        required: false,
        renderIfMissing: true
      }
    ]
  },
  
  // Yale departmental guidance template
  YALE_DEPARTMENT_GUIDANCE: {
    name: 'Yale Departmental Guidance',
    description: 'Specific guidance for Yale departments',
    sections: [
      {
        id: templateSchema.sections.HEADER,
        title: '',
        content: `# Departmental Guidance: EO {{order_number}}\n` +
                 `## {{title}}\n\n` +
                 `*For: {{department_name}}*\n\n` +
                 `*Issued: {{signing_date:date}} | Status: {{status}}*\n\n`,
        required: true,
        renderEmpty: true
      },
      {
        id: 'department_impact',
        title: '## Impact on Your Department',
        content: `{{department_impact}}`,
        required: true,
        fallback: '*Department-specific impact analysis not yet available.*'
      },
      {
        id: 'department_actions',
        title: '## Required Actions',
        content: `{{department_actions}}`,
        required: true,
        fallback: '*No specific actions required for your department at this time.*'
      },
      {
        id: 'timeline',
        title: '## Timeline',
        content: `{{department_timeline}}`,
        required: false,
        fallback: '*No specific deadlines identified for your department.*',
        renderIfMissing: true
      },
      {
        id: 'contacts',
        title: '## Support Contacts',
        content: `For assistance with compliance requirements related to this executive order, please contact:\n\n` +
                 `* **Primary Contact:** {{primary_contact}} ({{primary_email}})\n` +
                 `* **Compliance Support:** {{compliance_contact}} ({{compliance_email}})\n` +
                 `* **Legal Guidance:** {{legal_contact}} ({{legal_email}})`,
        required: true,
        renderEmpty: true
      },
      {
        id: 'resources',
        title: '## Resources',
        content: `* [Full Executive Order Text]({{url}})\n` +
                 `* [Department Compliance Toolkit](https://compliance.yale.edu/toolkit)\n` +
                 `* [FAQ for Departments](https://compliance.yale.edu/faq)\n` +
                 `{{department_resources}}`,
        required: false,
        renderIfMissing: true
      }
    ]
  }
};

module.exports = {
  yaleTemplates
};