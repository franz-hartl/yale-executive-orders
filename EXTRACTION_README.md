# Knowledge Extraction System

The extraction system is a core component of the Yale Executive Orders project, responsible for transforming unstructured executive order text into structured knowledge representations.

## Overview

The extraction system uses a modular approach with specialized extractors for each knowledge type. The system is designed to be:

- **Modular**: Each extractor focuses on one knowledge type
- **Extensible**: New extractors can be added easily
- **Configurable**: Extraction parameters can be adjusted
- **Evidence-based**: All extractions include supporting evidence
- **Confidence-aware**: Extractions include confidence scores

## Architecture

The extraction system follows a layered architecture:

1. **Extraction Manager Layer**: Coordinates the extraction process
2. **Specialized Extractors Layer**: Individual extractors for each knowledge type
3. **Pattern Matching Layer**: Regex and heuristic-based pattern matching
4. **Knowledge Schema Layer**: Structured representation of extracted knowledge

## Components

### Extraction Manager

The `extraction_manager.js` module coordinates the extraction process:

- Initializes and configures extractors
- Manages the extraction workflow
- Handles error recovery and retries
- Stores and loads extraction results

```javascript
// Example usage
const { ExtractionManager } = require('./extraction/extraction_manager');

const manager = new ExtractionManager({
  extractors: ['date', 'requirement', 'impact', 'entity', 'definition', 'authority'],
  retryCount: 3
});

const results = await manager.extractFromOrder(executiveOrder);
```

### Base Extractor

The `base_extractor.js` module provides a common foundation for all extractors:

- Standardized extraction interface
- Common utilities for text processing
- Evidence collection and confidence scoring

```javascript
// Example implementation of a custom extractor
const { BaseExtractor } = require('./extractors/base_extractor');

class CustomExtractor extends BaseExtractor {
  constructor() {
    super('custom');
  }
  
  extract(text, context) {
    // Implementation specific to this extractor
    // Returns structured knowledge with evidence and confidence
  }
}
```

### Specialized Extractors

#### Date Extractor

Extracts dates and deadlines from executive orders:

- **Patterns**: Dates, deadlines, effective dates, implementation timelines
- **Output**: Structured date objects with type classification

```javascript
// Example output
{
  type: 'effective_date',
  date: '2023-05-15',
  description: 'This order takes effect immediately',
  confidence: 0.95,
  evidence: 'This order is effective immediately upon publication'
}
```

#### Requirement Extractor

Extracts requirements, obligations, and mandates:

- **Patterns**: "shall", "must", "required to", action verbs with deadlines
- **Output**: Structured requirement objects with responsible entities

```javascript
// Example output
{
  type: 'reporting_requirement',
  description: 'Submit quarterly reports on implementation progress',
  responsibleEntity: 'Agency heads',
  deadline: '2023-07-01',
  confidence: 0.87,
  evidence: 'Agency heads shall submit quarterly reports on implementation progress'
}
```

#### Impact Extractor

Extracts policy impacts on institutions:

- **Patterns**: Impact-related language, effect statements, consequence descriptions
- **Output**: Structured impact objects with affected areas

```javascript
// Example output
{
  type: 'regulatory_impact',
  description: 'Increases reporting requirements for research grants',
  affectedArea: 'Research Operations',
  severity: 'moderate',
  confidence: 0.82,
  evidence: 'This order increases the frequency and detail required in reports for federally funded research'
}
```

#### Entity Extractor

Extracts government agencies, roles, and other entities:

- **Patterns**: Named entities, organizational references, defined roles
- **Output**: Structured entity objects with relationships

```javascript
// Example output
{
  type: 'government_agency',
  name: 'Department of Education',
  abbreviation: 'ED',
  role: 'oversight',
  relatedEntities: ['Secretary of Education'],
  confidence: 0.93,
  evidence: 'The Department of Education shall oversee implementation'
}
```

#### Definition Extractor

Extracts defined terms and their meanings:

- **Patterns**: Definition statements, "means", "refers to", quotation-defined terms
- **Output**: Structured definition objects with context

```javascript
// Example output
{
  term: 'Covered Institution',
  definition: 'Any private or public institution of higher education receiving federal funding',
  scope: 'Throughout this order',
  confidence: 0.91,
  evidence: 'For purposes of this order, "Covered Institution" means any private or public institution of higher education receiving federal funding'
}
```

#### Authority Extractor

Extracts legal authorities cited in orders:

- **Patterns**: Citations to statutes, laws, previous orders, constitutional provisions
- **Output**: Structured authority objects with authority type

```javascript
// Example output
{
  type: 'statute',
  name: 'National Defense Authorization Act',
  section: 'Section 889',
  year: '2019',
  description: 'Restrictions on telecommunications equipment',
  confidence: 0.88,
  evidence: 'By the authority vested in me as President by the Constitution and the laws of the United States of America, including the National Defense Authorization Act, Section 889'
}
```

## Yale-Specific Mapping

The extraction system includes specialized mapping to Yale impact areas:

- Maps extracted knowledge to Yale's institutional structure
- Identifies relevant Yale stakeholders
- Calculates Yale-specific relevance scores
- Provides institution-specific context

```javascript
// Example Yale impact mapping
{
  yaleImpactAreas: [
    {
      area: 'Research and Innovation',
      relevanceScore: 0.85,
      primaryStakeholders: ['Office of Research Administration', 'Vice President for Research'],
      secondaryStakeholders: ['School of Medicine Research Office', 'General Counsel']
    }
  ]
}
```

## Integration with Knowledge System

The extraction system integrates with the knowledge management system:

- Extracted knowledge is stored as structured facts
- Each fact includes source attribution
- Relationships between facts are explicitly modeled
- Contradictions are identified for resolution

```javascript
// Example integration with knowledge system
const { KnowledgeManager } = require('./knowledge/knowledge_manager');

const knowledgeManager = new KnowledgeManager();
await knowledgeManager.initialize();

// Store extracted knowledge as facts
for (const requirement of extractedKnowledge.requirements) {
  await knowledgeManager.storeFact({
    type: 'requirement',
    content: requirement,
    source: {
      id: executiveOrder.order_number,
      name: executiveOrder.title,
      type: 'executive_order'
    }
  });
}
```

## Using the Extraction System

### Basic Usage

```javascript
const { KnowledgeExtractor } = require('./extraction/knowledge_extractor');

// Create extractor
const extractor = new KnowledgeExtractor();

// Extract all knowledge types
const knowledge = await extractor.extractAll(executiveOrderData);

// Access specific knowledge types
console.log(knowledge.requirements); // List of requirements
console.log(knowledge.dates);        // List of dates
console.log(knowledge.impacts);      // List of impacts
```

### Custom Configuration

```javascript
const { KnowledgeExtractor } = require('./extraction/knowledge_extractor');

// Create extractor with custom configuration
const extractor = new KnowledgeExtractor({
  extractors: ['requirement', 'impact'], // Only use specific extractors
  requirementOptions: {
    minimumConfidence: 0.7,
    includeImplicit: true
  },
  impactOptions: {
    focusAreas: ['research', 'employment', 'international']
  }
});

// Extract with custom configuration
const knowledge = await extractor.extractAll(executiveOrderData);
```

### Batch Processing

```javascript
const { ExtractionManager } = require('./extraction/extraction_manager');

// Create manager
const manager = new ExtractionManager();

// Process multiple orders
const batchResults = await manager.extractFromOrders(executiveOrders);

// Access results by order ID
const orderResults = batchResults[orderId];
```

## Extending the Extraction System

### Creating a New Extractor

1. Create a new extractor class in the `extractors` directory
2. Extend the `BaseExtractor` class
3. Implement the `extract` method
4. Register the extractor with the `ExtractionManager`

```javascript
// Example: Creating a citation extractor
const { BaseExtractor } = require('./base_extractor');

class CitationExtractor extends BaseExtractor {
  constructor(options = {}) {
    super('citation');
    this.options = options;
  }
  
  extract(text, context) {
    // Implementation for extracting citations
    // Return structured citation objects
  }
}

module.exports = { CitationExtractor };
```

### Registering a New Extractor

```javascript
const { ExtractionManager } = require('./extraction/extraction_manager');
const { CitationExtractor } = require('./extractors/citation_extractor');

// Create manager with custom extractors
const manager = new ExtractionManager();

// Register custom extractor
manager.registerExtractor('citation', new CitationExtractor());

// Use the manager with the new extractor
const results = await manager.extractFromOrder(executiveOrder);
```

## Performance Considerations

The extraction system is designed for performance:

- Extractors can run in parallel
- Text processing is optimized for large documents
- Results are cached to avoid redundant processing
- Memory usage is managed for large batches

## Future Enhancements

Planned enhancements to the extraction system:

1. **AI-Assisted Extraction**: Integration with AI models for improved accuracy
2. **Domain-Specific Training**: Training extractors on government document corpus
3. **Cross-Reference Enhancement**: Improved linking between related knowledge items
4. **Multilingual Support**: Extraction from documents in multiple languages
5. **Interactive Refinement**: Interface for human review and refinement of extractions