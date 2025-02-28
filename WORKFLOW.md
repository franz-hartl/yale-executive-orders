# Higher Education Executive Orders Analysis Workflow

This document outlines the workflow for updating and maintaining the Higher Education Executive Orders Analysis project, with focus on generating differentiated impact analysis for various institution types.

## Overview

The project follows a sector-wide analysis workflow designed to provide customized guidance for different higher education institution types:

1. Executive orders are collected and preprocessed on your local machine
2. Multi-level institution-specific analysis is generated using Claude AI
3. Differentiated impact assessments are exported to structured static files
4. Institution-adaptive static website is deployed to GitHub Pages

The system analyzes impacts across multiple institution categories including R1/R2 research universities, master's universities, baccalaureate colleges, community colleges, and specialized institutions.

## Complete Workflow

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/yale-executive-orders.git
   cd yale-executive-orders
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create a `.env` file):
   ```
   ANTHROPIC_API_KEY=your_api_key
   ```

### Update Workflow

Follow these steps to add new executive orders, generate institution-specific analysis, and deploy:

1. **Collect New Executive Order Data**
   - Option 1: Add new orders to `financial_executive_orders.csv`
   - Option 2: Fetch new orders automatically:
     ```bash
     node fetch_recent_orders.js
     ```

2. **Update the Institution-Aware Database**
   ```bash
   node database_setup.js
   ```
   This step extends the database schema with tables for institution types, differentiated impacts, and compliance requirements.

3. **Generate Multi-Level Institution-Specific Analysis**
   ```bash
   node generate_plain_summaries.js
   ```
   This generates three tiers of analysis for each executive order:
   - Executive Brief: Concise TL;DR with institution variations noted
   - Standard Summary: Comprehensive analysis with institution-specific impact matrix
   - Comprehensive Analysis: Detailed breakdown with resource requirements by institution size

4. **Export Differentiated Analysis to Static Files**
   ```bash
   node export_to_json.js
   ```
   This exports the institution-specific data structures to static JSON files.

5. **Test Locally with Institution Selection**
   ```bash
   # Copy differentiated analysis to docs folder
   cp -r public/data/* docs/data/
   
   # Start local server
   cd docs
   npx http-server
   ```
   Test the interface by selecting different institution types and verifying that the displayed analysis adapts accordingly.

6. **Deploy to GitHub Pages**
   ```bash
   # Add institution-specific analysis
   git add docs/
   
   # Commit with description of institutional enhancements
   git commit -m "Update executive orders with institution-differentiated analysis"
   
   # Push to GitHub
   git push origin main
   ```

### Automated Workflow

For convenience, use the `update_and_deploy.sh` script to automate steps 2-5:

```bash
./update_and_deploy.sh
```

## Customization Workflow

### Adding Institution Types

1. Edit `database_setup.js` to define new institution types for analysis:
   ```javascript
   // Institution types configuration
   const institutionTypes = [
     'R1 Research Universities',
     'R2 Research Universities',
     'Master\'s Universities',
     'Baccalaureate Colleges',
     'Community Colleges',
     'Specialized Institutions',
     // Add your new institution type here
     'YourNewInstitutionType'
   ];
   ```

2. Update the impact assessment framework to include the new institution type:
   ```javascript
   // Impact matrix configuration
   const impactMatrix = [
     // Existing institution types
     { 
       type: 'R1 Research Universities',
       characteristics: ['High research activity', 'Large federal grant portfolio', 'Graduate programs']
     },
     // Add your new institution type
     { 
       type: 'YourNewInstitutionType',
       characteristics: ['Specific characteristic 1', 'Specific characteristic 2']
     }
   ];
   ```

3. Run the complete update workflow to apply changes.

### Adding Impact Domains

1. Edit `database_setup.js` to add new impact domains for analysis:
   ```javascript
   // Impact domains configuration
   const impactDomains = [
     'Research Funding & Science Policy',
     'Diversity, Equity & Inclusion',
     'Immigration & International Programs',
     'Labor & Employment',
     'Regulatory Compliance',
     // Add your new impact domain here
     'YourNewDomain'
   ];
   ```

2. Update the impact assessment framework to include analysis guidance for the new domain:
   ```javascript
   // Domain analysis guidance
   const domainGuidance = [
     // Existing domains
     {
       domain: 'Research Funding & Science Policy',
       analysisPoints: ['Grant processes', 'Funding priorities', 'Research security']
     },
     // Add your new domain
     {
       domain: 'YourNewDomain',
       analysisPoints: ['Key area 1', 'Key area 2', 'Key area 3']
     }
   ];
   ```

3. Run the complete update workflow to apply changes.

### Customizing the Institution Selection Interface

1. Edit `docs/index.html` to include selector for new institution types.
2. Update CSS styles for institution-specific display elements.
3. Modify JavaScript to handle filtering and display logic for institution-specific content.
4. Test locally with various institution type selections.
5. Commit and push changes to deploy.

## Data Flow Chart

```
[Federal/Government Sources] → fetch_*.js → [Institution-Aware Database] → generate_plain_summaries.js
                                                         ↓                         ↓
                                                         ↓                [Multi-Level Analysis]
                                                         ↓                [Institution-Type Matrix]
                                                         ↓                [Resource Requirements by Size]
                                                         ↓                         ↓
                                                  export_to_json.js  ←  [Differentiated Analysis]
                                                         ↓
                                       [Institution-Adaptive Static Files] → GitHub Pages → [Interactive Website]
                                                                                              [Institution Selector]
```

## Maintenance Tips

1. **Preserve the Institutional Database**: Do not delete `executive_orders.db` as it contains the institution-differentiated analysis and extended schema structure.

2. **Regular Cross-Sector Updates**: Schedule regular runs of the update workflow to add new executive orders and regenerate institution-specific analysis as federal policies evolve.

3. **Backup Institution Analysis**: Regularly back up your database with all differentiated analysis:
   ```bash
   cp executive_orders.db higher_ed_executive_orders.db.backup
   ```

4. **Monitor Institution Complexity**: Be mindful of the complexity introduced by adding many institution types or impact domains, as this affects both analysis quality and performance.

5. **Update Impact Framework**: Periodically review and update the institution impact assessment framework to reflect changing higher education landscape and institutional structures.

6. **Monitor API Usage**: Track your Anthropic API usage when generating multi-level institution-specific analysis, as these detailed analyses require more tokens.

## Troubleshooting

- **Missing Institution-Specific Analysis**: Run `node generate_plain_summaries.js` to create missing multi-level institution analyses.
- **Institution Matrix JSON Errors**: Check the institution type schema with `sqlite3 executive_orders.db "SELECT * FROM institution_types;"`.
- **Inconsistent Institution Display**: Ensure the HTML templates correctly reference institution-specific fields from the JSON structure.
- **Impact Analysis Variations Missing**: Verify that the Claude prompt in `generate_plain_summaries.js` includes instructions for differentiated analysis by institution type.
- **Performance Issues**: If the database becomes large with many institution-specific analyses, consider implementing pagination or filtering in the web interface.