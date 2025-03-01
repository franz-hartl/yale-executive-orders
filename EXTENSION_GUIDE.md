# Yale Executive Orders Extension Guide

This guide explains how to extend and customize the Yale Executive Orders system for different use cases, including adding new institutions, data sources, and customizing the analysis.

## Extension Philosophy

The system follows these principles for extensions:

1. **Core/Extension Separation**: Core functionality remains institution-neutral
2. **Clean Interfaces**: Extensions interact through well-defined contracts
3. **Progressive Enhancement**: Extensions enhance but don't replace core functionality
4. **Minimal Coupling**: Extensions avoid direct dependencies on each other
5. **Configuration-Driven**: Most customizations are possible through configuration

## Extension Points

The system provides several extension points:

## 1. Institution-Specific Extensions

### Adding a New Institution

To add support for a new institution (e.g., Harvard):

1. **Create Institution Tables**:
   - Define institution-specific tables in `schema.js`
   - Example:
     ```javascript
     harvard_tables: {
       harvard_impact_areas: {
         id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
         name: 'TEXT UNIQUE NOT NULL',
         description: 'TEXT',
         related_r1_area_id: 'INTEGER NULL'
       },
       // Additional tables as needed
     }
     ```

2. **Add Formatter Extensions**:
   - Extend `createInstitutionExtensions()` in `export/formatters.js`:
     ```javascript
     case 'harvard':
       extensions.harvard = {
         relevance_score: order.harvard_guidance?.harvard_university?.relevance_score || 5,
         affected_departments: order.harvard_guidance?.harvard_university?.affected_departments || [],
         // Additional Harvard-specific fields
       };
       break;
     ```

3. **Update Exporter**:
   - Add institution-specific export logic in `export/exporter.js`:
     ```javascript
     async exportInstitutionSpecificData(institutionId) {
       // Existing Yale code...
       
       if (institutionId === 'harvard') {
         // Harvard-specific export logic
       }
     }
     ```

4. **Create Institution Data**:
   - Add institution-specific folders/files:
     - `harvard_specific_data/harvard_impact_areas.json`
     - `harvard_specific_data/harvard_stakeholders.json`

5. **Update UI for Institution**:
   - Add institution selector option in `docs/index.html`
   - Add CSS theme variables for the institution

### Extending Data Schema

To add new institution-specific fields:

1. **Update the Data Contract**:
   - Add extension fields in `data_contracts/order_output_schema.js`:
     ```javascript
     extensionPoints: {
       // Existing extension points...
       
       // New extension point
       institutionSpecificRankings: "object[]"
     }
     ```

2. **Add Database Schema**:
   - Define new tables or fields in `schema.js`

3. **Update Formatters**:
   - Add support for new fields in `formatters.js`

## 2. Source Integration Extensions

### Adding a New Data Source

To integrate a new data source (e.g., Department of Education):

1. **Create Source Module**:
   - Create `sources/education_source.js` extending `base_source.js`:
     ```javascript
     const BaseSource = require('./base_source');
     
     class EducationSource extends BaseSource {
       constructor() {
         super({
           name: 'Department of Education',
           description: 'Education department data source',
           priority: 3,
           attribution: 'Department of Education'
         });
       }
       
       async fetchData() {
         // Implement source-specific fetch logic
       }
       
       processData(data) {
         // Implement source-specific processing
       }
     }
     
     module.exports = EducationSource;
     ```

2. **Register Source**:
   - Add to `sources/source_registry.js`:
     ```javascript
     const EducationSource = require('./education_source');
     
     // In registerSources function
     this.sources.push(new EducationSource());
     ```

3. **Integrate Fetch Logic**:
   - Update `fetch_external_sources.js` to include the new source

4. **Add Source Attribution**:
   - Update UI to display the new source with proper attribution

### Customizing Source Priority

To change how sources are prioritized and conflicts are resolved:

1. **Modify Source Registry Priority Logic**:
   - Update the conflict resolution logic in `source_registry.js`
   - Adjust the priority values for different sources

2. **Define Source-Specific Impact Areas**:
   - Add impact areas specific to the source in the database

## 3. AI Analysis Extensions

### Customizing Analysis Templates

To modify or extend the AI analysis:

1. **Create Custom Templates**:
   - Add new templates in `templates/` directory:
     - `templates/specialized_analysis_template.md`
     - `templates/department_specific_template.md`

2. **Update Analysis Scripts**:
   - Modify `generate_plain_summaries.js` to use the new templates
   - Add template selection logic based on order type

3. **Extend AI Prompts**:
   - Modify prompts in `PRIVATE_R1_PROMPTS.md` for specialized analysis

### Adding New Analysis Types

To add entirely new types of analysis:

1. **Define Analysis Schema**:
   - Add new fields in `schema.js` for the analysis type:
     ```javascript
     risk_assessment: 'TEXT',
     compliance_timeline: 'TEXT',
     ```

2. **Create Analysis Script**:
   - Create a new script (e.g., `generate_risk_assessments.js`)

3. **Update Export Logic**:
   - Modify `export/formatters.js` to include the new analysis
   - Add new files to the export in `export/exporter.js`

## 4. Presentation Extensions

### Customizing the UI

To modify the user interface:

1. **Theme Customization**:
   - Edit CSS variables in `docs/index.html` for colors, fonts, etc.
   - Create institution-specific themes

2. **Layout Modifications**:
   - Update the HTML structure in `docs/index.html`
   - Modify the responsive design breakpoints

3. **Component Customization**:
   - Update JavaScript code for interactive components
   - Add new filtering or visualization components

### Building Alternative Frontends

To create a completely different frontend:

1. **Use the Data Contract**:
   - Build against the defined JSON structure in `data_contracts/order_output_schema.js`
   - Use the static JSON files exported to the `docs/data/` directory

2. **Alternative Framework Options**:
   - React: Use the JSON data with a React frontend
   - Vue: Build a Vue-based UI using the data contracts
   - Mobile App: Create a native app using the exported data

## 5. Workflow Extensions

### Customizing the Update Process

To modify the update and deployment workflow:

1. **Update the Shell Script**:
   - Modify `update_and_deploy.sh` for custom workflows
   - Add institution-specific processing steps

2. **Create Custom Update Scripts**:
   - Add specialized scripts for different update scenarios
   - Build automated CI/CD workflows

### Adding Notifications

To add notifications for new orders:

1. **Create Notification Module**:
   - Build a notification system (email, Slack, etc.)
   - Integrate with the update process

2. **Add Monitoring**:
   - Create scripts to monitor for new executive orders
   - Set up scheduled checks and alerts

## Real-World Extension Examples

### Example 1: Adding Stanford University

```javascript
// In schema.js
stanford_tables: {
  stanford_impact_areas: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT UNIQUE NOT NULL',
    description: 'TEXT',
    related_r1_area_id: 'INTEGER NULL'
  },
  stanford_departments: {
    id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
    name: 'TEXT UNIQUE NOT NULL',
    description: 'TEXT',
    contact_info: 'TEXT'
  }
},

// In formatters.js
case 'stanford':
  extensions.stanford = {
    relevance_score: order.stanford_guidance?.stanford_university?.relevance_score || 5,
    affected_departments: order.stanford_guidance?.stanford_university?.affected_departments || [],
    primary_schools: order.stanford_guidance?.stanford_university?.primary_schools || [],
    action_items: order.stanford_guidance?.stanford_university?.action_items || []
  };
  break;
```

### Example 2: Adding Congressional Research Service as a Source

```javascript
// In sources/crs_source.js
const BaseSource = require('./base_source');
const axios = require('axios');
const cheerio = require('cheerio');

class CongressionalResearchSource extends BaseSource {
  constructor() {
    super({
      name: 'Congressional Research Service',
      description: 'Analysis from the Congressional Research Service',
      priority: 4,
      attribution: 'CRS'
    });
  }
  
  async fetchData() {
    // Implementation for fetching CRS reports
  }
  
  processData(data) {
    // Implementation for processing CRS analysis
  }
}

module.exports = CongressionalResearchSource;
```

### Example 3: Adding Financial Risk Analysis

```javascript
// In schema.js, add to executive_orders table
financial_risk_analysis: 'TEXT',
budget_impact_assessment: 'TEXT',

// Create generate_financial_analysis.js
const Database = require('./utils/database');
const axios = require('axios');

async function generateFinancialAnalysis() {
  const db = new Database();
  await db.connect();
  
  // Get orders without financial analysis
  const orders = await db.all(`
    SELECT * FROM executive_orders 
    WHERE financial_risk_analysis IS NULL
    AND impact_level IN ('Critical', 'High')
  `);
  
  // Generate and save analysis
  // ...
}

// Update formatters.js to include new fields
// ...
```

## Best Practices for Extensions

1. **Follow the Core Philosophy**:
   - Maintain the "Essential Simplicity" design approach
   - Keep extensions focused and purpose-driven

2. **Preserve Clean Interfaces**:
   - Use defined extension points rather than modifying core code
   - Establish clear contracts for each extension

3. **Document Extensions**:
   - Create documentation for your extensions
   - Update this guide with new extension patterns

4. **Test Extensions Thoroughly**:
   - Create tests for extension functionality
   - Verify that extensions work with the core system

5. **Consider Upstream Contributions**:
   - If an extension has general utility, consider contributing it to the core
   - Share institution-neutral extensions with the community

## Conclusion

The Yale Executive Orders system is designed to be extensible at multiple levels. By following this guide, you can customize the system for different institutions, add new data sources, create custom analysis types, and build alternative frontends while maintaining compatibility with the core system.