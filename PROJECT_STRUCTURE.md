# Higher Education Executive Order Analysis Project Structure

This document outlines the structure of the Higher Education Executive Order Analysis project, focusing on the data processing pipeline and sector-wide analysis capabilities.

## Project Overview

This project provides a comprehensive analysis platform for tracking executive orders and their differentiated impacts across the higher education sector. The system:

1. Collects and processes executive orders from government sources
2. Uses AI to generate differentiated impact analysis based on institution type
3. Presents customized guidance for different types of higher education institutions
4. Exports processed data to static JSON files for JAMstack web deployment

The project follows a preprocessing-to-static deployment model, providing several benefits:
- Comprehensive sector-wide analysis relevant to all higher education institutions
- Institution-specific impact assessments based on type, size, and mission
- Fast and responsive user experience through static website deployment
- Easy updates through a well-defined AI analysis pipeline

## Key Directories

- `/`: Root directory containing configuration and main processing scripts
- `/docs/`: The GitHub Pages website directory (deployed to production)
- `/public/`: Development version of the static website
- `/data/`: Directory for raw data files
- `/templates/`: Templates for sector-wide impact analysis and implementation guides

## Important Files

### Core Analysis Scripts

- `database_setup.js`: Sets up the SQLite database with extended tables for institution-specific analysis
- `generate_plain_summaries.js`: Creates AI-generated multi-level summaries with institution-specific impact analysis
- `export_to_json.js`: Exports processed data to static JSON with differentiated impact data
- `update_and_deploy.sh`: Shell script to automate the update and deployment process

### Data Collection Scripts

- `fetch_orders.js`: Main script for fetching executive orders
- `fetch_recent_orders.js`: Fetches only recent executive orders
- `fetch_historical_orders.js`: Fetches historical executive orders
- `fetch_whitehouse_orders.js`: Fetches orders directly from whitehouse.gov

### Institution Analysis Framework

- `impact_assessment_framework.md`: Framework for evaluating impacts across institution types
- `executive_order_impact_scoring.md`: Quantitative methodology for comparing impacts
- `sector_wide_template.md`: Template for comprehensive sector-wide analysis
- `executive_brief_template.md`: Template for executive leadership summaries
- `implementation_checklist_template.md`: Template for tracking compliance

### Database Files

- `executive_orders.db`: SQLite database with extended tables for institutional differentiation
- `financial_executive_orders.csv`: Raw CSV data for import

### Static Website Files

- `docs/index.html`: Main entry point for the static website with institution type selector
- `docs/data/*.json`: Static JSON files with institution-differentiated impact data
- `docs/data/summaries/*.html`: HTML files with multi-level, institution-specific analysis

## Data Flow

The data flows through the system in these stages:

1. **Collection**: Raw data is gathered from various sources using fetch_*.js scripts
2. **Storage**: Data is stored in the SQLite database with extended institutional schema
3. **AI Analysis**: Multi-level summaries are generated with differentiated impact analysis:
   - Executive Brief (TL;DR): Concise 1-2 sentence summary with key institutional variations
   - Standard Summary: Comprehensive analysis with institution-specific impact matrix
   - Comprehensive Analysis: Detailed breakdown with institution-type impact tables and compliance requirements
4. **Differentiation**: Impact analysis is categorized by institution type and size:
   - R1/R2 Research Universities
   - Master's Universities
   - Baccalaureate Colleges
   - Community Colleges
   - Specialized Institutions
   - Public vs. Private considerations
5. **Export**: Processed data with institution-specific analysis is exported to static JSON files
6. **Deployment**: Static files with institutional variations are deployed to GitHub Pages

## Development Workflow

1. **Local Development**:
   - Extend database schema in database_setup.js for institutional differentiation
   - Enhance AI analysis templates in generate_plain_summaries.js for multi-level summaries
   - Test changes with representative executive orders across different domains

2. **Institutional Analysis Enrichment**:
   - Create detailed impact assessment frameworks for different institution types
   - Define quantitative scoring methodologies for comparing impacts
   - Develop institution-specific compliance templates and implementation checklists

3. **Testing**:
   - Export data with institution differentiation using export_to_json.js
   - Test the static website with various institution type selections
   - Verify that analysis is properly tailored to each institution category

4. **Deployment**:
   - Run update_and_deploy.sh to perform all steps automatically
   - Commit changes to the docs/ folder with extended institutional analysis
   - Push to GitHub to update the live site

## Additional Notes

- The platform provides differentiated analysis for diverse institution types and sizes
- All institution-specific processing happens during the AI analysis phase, not at runtime
- The project separates common impact analysis from institution-specific guidance
- The AI pipeline uses Claude API for generating institution-differentiated summaries
- The HTML templates dynamically adapt to show content relevant to the selected institution type
- Impact analyses include not just Yale-specific considerations but sector-wide implications