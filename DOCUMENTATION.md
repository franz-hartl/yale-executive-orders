# Yale Executive Orders Project Documentation

This document serves as the main entry point to the Yale Executive Orders project documentation. Use this guide to find specific information about the system.

## System Overview

The Yale Executive Orders project is a comprehensive system for analyzing executive orders and their impact on private R1 research universities. The system follows a preprocessing-to-static deployment model, which provides:

- Comprehensive analysis relevant to higher education institutions
- Institution-specific impact assessments based on type and mission
- Fast and responsive user experience through static website deployment
- Extensible AI analysis pipeline

## Documentation Structure

The documentation is organized into several key areas:

### Core Architecture

- [**ARCHITECTURE.md**](ARCHITECTURE.md) - Overview of the system architecture and components
- [**DATA_FLOW.md**](DATA_FLOW.md) - Detailed explanation of how data flows through the system
- [**DECISION_LOG.md**](DECISION_LOG.md) - Key architectural decisions and their rationales

### Database

- [**README-DATABASE.md**](README-DATABASE.md) - Database API usage guide
- [**DATABASE_SCHEMA.md**](DATABASE_SCHEMA.md) - Detailed database schema reference
- [**DB_MIGRATION_GUIDE.md**](DB_MIGRATION_GUIDE.md) - Guide for migrating between schema versions

### Extension and Customization

- [**EXTENSION_GUIDE.md**](EXTENSION_GUIDE.md) - How to extend and customize the system
- [**PRIVATE_R1_FOCUS.md**](PRIVATE_R1_FOCUS.md) - Private R1 institution focus implementation
- [**YALE_SPECIFIC_APPROACH.md**](YALE_SPECIFIC_APPROACH.md) - Yale-specific extensions

### Data Integration

- [**DATA_SOURCES.md**](DATA_SOURCES.md) - External data sources and integration
- [**MODULAR_DATA_SOURCES.md**](MODULAR_DATA_SOURCES.md) - Modular source integration system
- [**SOURCE_INTEGRATION.md**](external_sources/SOURCE_INTEGRATION.md) - Guide for integrating new sources

### AI Processing

- [**AI_PIPELINE_EXPLANATION.md**](AI_PIPELINE_EXPLANATION.md) - AI processing pipeline details
- [**PRIVATE_R1_PROMPTS.md**](PRIVATE_R1_PROMPTS.md) - AI prompts for R1 institution analysis
- [**TEMPLATES.md**](templates/README.md) - Templates for structured AI analysis

### Deployment

- [**GITHUB_PAGES_INSTRUCTIONS.md**](GITHUB_PAGES_INSTRUCTIONS.md) - GitHub Pages deployment guide
- [**WORKFLOW.md**](WORKFLOW.md) - Step-by-step workflow for updates and deployment

### Data Formats

- [**ENHANCED_JSON_STRUCTURE.md**](ENHANCED_JSON_STRUCTURE.md) - JSON export format documentation
- [**API_README.md**](API_README.md) - API documentation (for static JSON files)

### Implementation Summary

- [**PHASE3_SUMMARY.md**](PHASE3_SUMMARY.md) - Database and schema cleanup implementation
- [**PHASE4_SUMMARY.md**](PHASE4_SUMMARY.md) - Processing/presentation separation implementation
- [**PHASE5_SUMMARY.md**](PHASE5_SUMMARY.md) - Enhanced JSON export implementation

## Quick Start

### Installation

To set up the project:

```bash
# Clone the repository
git clone [repository URL]

# Install dependencies
npm install

# Create .env file with your API key
echo "ANTHROPIC_API_KEY=your_api_key" > .env
```

### Basic Usage

```bash
# Initialize the database
node database_setup_clean.js

# Generate summaries for executive orders
node generate_plain_summaries_clean.js

# Export data to static files
node export_data.js

# Test the static website locally
cd docs
npx http-server
```

## Key Directories

- `/`: Root directory containing configuration and main processing scripts
- `/utils/`: Utility functions and the Database API
- `/export/`: Data export formatters and exporters
- `/data_contracts/`: Data schema definitions
- `/sources/`: Source integration modules
- `/templates/`: Templates for AI analysis
- `/docs/`: The GitHub Pages website directory

## Project Commands

- `node database_setup_clean.js` - Initialize/update SQLite database
- `node generate_plain_summaries_clean.js` - Generate summaries for executive orders
- `node export_data.js` - Export DB data to static JSON files
- `node migrator.js` - Migrate database to new schema
- `node fetch_external_sources.js` - Fetch data from external sources
- `cd docs && npx http-server` - Test static site locally
- `bash update_and_deploy.sh` - Update data and deploy to GitHub Pages

## Design Philosophy

The project follows the "Essential Simplicity" design philosophy:

- Prioritize complexity reduction over feature addition
- Flatten nested structures and eliminate unnecessary layers
- Design for universal relevance with natural Yale specificity
- "Do One Thing Well": Create focused modules with clear responsibilities
- "Write Programs to Work Together": Design composable components
- "Make Each Program Do One Thing Well": Favor single-purpose tools
- Use resources efficiently (AI tokens, computation)
- "Simplicity, Clarity, Generality": Prefer simple solutions
- Make maintenance-focused decisions
- Preserve essential value while removing incidental complexity
- Apply schema consistency throughout the pipeline

## Contributing

When contributing to this project:

1. Follow the established design philosophy
2. Use the Database API for database operations
3. Maintain clean separation between core and institution-specific code
4. Add unit tests for new functionality
5. Document architectural decisions
6. Consider extensibility when adding features

## Troubleshooting

Common issues and solutions:

- **Database Schema Mismatch**: Run `node migrator.js` to update the database schema
- **Missing Summaries**: Run `node generate_plain_summaries_clean.js` to generate new summaries
- **Deployment Issues**: See `GITHUB_PAGES_INSTRUCTIONS.md` for detailed deployment steps

## Related Resources

- [Claude AI Documentation](https://docs.anthropic.com/)
- [SQLite Documentation](https://sqlite.org/docs.html)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## License

This project is proprietary and confidential. Yale University retains all rights.

## Contact

For questions or support, please contact the Yale Executive Orders project team.