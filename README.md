# Yale University Executive Order Analysis Assistant for Private R1 Institutions

This project provides an AI-powered system for analyzing executive orders and their impact on private R1 research universities through a static GitHub Pages website. The newly refocused tool prioritizes the needs of private research-intensive institutions while still maintaining broader capabilities. The system integrates data from multiple authoritative sources (COGR, NSF, NIH, ACE) to provide comprehensive analysis of executive orders with institution-specific guidance, helping research university administrators understand compliance requirements, operational impacts, and necessary actions through plain language summaries, categorization, and a user-friendly interface.

## Core Features

1. **AI-Enhanced Analysis**: Leverages Claude AI for categorization, plain language summaries, and question answering
2. **University-Focused Classification**: Tailored categorization system specifically for higher education impact
3. **Plain Language Summaries**: Accessible explanations of complex executive orders for non-legal experts
4. **Comprehensive Data Organization**: Well-structured JSON files for executive orders with full-text search and filtering capabilities
5. **Integrated Data Sources**: Combines multiple authoritative sources (COGR, NSF, NIH, ACE) with intelligent merging of analyses
6. **Institution-Specific Guidance**: Provides tailored recommendations for different institution types based on multiple sources
7. **Interactive Interface**: Clean, table-based UI for browsing, filtering, and accessing order details

## System Architecture

The system consists of the following key components:

1. **Local SQLite Database**: Provides structured data storage for local preprocessing
2. **External Source Integration**: Fetches and processes data from authoritative sources
3. **Data Processing Tools**: Scripts for fetching, cleaning, and enhancing executive order data
4. **Enhanced JSON Export**: Exports data with integrated source analysis and institution-specific guidance
5. **AI Integration**: Anthropic Claude API integration for advanced text processing
6. **Static Web Interface**: Pure frontend app that runs entirely in the browser

## Documentation Resources

For comprehensive documentation about the system, please refer to these resources:

- [**Documentation Hub**](DOCUMENTATION.md) - Central entry point to all documentation
- [**Architecture**](ARCHITECTURE.md) - System architecture and components
- [**Data Flow**](DATA_FLOW.md) - How data moves through the system
- [**Extension Guide**](EXTENSION_GUIDE.md) - How to extend and customize the system
- [**Database Schema**](DATABASE_SCHEMA.md) - Reference for the database schema

Recent documentation improvements:
- Added comprehensive architecture documentation
- Created detailed data flow diagrams and explanations
- Documented key architectural decisions and rationales
- Developed extension patterns documentation
- Created detailed database schema reference
- Established a central documentation entry point

## Private R1 University Impact Areas

Executive orders are classified according to their impact on specific private research university domains:

### Research Funding & Security
- Federal research grants and funding priorities
- NSF, NIH, and other agency grant programs
- Research security requirements and export controls
- Specialized research program compliance

### Advanced Research Programs
- National laboratory partnerships
- Strategic research initiatives
- High-priority research areas
- Advanced computing and supercomputing resources

### International Collaboration
- Visa regulations for international faculty and researchers
- Global academic partnerships
- Scholar mobility and exchange programs
- International research security compliance

### Endowment Management
- Investment policy regulations
- Reporting requirements for large endowments
- Financial regulations affecting institutional investments
- Donor relationships and gift management compliance

### Graduate Education
- Graduate student funding mechanisms
- Postdoctoral researcher regulations
- Advanced degree program requirements
- Specialized fellowship and training grant compliance

### Public-Private Partnerships
- University-industry collaboration frameworks
- Technology transfer and commercialization
- Economic development initiatives
- Research park and innovation district regulations

## Prerequisites

- Node.js (v16 or later)
- Anthropic API key (for AI-powered data processing)
- Internet connection (for data collection)

## Getting Started

### 1. Environment Setup

Create a `.env` file in the project root directory with:

```
# Required for AI functionality
ANTHROPIC_API_KEY=your_api_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Update the Database (Local Preprocessing)

```bash
# Set up the SQLite database with current executive orders
node database_setup.js

# Generate plain language summaries for new executive orders
node generate_plain_summaries.js
```

### 4. Export Data to Static Files

```bash
# Export all data to JSON files for the static app with enhanced source integration
npm run export

# Export and test the enhanced JSON structure
npm run export:test
```

The export process now includes sophisticated integration of external source data with:
- Normalized source attribution with standardized metadata
- Combined analysis that merges perspectives from multiple sources
- Institution-specific guidance tailored for different university types
- Source-attributed impact analysis showing consensus across sources

For complete details on the enhanced JSON structure, see `ENHANCED_JSON_STRUCTURE.md`.

### 5. Test the Static Website Locally

```bash
# Use any static file server (e.g., http-server)
cd docs
npx http-server
```

### 6. Deploy to GitHub Pages

Once you've exported your data and tested locally, you can deploy to GitHub Pages:

1. Copy data from public/ to docs/ (if not already there)
2. Commit and push changes to GitHub
3. Configure GitHub Pages to serve from the docs/ folder

For detailed deployment instructions, see `GITHUB_PAGES_INSTRUCTIONS.md`.

## Workflow for Updates

The enhanced workflow for updating the system is:

1. **Executive Order Collection**: Run appropriate fetch_*.js scripts to gather new executive orders
2. **Database Update**: Add new data to the SQLite database using database_setup.js
3. **AI Processing**: Generate summaries and categorizations with generate_plain_summaries.js
4. **External Source Integration**: Fetch data from authoritative sources with fetch_external_sources.js
5. **Enhanced JSON Export**: Export processed data with integrated source analysis using export_to_json.js
6. **Testing**: Verify enhanced JSON structure with test_enhanced_export_structure.js
7. **GitHub Pages Update**: Copy to docs/ folder and push to GitHub

For detailed workflow instructions, see WORKFLOW.md.

## Data Processing Tools

The project includes several tools for local data processing:

- **fetch_*.js** scripts: Collect executive orders from various sources
- **fetch_external_sources.js**: Fetch and integrate external authoritative source data
- **database_setup.js**: Configure SQLite database with executive order data
- **generate_plain_summaries.js**: Create AI-generated plain language summaries
- **export_to_json.js**: Export data to static JSON with enhanced source integration
- **test_enhanced_export_structure.js**: Test the enhanced JSON structure

## Customization

### Adding New Executive Orders

You can add new executive orders in several ways:

1. **CSV Import**: Add new orders to `financial_executive_orders.csv` and run `node database_setup.js`
2. **Direct Database**: Use SQLite tools to add records directly to the executive_orders table
3. **API Scraping**: Modify the fetch_*.js scripts to capture additional orders

### Generating Plain Language Summaries

To create plain language summaries for executive orders:

```bash
node generate_plain_summaries.js
```

This will:
- Identify orders without summaries in the database
- Generate ~400 word summaries using Claude-3-Opus
- Format with Yale's color scheme and clear structure
- Save the HTML-formatted summaries to the database

## Project Documentation

The project includes several documentation files:

- `PRIVATE_R1_FOCUS.md`: Details on the refocus to private R1 institutions
- `GITHUB_PAGES_INSTRUCTIONS.md`: Detailed guide for GitHub Pages deployment
- `AI_PIPELINE_EXPLANATION.md`: Details of the AI integration
- `PROJECT_STRUCTURE.md`: Overview of the project files and architecture
- `ENHANCED_JSON_STRUCTURE.md`: Documentation of the enhanced JSON export with integrated source data
- `DATA_SOURCES.md`: Information about external data sources and integration
- `WORKFLOW.md`: Step-by-step workflow for updating the system
- `API_README.md`: API documentation with enhanced JSON structure details
- `PHASE5_SUMMARY.md`: Summary of the enhanced JSON export implementation

## Private R1 Focus Implementation

With the 1.3.0 update, the application has been refocused to prioritize private R1 research universities in two phases:

### Phase 1: Schema and Taxonomy Refinement
1. **Specialized Impact Areas**: Redefined to address research-intensive university needs
2. **Institution Type Prioritization**: Private R1 institutions now receive highest priority
3. **Default Focus**: UI and data presentation prioritize private research university perspectives
4. **Schema Optimization**: Database and export functions maintain compatibility while prioritizing R1-relevant fields

For complete details on Phase 1, see `PRIVATE_R1_FOCUS.md`.

### Phase 2: AI Prompt and Analysis Refinement
1. **R1-Focused AI Prompts**: Complete overhaul of AI system prompts to focus on private R1 perspectives
2. **Analysis Structure Redesign**: Specialized templates with R1-specific research impact sections
3. **Content Prioritization**: Enhanced focus on research security, funding, and international collaboration
4. **Specialized Content Areas**: New sections for research competitiveness, talent acquisition, and institutional autonomy
5. **Reanalysis System**: New script to identify and regenerate the most relevant executive orders for private R1s

For complete details on Phase 2, see `PRIVATE_R1_PROMPTS.md`.