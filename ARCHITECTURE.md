# Yale Executive Orders Project Architecture

## Overview

The Yale Executive Orders project is a comprehensive system for analyzing executive orders and their impact on private R1 research universities. The system follows a preprocessing-to-static deployment model, which provides several benefits:

- Comprehensive analysis relevant to higher education institutions
- Institution-specific impact assessments based on type and mission
- Fast and responsive user experience through static website deployment
- Extensible AI analysis pipeline

## Core Architecture Principles

The project follows the "Essential Simplicity" design philosophy:

1. **Complexity Reduction**: Prioritize removing unnecessary complexity over adding features
2. **Flat Architecture**: Minimize nested structures and eliminate unnecessary layers 
3. **Single Responsibility**: Each component does one thing well
4. **Composability**: Components can be chained together for complex operations
5. **Clean Interfaces**: Well-defined contracts between components
6. **Efficiency**: Optimize resource usage (AI tokens, computation, storage)
7. **Maintainability**: Make decisions that prioritize long-term code health

## System Components

The system is organized into the following key components:

### 1. Data Collection Layer

**Purpose**: Gather executive orders from various sources
**Key Components**:
- Source integration modules (`sources/`)
- Fetch scripts (`fetch_*.js`)
- External source processors

**Data Flow**:
1. Fetch scripts collect data from government sources
2. Source-specific modules normalize the data
3. Preprocessed data is prepared for storage

### 2. Data Storage Layer

**Purpose**: Store structured data in a local SQLite database
**Key Components**:
- Database schema (`schema.js`)
- Database API (`utils/database.js`)
- Migration utilities (`migrator.js`)

**Data Flow**:
1. Raw data is stored in structured tables
2. Related data is linked through junction tables
3. Full-text search is enabled for efficient querying

### 3. AI Processing Layer

**Purpose**: Generate analysis, summaries, and categorizations
**Key Components**:
- Analysis scripts (`analyze_*.js`, `generate_*.js`)
- AI integration utilities
- Templates for structured analysis

**Data Flow**:
1. Orders are retrieved from the database
2. AI processes each order for categorization and summary
3. Results are stored back in the database

### 4. Export Layer

**Purpose**: Transform processed data into static JSON and HTML
**Key Components**:
- Data contracts (`data_contracts/`)
- Formatters (`export/formatters.js`)
- Exporter (`export/exporter.js`)

**Data Flow**:
1. Data is retrieved from database using the Database API
2. Formatters transform data according to defined contracts
3. Exporter writes formatted data to static files

### 5. Presentation Layer

**Purpose**: Display the processed data to users
**Key Components**:
- Static HTML/CSS/JS website (`docs/`)
- Client-side data processing
- Filtering and display components

**Data Flow**:
1. Static JSON data is loaded from files
2. Client-side code processes and displays data
3. Users interact with the interface to filter and view data

## Cross-Component Services

### Database Service

Provides a unified API for database operations, following clean design principles:
- Connection management
- Promisified operations
- Consistent error handling
- Transaction support

### Modular Source Integration

Enables flexible data collection from multiple sources:
- Base source class with common functionality
- Source-specific implementations
- Consistent metadata and attribution
- Conflict resolution between sources

### Institution-Specific Extensions

Allows customization for different institutions while maintaining core functionality:
- Extension points in data contracts
- Institution-specific formatters
- Configurable export options

## Data Flow

1. **Collection**: Raw data is gathered from various sources
2. **Storage**: Data is stored in the SQLite database
3. **AI Analysis**: AI generates multi-level summaries and impact analysis
4. **Differentiation**: Analysis is categorized by institution type
5. **Export**: Processed data is exported to static JSON files
6. **Deployment**: Static files are deployed to GitHub Pages

## Database Schema

The database schema is centralized in `schema.js` and includes:

1. **Core Tables**:
   - `executive_orders`: Primary table storing order details
   - `categories`: Categorization system
   - `impact_areas`: General impact areas
   - `university_impact_areas`: Higher education specific impact areas

2. **Junction Tables**:
   - `order_categories`: Links orders to categories
   - `order_impact_areas`: Links orders to impact areas
   - `order_university_impact_areas`: Links orders to university impact areas

3. **Institution-Specific Tables**:
   - Yale-specific tables for departments, impact areas, and compliance actions
   - Extension points for other institutions

4. **Full-Text Search**:
   - FTS5 virtual tables for efficient text search

## Key Design Decisions

1. **Centralized Schema**: All database structure defined in one place
2. **Clean API Separation**: Database operations isolated in a dedicated API
3. **Data Contracts**: Well-defined contracts between processing and presentation
4. **Institution Extensions**: Yale-specific features implemented as extensions
5. **Static Deployment**: JAMstack approach for simplicity and performance

## Extension and Integration Points

The system provides several extension points:

1. **New Data Sources**: Implement using the source integration framework
2. **Custom Analysis**: Add specialized analysis scripts
3. **Institution Customization**: Use extension points in data contracts
4. **UI Customization**: Modify the static website or build a new presentation layer

## Deployment Model

The project uses a preprocessing-to-static-deployment model:

1. All data processing happens during preprocessing
2. Processed data is exported to static JSON files
3. Static files are deployed to GitHub Pages
4. No server-side runtime requirements
5. Fast, scalable, and secure static website

## Conclusion

The Yale Executive Orders project follows a clean, modular architecture with well-defined components and interfaces. The design prioritizes simplicity, maintainability, and extensibility while providing powerful features for executive order analysis.