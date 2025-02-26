# Yale Executive Orders Analysis - Project Structure

This document provides an overview of the project structure, key files, and the purpose of each component.

## Main Components

```
executive_orders_finance/
├── ai_scraper.js               # AI-powered data collection for executive orders
├── api_server.js               # RESTful API server with database integration
├── basic_server.js             # Lightweight server for basic functionality
├── data_processor.js           # Data processing and enhancement utilities
├── database_setup.js           # Base database setup functions 
├── database_setup_revised.js   # Additional database setup functions
├── executive_orders.db         # SQLite database file with executive order data
├── fetch_orders.js             # Utility to fetch executive orders from sources
├── fetch_recent_db.js          # Fetches recent orders and updates database
├── fetch_recent_orders.js      # Fetches recent orders without database update
├── fetch_historical_orders.js  # Fetches historical executive orders
├── fetch_whitehouse_orders.js  # Fetches orders directly from whitehouse.gov
├── financial_executive_orders.csv  # Source data in CSV format
├── financial_executive_orders.json # Source data in JSON format
├── generate_plain_summaries.js # Creates plain language summaries using Claude
├── knowledge_base_context.md   # Context data for AI responses
├── mcp_server.js               # Model Context Provider server implementation
├── package.json                # Node.js project dependencies
├── README.md                   # Main documentation file
├── AI_PIPELINE_EXPLANATION.md  # Details of the AI implementation
├── API_README.md               # API documentation
├── DEBUG_README.md             # Troubleshooting guide
├── PROJECT_STRUCTURE.md        # This file
├── simplified_server.js        # Simplified server implementation
├── sqlite_setup.js             # SQLite database initialization and setup
├── start_api.sh                # Script to start the API server
├── start_server.js             # Main server startup script
└── public/                     # Web interface files
    ├── index.html              # Main application interface
    ├── plain_summary_demo.html # Demo page for plain language summaries
    └── test.html               # Test page for development
```

## Component Purposes

### 1. Data Collection and Processing
- `ai_scraper.js`: Collects executive order data from various sources, with Claude AI integration for enhanced data extraction.
- `fetch_orders.js`: Fetches executive orders from public data sources.
- `fetch_recent_orders.js` & `fetch_historical_orders.js`: Tools for fetching orders by date range.
- `fetch_whitehouse_orders.js`: Specialized tool for importing orders directly from whitehouse.gov.
- `data_processor.js`: Provides utilities for cleaning and enhancing the collected data.
- `generate_plain_summaries.js`: Creates plain language summaries of technical executive orders using Claude AI.

### 2. Data Storage
- `sqlite_setup.js`: Creates and initializes the SQLite database schema, including tables, indexes, and triggers for full-text search.
- `database_setup.js` & `database_setup_revised.js`: Provides additional database functionality and import capabilities.
- `executive_orders.db`: SQLite database file that stores all executive order data and metadata.

### 3. Server & API Options
- `api_server.js`: Full-featured RESTful API server that provides access to the executive orders database with filtering, sorting, and search capabilities.
- `simplified_server.js`: Lightweight server with basic functionality, ideal for demos and testing.
- `basic_server.js`: Minimal server implementation with essential features.
- `mcp_server.js`: Server implementation with Model Context Provider for AI-enhanced responses.
- `start_server.js`: Entry point for starting the appropriate server based on command-line arguments.
- `start_api.sh`: Convenience script for starting the API server.

### 4. User Interface
- `public/index.html`: Main web interface for browsing, filtering, and viewing executive orders with a responsive, table-based design.
- `public/plain_summary_demo.html`: Demonstration page for plain language summaries.
- `public/test.html`: Test page for development and debugging.

## Data Flow

1. **Data Collection**: Executive order data is collected through one of several methods:
   - Import from CSV file via `financial_executive_orders.csv`
   - Fetch from web sources via `fetch_orders.js`, `fetch_recent_orders.js`, or `fetch_historical_orders.js`
   - Direct import from the White House website via `fetch_whitehouse_orders.js`

2. **Data Processing**: Raw data is processed and enhanced:
   - Basic cleaning and normalization in `data_processor.js`
   - Initial rule-based categorization in `sqlite_setup.js`
   - AI-powered categorization via API endpoint `/api/categorize-order/:id`
   - Plain language summary generation in `generate_plain_summaries.js`

3. **Data Storage**: Processed data is stored in the SQLite database:
   - Schema defined and created in `sqlite_setup.js`
   - Full-text search capabilities via FTS5 virtual tables
   - Multiple related tables for categories, impact areas, etc.

4. **Data Access**: User interactions flow through the servers:
   - API requests handled by `api_server.js` with extensive filtering capabilities
   - UI interactions managed by `public/index.html` with AJAX requests to the API
   - Natural language queries processed with context from `knowledge_base_context.md`

## API Endpoints

The API server (`api_server.js`) provides the following key endpoints:

### Executive Order Access
- `GET /api/executive-orders`: List all executive orders with filtering and pagination
- `GET /api/executive-orders/:id`: Get detailed information about a specific executive order
- `GET /api/executive-orders/:id/plain-summary`: Get the plain language summary for an order
- `POST /api/executive-orders`: Create a new executive order
- `PUT /api/executive-orders/:id`: Update an existing executive order
- `DELETE /api/executive-orders/:id`: Delete an executive order

### Metadata Access
- `GET /api/categories`: Get all available categories
- `GET /api/impact-areas`: Get all impact areas
- `GET /api/university-impact-areas`: Get all university impact areas
- `GET /api/statistics`: Get summary statistics about executive orders
- `GET /api/system-info`: Get system information

### AI and Data Management
- `POST /api/fetch-new-orders`: Fetch and import new executive orders
- `POST /api/categorize-order/:id`: Use AI to categorize an executive order
- `POST /api/executive-orders/:id/compliance-actions`: Add compliance action for an order

For complete API documentation, see the `API_README.md` file.

## Database Schema

The SQLite database (`executive_orders.db`) includes the following key tables:

- `executive_orders`: Main table with executive order data including:
  - Basic metadata (order_number, title, signing_date, president)
  - Content (summary, full_text, url)
  - Impact assessment (impact_level, status, implementation_phase)
  - Plain language summaries (plain_language_summary)

- `categories`: Predefined categories for executive orders
- `order_categories`: Junction table linking orders to categories
- `impact_areas`: Predefined impact areas
- `order_impact_areas`: Junction table linking orders to impact areas
- `university_impact_areas`: University-specific impact areas
- `order_university_impact_areas`: Junction table linking orders to university impact areas
- `compliance_actions`: Compliance requirements and actions for executive orders
- `executive_orders_fts`: Full-text search virtual table for efficient text search

## AI Integration

The system integrates with Anthropic's Claude AI in several ways:

1. **Categorization**: `api_server.js` provides an endpoint to categorize orders using Claude
2. **Plain Language Summaries**: `generate_plain_summaries.js` creates accessible summaries
3. **Context-Based Responses**: Simple natural language processing using `knowledge_base_context.md`

For details on the AI implementation, see `AI_PIPELINE_EXPLANATION.md`.

## Configuration

The application uses environment variables for configuration:

- `ANTHROPIC_API_KEY`: Required for AI functionality
- `PORT`: The port number for the API server (default: 3001)
- `DATABASE_PATH`: Optional path to the SQLite database file (default: ./executive_orders.db)

## Getting Started

To run the application:

1. Start the API server:
   ```
   ./start_api.sh
   ```
   or
   ```
   node api_server.js
   ```

2. Access the web interface:
   ```
   http://localhost:3001/index.html
   ```

For development and debugging tips, see `DEBUG_README.md`.
