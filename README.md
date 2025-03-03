# Yale Executive Orders Knowledge Extraction System

This project implements a comprehensive knowledge extraction system for executive orders, with a specific focus on Yale University's needs and use cases.

## Overview

The system extracts structured knowledge from executive orders and related documents, transforms it into standardized representations, and enhances it with Yale-specific categorization and context. The extracted knowledge can be used for analyzing policy impacts, tracking compliance requirements, and generating narratives for Yale stakeholders.

## Key Features

- **Multi-Source Data Integration**: Combines data from Federal Register, White House, and higher education policy sources
- **Specialized Knowledge Extraction**: Extracts dates, requirements, impacts, entities, definitions, and authorities
- **Yale-Specific Impact Mapping**: Maps extracted knowledge to Yale impact areas and stakeholders
- **Intelligent Conflict Resolution**: Detects and resolves conflicts between different data sources
- **Template-Based Document Generation**: Creates customized documents for different Yale departments
- **Static Website Deployment**: Exports processed data to GitHub Pages for easy access
- **Knowledge-Centric Architecture**: Uses structured fact-based knowledge representation

## Documentation

For comprehensive documentation, refer to the following resources:

- [Documentation Hub](DOCUMENTATION.md) - Central entry point for all documentation
- [Architecture Overview](ARCHITECTURE.md) - System architecture and design principles
- [Data Flow](DATA_FLOW.md) - Complete data processing pipeline
- [API Reference](API_README.md) - API details for integration
- [Extension Guide](EXTENSION_GUIDE.md) - How to extend and customize the system

## Philosophy

The Yale Executive Orders Knowledge Extraction System is built on these philosophical principles:

1. **Knowledge as Structured Insight**: Transforming unstructured text into interconnected knowledge
2. **Context-Sensitive Understanding**: Understanding executive orders within institutional context
3. **Multi-Dimensional Analysis**: Using multiple specialized extractors for comprehensive analysis
4. **Evidence-Based Confidence**: Including confidence scores and evidence for transparency
5. **Open Knowledge**: Embracing openness for extraction, analysis, and sharing

## Data Sources

The system integrates data from multiple authoritative sources:

1. **Federal Register API**: Official source for executive orders with full text and metadata
2. **White House Website**: Direct source for the most recent executive orders
3. **Higher Education Policy Sources**:
   - **Council on Governmental Relations (COGR)**: Research institution-focused analyses
   - **National Science Foundation (NSF)**: Implementation guidance for research grants
   - **National Institutes of Health (NIH)**: Policy notices for biomedical research
   - **American Council on Education (ACE)**: Higher education sector-wide analysis
4. **Local Database**: SQLite database for cached and processed executive order data

## Key Components

### Knowledge Schemas

- `models/knowledge_schema.js`: Basic knowledge representation schemas
- `models/enhanced_knowledge_schema.js`: Extended schemas with Yale-specific attributes

### Knowledge Extraction

- `extraction/knowledge_extractor.js`: Main orchestrator for knowledge extraction
- Specialized extractors for different knowledge types:
  - `DateExtractor`: Extracts date information (deadlines, effective dates, etc.)
  - `RequirementExtractor`: Extracts requirements and obligations
  - `ImpactExtractor`: Extracts policy impacts on institutions
  - `EntityExtractor`: Extracts government agencies and other entities
  - `DefinitionExtractor`: Extracts defined terms and their meanings
  - `AuthorityExtractor`: Extracts legal authorities cited in orders

### Sources Management

- `sources/source_manager.js`: Manages data sources and retrieval
- `sources/source_registry.js`: Registers and provides access to data sources
- Various source adapters for different data providers

### Template System

- `templates/template_manager.js`: Manages document templates
- `templates/renderers/`: Specialized renderers for different output formats

### Workflow Pipeline

- `workflow/pipeline.js`: Defines the end-to-end processing pipeline
- `workflow/controller.js`: Orchestrates the execution of pipeline steps

## Getting Started

### Prerequisites

- Node.js (v14 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/franz-hartl/yale-executive-orders.git
   cd yale-executive-orders
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   node database_setup.js
   ```

### Basic Usage

```javascript
const { KnowledgeExtractor } = require('./extraction/knowledge_extractor');

// Create knowledge extractor
const extractor = new KnowledgeExtractor();

// Sample executive order data
const executiveOrderData = {
  sourceId: 'eo12345',
  sourceName: 'Executive Order 12345',
  order_number: '12345',
  title: 'Executive Order Title',
  full_text: '...' // Full text of the order
};

// Extract knowledge
const extractedKnowledge = await extractor.extractAll(executiveOrderData);

// Access extracted knowledge
console.log(extractedKnowledge.requirements); // List of requirements
console.log(extractedKnowledge.yaleImpactAreas); // Yale impact areas
```

See `tests/extractor_example.js` for a complete working example.

### Common Tasks

- **Initialize/update database**: `node database_setup.js`
- **Generate summaries**: `node generate_plain_summaries.js`
- **Export to JSON**: `node export_to_json.js`
- **Test static site locally**: `cd docs && npx http-server`
- **Update and deploy**: `node update_and_deploy.sh`

## Development

### Project Structure

```
yale-executive-orders/
├── models/                # Data models and schemas
├── extraction/            # Knowledge extraction system
├── sources/               # Data source integrations
├── templates/             # Document templates and renderers
├── workflow/              # Pipeline and orchestration
├── utils/                 # Utility functions
├── knowledge/             # Knowledge management system
├── tests/                 # Example and test scripts
└── docs/                  # Static website
```

### Running the Example

```bash
node tests/extractor_example.js
```

## Contributing

Contributions to this project are welcome. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure code quality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is open source and available under the MIT License. The approach and methodologies can be adapted for other institutions with similar needs.