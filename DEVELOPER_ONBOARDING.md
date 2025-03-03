# Developer Onboarding Guide

Welcome to the Yale Executive Orders project! This guide will help you get up to speed quickly with the codebase, development environment, and workflow.

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js (v14 or later)
- npm (v6 or later)
- Git
- SQLite3

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/franz-hartl/yale-executive-orders.git
   cd yale-executive-orders
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the database:
   ```bash
   node database_setup.js
   ```

4. Test the installation:
   ```bash
   node tests/extractor_example.js
   ```

## Project Structure Overview

The project follows a modular structure with clear separation of concerns:

```
yale-executive-orders/
├── analysis_jobs/       # Batch analysis jobs
├── config/              # Configuration files
├── data_contracts/      # Data schema definitions
├── docs/                # Static website files
├── extraction/          # Knowledge extraction system
├── external_sources/    # Data from external sources
├── knowledge/           # Knowledge management system
├── models/              # Data models and schemas
├── resolution/          # Conflict resolution system
├── sources/             # Source integration modules
├── templates/           # Document templates
├── tests/               # Example and test scripts
├── utils/               # Utility functions
└── workflow/            # Pipeline orchestration
```

## Key Concepts

### Essential Simplicity

The project follows a design philosophy centered on reducing complexity:

- Flat, modular architecture
- Clear component boundaries
- Single-responsibility principle
- Composable units of functionality

### Preprocessing-to-Static Architecture

The system processes data in a preprocessing phase and exports to static files:

1. Data collection from multiple sources
2. Processing and analysis with AI
3. Export to static JSON and HTML
4. Deployment to GitHub Pages

## Development Workflow

### Common Tasks

Here are common development tasks and how to perform them:

#### 1. Adding a New Data Source

1. Create a new source module in `sources/`:
   ```javascript
   // sources/new_source.js
   const { BaseSource } = require('./base_source');
   
   class NewSource extends BaseSource {
     constructor(options = {}) {
       super('new_source', options);
     }
     
     async fetchRecentOrders() {
       // Implementation
     }
     
     async fetchOrderByNumber(orderNumber) {
       // Implementation
     }
   }
   
   module.exports = { NewSource };
   ```

2. Register the source in `sources/source_registry.js`:
   ```javascript
   const { NewSource } = require('./new_source');
   
   // In the registerDefaultSources method:
   this.register('new_source', new NewSource());
   ```

#### 2. Creating a New Extractor

1. Create a new extractor in `extraction/extractors/`:
   ```javascript
   // extraction/extractors/new_extractor.js
   const { BaseExtractor } = require('./base_extractor');
   
   class NewExtractor extends BaseExtractor {
     constructor(options = {}) {
       super('new_knowledge_type');
       this.options = options;
     }
     
     extract(text, context) {
       // Implementation
       return {
         items: [], // Extracted items
         confidence: 0.0, // Confidence score
         evidence: '' // Supporting evidence
       };
     }
   }
   
   module.exports = { NewExtractor };
   ```

2. Register the extractor in `extraction/knowledge_extractor.js`:
   ```javascript
   const { NewExtractor } = require('./extractors/new_extractor');
   
   // In the constructor:
   this.extractors.new_knowledge_type = new NewExtractor();
   ```

#### 3. Adding a New Template

1. Create a new template in `templates/`:
   ```javascript
   // templates/new_template.js
   const { BaseTemplate } = require('./base_template');
   
   class NewTemplate extends BaseTemplate {
     constructor() {
       super('new_template');
     }
     
     render(data) {
       // Implementation
       return renderedContent;
     }
   }
   
   module.exports = { NewTemplate };
   ```

2. Register the template in `templates/template_manager.js`:
   ```javascript
   const { NewTemplate } = require('./new_template');
   
   // In the registerDefaultTemplates method:
   this.register('new_template', new NewTemplate());
   ```

#### 4. Running the Full Pipeline

To process data end-to-end:

```bash
node run_workflow.js
```

This will:
1. Fetch data from all sources
2. Process and analyze the data
3. Export to static files
4. Deploy to GitHub Pages (if configured)

### Development Best Practices

#### Code Style

- Use ES6+ features with CommonJS modules
- Follow camelCase naming for variables and functions
- Use JSDoc-style comments for functions
- Keep code modular with single-responsibility functions

#### Error Handling

- Use try/catch blocks with specific error messages
- Provide fallback behavior when possible
- Log errors with appropriate context

#### Testing

- Write unit tests for new functionality
- Test edge cases and error conditions
- See the [Testing Guide](TESTING_GUIDE.md) for details

## Debugging

### Common Issues

#### Database Connection Errors

- Check that SQLite3 is installed
- Verify database path in configuration
- Ensure no other process is locking the database

#### Source Integration Issues

- Check API endpoint configurations
- Verify authentication parameters
- Look for rate limiting or network issues

#### Export Failures

- Check disk space
- Verify output paths exist
- Look for malformed data that breaks export

### Debugging Tools

#### Database Inspection

Use SQLite command-line tools to inspect the database:

```bash
sqlite3 executive_orders.db
sqlite> .tables
sqlite> SELECT * FROM executive_orders LIMIT 5;
```

#### Logging

The system uses a structured logging system:

```javascript
const { logger } = require('./utils/logger');

logger.info('Processing item', { itemId: '123' });
logger.error('Failed to process', { error: err.message });
```

## Deployment

### Local Development Server

To test the static site locally:

```bash
cd docs
npx http-server
```

### GitHub Pages Deployment

The system can automatically deploy to GitHub Pages:

```bash
node update_and_deploy.sh
```

This script:
1. Pulls the latest changes
2. Updates data from sources
3. Generates analyses
4. Exports static files
5. Commits and pushes to GitHub Pages

## Extending the System

See the [Extension Guide](EXTENSION_GUIDE.md) for detailed information on:

- Creating custom extractors
- Adding new data sources
- Developing specialized templates
- Extending the workflow pipeline
- Building frontend customizations

## Additional Resources

### Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Testing Guide](TESTING_GUIDE.md)
- [API Reference](API_README.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Extraction System](EXTRACTION_README.md)

### External Resources

- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## Getting Help

If you encounter issues or have questions:

1. Check the [Troubleshooting Guide](DEBUG_README.md)
2. Review related documentation
3. Search existing GitHub issues
4. Create a new issue if needed