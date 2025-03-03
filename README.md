# Yale Executive Orders Knowledge Extraction System

This project implements a comprehensive knowledge extraction system for executive orders, with a specific focus on Yale University's needs and use cases.

## Overview

The system extracts structured knowledge from executive orders and related documents, transforms it into standardized representations, and enhances it with Yale-specific categorization and context. The extracted knowledge can be used for analyzing policy impacts, tracking compliance requirements, and generating narratives for Yale stakeholders.

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

### Yale-Specific Capabilities

- Maps extracted knowledge to Yale impact areas
- Identifies relevant Yale stakeholders
- Calculates Yale-specific relevance scores
- Provides institution-specific context and impact assessment

## Getting Started

### Prerequisites

- Node.js (v14 or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/yale-executive-orders.git
   cd yale-executive-orders
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage Example

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

## Knowledge Types

The system extracts and structures the following types of knowledge:

1. **Dates**: Deadlines, effective dates, implementation milestones
2. **Requirements**: Obligations, mandates, reporting requirements
3. **Impacts**: Policy impacts on institutions and operations
4. **Entities**: Government agencies, roles, departments
5. **Definitions**: Defined terms and their meanings
6. **Authorities**: Legal authorities, statutes, constitutional provisions

## Yale Impact Areas

The system maps extracted knowledge to Yale-specific impact areas:

1. Research and Innovation
2. Export Controls and Security
3. International Programs
4. Community and Belonging
5. Campus Safety
6. Workforce and Employment
7. Healthcare Operations
8. Financial and Physical Resources
9. Governance and Legal
10. Academic Programs
11. Arts and Cultural Heritage
12. Athletics and Recreation

## Development

### Project Structure

```
yale-executive-orders/
├── models/
│   ├── knowledge_schema.js
│   └── enhanced_knowledge_schema.js
├── extraction/
│   └── knowledge_extractor.js
├── utils/
│   └── logger.js
└── tests/
    └── extractor_example.js
```

### Running the Example

```bash
node tests/extractor_example.js
```

## How the Extraction Works

The extraction process follows these steps:

1. **Initialize Extractors**: The `KnowledgeExtractor` initializes specialized extractors for different knowledge types.

2. **Process Source Text**: Each extractor analyzes the executive order text using sophisticated pattern matching.

3. **Extract Structured Knowledge**: Extractors identify dates, requirements, entities, definitions, and authorities.

4. **Enhance with Yale Context**: The system maps extracted knowledge to Yale-specific impact areas and stakeholders.

5. **Merge and Cross-Reference**: The orchestrator merges all extracted knowledge into a unified representation.

6. **Calculate Confidence**: Each extraction includes confidence scores based on extraction quality.

7. **Output Structured Knowledge**: The resulting knowledge is provided in a structured format for further use.

## Future Enhancements

- Integration with AI-powered extraction services
- Expanded Yale-specific mapping capabilities
- Cross-source knowledge integration
- Narrative generation from extracted knowledge
- Interactive visualization of extracted knowledge

## License

This project is proprietary and confidential, developed for Yale University's internal use.