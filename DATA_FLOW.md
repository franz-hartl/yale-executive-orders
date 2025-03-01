# Data Flow in the Yale Executive Orders Project

This document outlines the complete data flow through the Yale Executive Orders system, from initial collection to final presentation.

## Overview Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  DATA SOURCES   │     │  DATA STORAGE   │     │  AI PROCESSING  │     │  DATA EXPORT    │     │  PRESENTATION   │
│                 │     │                 │     │                 │     │                 │     │                 │
│ - Government    │     │ - SQLite DB     │     │ - Claude AI     │     │ - JSON Export   │     │ - Static HTML   │
│ - COGR          │──►│ - Schema.js     │──►│ - Templates     │──►│ - Formatters     │──►│ - Web Interface  │
│ - NSF           │     │ - Database API   │     │ - Analysis      │     │ - Exporter      │     │ - Client-side JS │
│ - NIH           │     │ - Migrations     │     │ - Summaries     │     │ - Data Contracts│     │ - GitHub Pages  │
│ - ACE           │     │                 │     │                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 1. Data Collection Phase

### Sources
The system collects data from multiple authoritative sources:

1. **Government Sources**:
   - WhiteHouse.gov executive orders
   - Federal Register publications
   - Historical archives

2. **External Industry Sources**:
   - Council on Governmental Relations (COGR)
   - National Science Foundation (NSF)
   - National Institutes of Health (NIH)
   - American Council on Education (ACE)

### Collection Process

1. **Initial Fetching**:
   - `fetch_orders.js`: Collects executive orders from main sources
   - `fetch_whitehouse_orders.js`: Fetches directly from whitehouse.gov
   - `fetch_historical_orders.js`: Gathers historical order data

2. **External Source Integration**:
   - `fetch_external_sources.js`: Fetches data from COGR, NSF, NIH, ACE
   - `sources/base_source.js`: Defines common source interface
   - Source-specific modules (e.g., `cogr_source.js`, `nih_source.js`)

3. **Data Normalization**:
   - Convert dates to ISO format
   - Extract order numbers using pattern matching
   - Standardize text formatting and encoding

### Source Registry System

The `sources/source_registry.js` module manages source integration:

1. Register each source with metadata:
   - Source name and description
   - Authority level and priority
   - Fetch and processing methods

2. Handle source conflicts:
   - Prioritize sources based on authority level
   - Merge analysis from multiple sources
   - Preserve attribution for all source contributions

## 2. Data Storage Phase

### Database Organization

Data is stored in a SQLite database with the structure defined in `schema.js`:

1. **Core Tables**:
   - `executive_orders`: Primary storage for order details
   - `categories`: Domain categorization (Technology, Finance, etc.)
   - `impact_areas`: General impact areas
   - `university_impact_areas`: Higher education specific impacts

2. **Junction Tables**:
   - `order_categories`: Links orders to categories
   - `order_impact_areas`: Links orders to impact areas
   - `order_university_impact_areas`: Links orders to university impact areas

3. **Yale-Specific Tables**:
   - `yale_impact_areas`: Yale-specific impact domains
   - `yale_departments`: Yale organizational units
   - `yale_compliance_actions`: Required compliance steps
   - `yale_impact_mapping`: Department-specific impacts

### Database API

The `utils/database.js` module provides a clean interface for database operations:

1. **Core Functions**:
   - `connect()`: Initialize database connection
   - `close()`: Close database connection
   - `run()`, `get()`, `all()`: Execute SQL operations
   - `transaction()`: Run multiple operations in a transaction

2. **Specialized Functions**:
   - `getOrderWithRelations()`: Retrieve complete order data
   - `searchOrders()`: Full-text search across orders
   - `createTables()`: Initialize database schema
   - `initializeReferenceData()`: Populate lookup tables

### Migration Process

The `migrator.js` module handles database schema changes:

1. Create backup of existing database
2. Create new database with updated schema
3. Migrate all data preserving relationships
4. Create FTS indices for search functionality
5. Swap in the new database

## 3. AI Processing Phase

### AI Integration

The system uses Claude AI to analyze executive orders:

1. **Query Construction**:
   - Build prompts from templates
   - Include necessary context
   - Specify output format

2. **API Integration**:
   - Manage API connections
   - Handle rate limiting
   - Process responses

### Analysis Types

1. **Plain Language Summaries** (`generate_plain_summaries.js`):
   - Convert legal language to accessible explanations
   - Focus on practical implications
   - Format for readability

2. **Executive Briefs**:
   - Concise 1-2 sentence summaries
   - Focus on key impacts
   - Highlight critical deadlines

3. **Comprehensive Analysis**:
   - Detailed breakdown of requirements
   - Institution-specific implementation guidance
   - Resource requirements and timelines

### Institution-Specific Analysis

1. **Impact Matrix**:
   - Different analysis for institution types
   - R1 Research Universities (primary focus)
   - Other institution types

2. **Yale-Specific Analysis**:
   - Department-specific impacts
   - Campus implementation priorities
   - Yale-specific requirements

## 4. Data Export Phase

### Data Contracts

The `data_contracts/order_output_schema.js` defines standardized output formats:

1. **Core Schema**:
   - Essential fields present in all exports
   - Standardized data types
   - Required and optional fields

2. **Extension Points**:
   - Institution-specific data
   - Source-specific analysis
   - Custom metadata

### Formatters

The `export/formatters.js` module transforms database data to match contracts:

1. **Transformation Functions**:
   - `formatExecutiveOrder()`: Convert order to contract format
   - `formatStatistics()`: Generate statistics from orders
   - `formatSystemInfo()`: Create system metadata

2. **Institution Extensions**:
   - `createInstitutionExtensions()`: Add institution-specific data
   - Extension logic isolated in dedicated functions

### Export Process

The `export/exporter.js` class manages the export process:

1. **Export Functions**:
   - `exportAll()`: Export all data sets
   - `exportExecutiveOrders()`: Export orders data
   - `exportSummaryFiles()`: Export HTML summary files
   - `exportStatistics()`: Export statistical analysis

2. **File Organization**:
   - Core data files (e.g., `executive_orders.json`)
   - Individual order files
   - Summary HTML files
   - Statistical data

## 5. Presentation Phase

### Static Website

The static website in the `docs/` directory:

1. **Client-Side Structure**:
   - HTML structure (`index.html`)
   - CSS styling
   - JavaScript functionality

2. **Data Loading**:
   - Load JSON data from static files
   - Process and prepare for display
   - Handle filtering and sorting

3. **User Interface**:
   - Order listing interface
   - Filtering and search
   - Detailed view for individual orders

### Institution Selection

The interface supports institution-specific views:

1. **Institution Type Selector**:
   - Choose institution type (R1, master's, etc.)
   - Adjust displayed content based on selection

2. **Yale-Specific View**:
   - Yale-specific impact areas
   - Department-specific guidance
   - Yale compliance requirements

## Complete Data Flow Example

To illustrate the complete flow, let's follow a typical executive order through the system:

1. **Collection**:
   - New executive order is published on whitehouse.gov
   - `fetch_whitehouse_orders.js` retrieves the order data
   - Data is normalized and prepared for storage

2. **Storage**:
   - Order is stored in the `executive_orders` table
   - Initial categories are assigned
   - Relationships are established in junction tables

3. **AI Analysis**:
   - `generate_plain_summaries.js` processes the order
   - Claude AI analyzes text and generates summaries
   - Analysis is stored in the database

4. **Export**:
   - `export_data.js` exports the processed order
   - Formatters create standardized JSON representation
   - HTML summaries are generated from templates

5. **Presentation**:
   - Order appears in the web interface
   - Users can filter, search, and view details
   - Institution-specific views show relevant impacts

## Future Enhancements

Planned improvements to the data flow:

1. **Automated Updates**:
   - Scheduled fetching of new orders
   - Automatic reprocessing of updated orders
   - Notification system for new orders

2. **Enhanced Analytics**:
   - Advanced statistical analysis of orders
   - Trend detection and visualization
   - Predictive analysis of potential impacts

3. **Additional Sources**:
   - Integration with more external sources
   - Enhanced source attribution system
   - Weighted source authority model

4. **API Endpoints**:
   - Optional REST API for programmatic access
   - Webhook notifications for new orders
   - Authenticated access for premium features

## Conclusion

The Yale Executive Orders system follows a clear, modular data flow that separates concerns while maintaining data integrity throughout the pipeline. The architecture allows for easy extension and modification at each phase without disrupting other components.