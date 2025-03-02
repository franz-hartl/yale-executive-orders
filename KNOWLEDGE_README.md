# Knowledge Representation System for Yale Executive Orders

## Overview

The Knowledge Representation System provides a flexible framework for storing, attributing, and querying facts about executive orders. This system addresses the challenge of integrating information from multiple sources while maintaining source attribution, managing contradictions, and supporting Yale-specific impact analysis.

## Key Features

- **Fact-based knowledge storage**: Represents information as discrete facts with type classification
- **Source attribution**: Every fact is linked to its source with context and extraction method
- **Relationship modeling**: Facts can be related to each other with typed relationships (supports, contradicts, etc.)
- **Yale-specific impact assessment**: Facts can be annotated with Yale-specific impact information
- **Confidence scoring**: Facts and relationships include confidence levels
- **Simple query utilities**: Convenient functions for common knowledge queries

## System Components

### Core Files

- **models/knowledge_schema.js**: Schema definition for knowledge tables and predefined types
- **knowledge/fact.js**: Core model representing a fact with attribution
- **knowledge/knowledge_manager.js**: Database operations for storing and retrieving facts
- **knowledge/queries.js**: Convenience utilities for common knowledge queries
- **setup_knowledge_management.js**: Setup script to initialize the knowledge system
- **knowledge_example.js**: Example usage of the knowledge system

### Database Tables

- **knowledge_facts**: Core facts table storing typed knowledge items
- **knowledge_sources**: Links facts to their sources with context
- **knowledge_relationships**: Defines relationships between facts
- **knowledge_yale_impacts**: Yale-specific impact assessments for facts

## Fact Types

The system supports various fact types, including:

- **DATE**: Important dates (deadlines, effective dates)
- **REQUIREMENT**: Compliance requirements
- **IMPACT**: General impacts
- **ENTITY**: Organizations, roles mentioned
- **DEFINITION**: Terms defined in the order
- **EXEMPTION**: Exemptions to requirements
- **AUTHORITY**: Legal authorities cited
- **AMENDMENT**: Changes to existing regulations
- **STATUS**: Status updates (court decisions, etc.)
- **GUIDANCE**: Implementation guidance

## Relationship Types

Facts can be related to each other with various relationship types:

- **SUPPORTS**: One fact supports another
- **CONTRADICTS**: One fact contradicts another
- **REFINES**: One fact refines/clarifies another
- **SUPERSEDES**: One fact supersedes another
- **DEPENDS_ON**: One fact depends on another
- **RELATES_TO**: General relationship
- **EXEMPTS_FROM**: Exemption relationship
- **IMPLEMENTS**: Implementation relationship
- **AFFECTS**: Impact relationship

## Usage Examples

### Creating and Storing a Fact

```javascript
const KnowledgeManager = require('./knowledge/knowledge_manager');
const Fact = require('./knowledge/fact');
const { factTypes } = require('./models/knowledge_schema');

// Initialize knowledge manager
const knowledgeManager = new KnowledgeManager();
await knowledgeManager.initialize();

// Create a date fact
const dateFact = new Fact({
  orderId: 123,  // Executive order ID
  factType: factTypes.DATE,
  value: {
    date: '2025-06-30',
    dateType: 'deadline',
    description: 'Compliance report due',
    isExplicit: true
  },
  confidence: 0.9
});

// Add source attribution
dateFact.addSource({
  sourceId: 1,  // ID from source_metadata table
  sourceContext: 'Section 3, paragraph 2',
  extractionMethod: 'manual'
});

// Store the fact
await knowledgeManager.storeFact(dateFact);
```

### Querying Knowledge

```javascript
const KnowledgeQueries = require('./knowledge/queries');

// Initialize query utilities
const queries = new KnowledgeQueries();
await queries.initialize();

// Get all dates for an order
const dates = await queries.getImportantDates(123);

// Get all requirements
const requirements = await queries.getRequirements(123);

// Get Yale-specific impacts
const yaleImpacts = await queries.getYaleImpacts(123);

// Find contradictions
const contradictions = await queries.getContradictions(123);

// Get a knowledge summary
const summary = await queries.getKnowledgeSummary(123);
```

## Integration with Existing Code

The Knowledge Representation System integrates with the existing Yale Executive Orders codebase:

1. **Database Connection**: Uses the same SQLite database (executive_orders.db)
2. **Source References**: Links to the existing source_metadata and order_sources tables
3. **Yale Context**: Connects to yale_departments for department-specific impacts
4. **Order References**: All facts are linked to executive_orders by order_id

## Setting Up the System

To set up the Knowledge Representation System:

1. Run the setup script to create the necessary tables:
   ```
   node setup_knowledge_management.js
   ```
   
2. Alternatively, to set up a new database with all tables including knowledge tables:
   ```
   node database_setup_with_knowledge.js
   ```

3. To see an example of the system in action:
   ```
   node knowledge_example.js
   ```

## Design Principles

The Knowledge Representation System follows several key design principles:

1. **Source-Truth Preservation**: Always maintains the connection between information and its source
2. **Simple but Flexible**: Simple implementation that can be enhanced over time
3. **Attribution**: Tracks where information comes from
4. **Conflict Management**: Handles contradictory information explicitly
5. **Yale-Specific Context**: Supports Yale-specific impact analysis

## Future Extensions

The current implementation provides a foundation that can be extended in several ways:

1. **More Extractors**: Adding specialized extractors for each fact type
2. **Improved AI Integration**: Using AI to extract facts from executive orders
3. **Advanced Querying**: More sophisticated query capabilities for complex analytics
4. **Visualization**: Visualizing fact relationships and conflicts
5. **User Interface**: Creating a UI for managing and viewing knowledge facts

## Technical Considerations

- All knowledge tables include indexes for performance optimization
- The system uses JSON for flexible fact values while maintaining queryability
- Confidence scores allow for representing uncertainty in knowledge
- Transactions ensure data integrity during complex operations