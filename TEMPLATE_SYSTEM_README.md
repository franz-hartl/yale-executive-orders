# Template System for Yale Executive Orders

## Overview

The Template System provides a flexible and extensible way to generate consistent documents from executive order information. It supports various output formats, handles missing information gracefully, and includes Yale-specific components for institutional context.

## Key Features

- **Flexible Templates**: Predefined templates for different purposes (brief summaries, detailed analyses, compliance guides)
- **Variable Substitution**: Easy insertion of data into templates with fallbacks for missing information
- **Custom Formatting**: Format dates, lists, and other data consistently
- **Yale-Specific Components**: Templates and renderers designed for Yale's institutional context
- **Department-Specific Templates**: Create templates tailored to specific Yale departments
- **Template Validation**: Check if available data is sufficient for a given template
- **Section Rendering**: Render specific sections of templates as needed

## System Components

### Core Files

- **models/template_schema.js**: Schema definitions for templates
- **templates/template_manager.js**: Central manager for all templates
- **templates/renderers/base_renderer.js**: Base renderer with common functionality
- **templates/renderers/order_renderer.js**: Specialized renderer for executive orders
- **templates/yale/yale_renderer.js**: Yale-specific renderer
- **templates/yale/yale_templates.js**: Yale-specific template definitions

## Available Templates

The system includes several built-in templates:

### Standard Templates

- **executive_brief**: Short 1-2 paragraph summary for executives
- **standard_summary**: Standard detailed summary
- **detailed_analysis**: Comprehensive analysis with details
- **compliance_guide**: Compliance-focused guidance
- **impact_assessment**: Impact assessment for universities

### Yale-Specific Templates

- **yale_brief**: Yale-specific executive brief
- **YALE_EXECUTIVE_BRIEF**: Concise summary for Yale leadership
- **YALE_COMPREHENSIVE**: Detailed analysis with Yale-specific context
- **YALE_COMPLIANCE_CHECKLIST**: Actionable checklist for compliance tracking
- **YALE_DEPARTMENT_GUIDANCE**: Specific guidance for Yale departments

## Usage Examples

### Basic Template Rendering

```javascript
const TemplateManager = require('./templates/template_manager');

// Initialize template manager
const templateManager = new TemplateManager();

// Get executive order data
const orderData = {
  order_number: "14110",
  title: "Example Executive Order",
  president: "Sanders",
  signing_date: "2025-01-15",
  // ... other data
};

// Render a standard summary
const summary = templateManager.renderTemplate(
  orderData,
  'standard_summary'
);

console.log(summary);
```

### Yale-Specific Template Rendering

```javascript
// Render a Yale-specific brief
const yaleBrief = templateManager.renderTemplate(
  orderData,
  'YALE_EXECUTIVE_BRIEF'
);

console.log(yaleBrief);

// Generate a compliance checklist
const checklist = templateManager.generateComplianceChecklist(orderData);
console.log(checklist);
```

### Creating Department-Specific Templates

```javascript
// Create a template for a specific department
const deptTemplateId = templateManager.createDepartmentTemplate('Computer Science Department');

// Add department-specific data
const deptData = {
  ...orderData,
  department_name: 'Computer Science Department',
  department_impact: 'Description of impact on CS department...',
  department_actions: 'List of required actions...',
  // ... other department-specific data
};

// Render the department template
const deptGuidance = templateManager.renderTemplate(
  deptData,
  deptTemplateId
);

console.log(deptGuidance);
```

### Template Validation

```javascript
// Check if data is sufficient for a template
const validation = templateManager.validateData(
  orderData,
  'standard_summary'
);

if (validation.isValid) {
  console.log('Data is complete for template');
} else {
  console.log(`Missing fields: ${validation.missingFields.join(', ')}`);
}
```

### Rendering Individual Sections

```javascript
// Render just the impact section
const impactSection = templateManager.renderSection(
  orderData,
  'YALE_COMPREHENSIVE',
  'impact_analysis'
);

console.log(impactSection);
```

## Template Structure

Templates are defined as a collection of sections, each with specific content and behavior:

```javascript
{
  name: 'Template Name',
  description: 'Template description',
  sections: [
    {
      id: 'section_id',
      title: '## Section Title',
      content: 'Section content with {{variables}}',
      required: true,                  // Whether section is required
      fallback: 'Text if data missing', // Fallback content
      renderIfMissing: true,           // Whether to render if data missing
      renderEmpty: false,              // Whether to render empty sections
      showTitle: true                  // Whether to show the section title
    },
    // More sections...
  ]
}
```

## Template Variables

Templates use double curly braces to indicate variables:

```
# Executive Order {{order_number}}: {{title}}
*Issued by President {{president}} on {{signing_date}}*

## Summary
{{summary}}
```

### Formatting Variables

You can apply formatters to variables using a colon:

```
Signing Date: {{signing_date:date}}
Impact Level: {{impact_level:impactLevel}}
```

## Customizing Templates

You can customize existing templates or create new ones:

```javascript
// Customize an existing template
const customTemplateId = templateManager.customizeTemplate(
  'standard_summary',
  {
    name: 'Custom Summary',
    description: 'My customized summary template',
    sections: [
      {
        id: 'header',
        content: 'Modified header content...'
      },
      {
        id: 'new_section',
        title: '## New Section',
        content: 'Content for the new section...',
        required: false
      }
    ]
  },
  'my_custom_template'
);

// Render with the custom template
const customOutput = templateManager.renderTemplate(
  orderData,
  customTemplateId
);
```

## Yale-Specific Considerations

The template system has been designed with Yale's specific needs in mind:

1. **Institutional Context**: Templates include Yale's institutional context
2. **Department Structure**: Support for Yale's departmental organization
3. **Compliance Framework**: Integration with Yale's compliance workflows
4. **Visual Identity**: Consistent formatting aligned with Yale's style guidelines
5. **Targeted Guidance**: Department-specific guidance for impact areas

## Data Structure

Templates expect executive order data in a specific structure. Key fields include:

- **Basic Information**: `order_number`, `title`, `president`, `signing_date`
- **Content**: `summary`, `full_text`
- **Metadata**: `status`, `impact_level`, `url`
- **Categories and Areas**: `categories`, `impact_areas`
- **Requirements and Deadlines**: `requirements`, `deadlines`
- **Yale-Specific Fields**: `yale_impact_areas`, `yale_departments`, `yale_compliance_actions`

See the example data in `template_example.js` for a complete sample.

## Extending the System

The template system is designed for extension:

1. **New Templates**: Add new templates for specific purposes
2. **Custom Renderers**: Create specialized renderers for different output formats
3. **Additional Formatters**: Add new formatters for specific data types
4. **Integration Points**: The system works with both the Knowledge Representation and Conflict Handling systems

## Error Handling

The template system handles errors gracefully:

- **Missing Data**: Provides fallbacks for missing information
- **Template Not Found**: Returns clear error messages
- **Rendering Errors**: Captures and reports rendering errors
- **Validation**: Validates data before rendering

## Running the Example

To see the template system in action:

```
node template_example.js
```

This will generate example outputs in the `template_output` directory.