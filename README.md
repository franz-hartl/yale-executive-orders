# Yale University Executive Order Analysis Assistant

This project provides an AI-powered system for analyzing executive orders and their impact on Yale University. It helps Yale administrators understand compliance requirements, operational impacts, and necessary actions in response to executive orders through plain language summaries, categorization, and a user-friendly interface.

## Core Features

1. **AI-Enhanced Analysis**: Leverages Claude AI for categorization, plain language summaries, and question answering
2. **University-Focused Classification**: Tailored categorization system specifically for higher education impact
3. **Plain Language Summaries**: Accessible explanations of complex executive orders for non-legal experts
4. **Comprehensive Database**: Stores executive orders with full-text search and filtering capabilities
5. **Interactive Interface**: Clean, table-based UI for browsing, filtering, and accessing order details

## System Architecture

The system consists of the following key components:

1. **SQLite Database**: Provides structured data storage with full-text search capabilities
2. **API Server**: RESTful API for accessing and managing executive order data
3. **Web Interface**: Browser-based UI for interacting with the executive order database 
4. **AI Integration**: Anthropic Claude API integration for advanced text processing
5. **Data Collection Tools**: Utilities for fetching and importing executive order data

## University-Focused Impact Areas

Executive orders are classified according to their impact on specific university domains:

### Research Funding
- Federal research grants and funding priorities
- NSF, NIH, and other agency grant programs
- Research security and foreign collaboration policies

### Student Aid & Higher Education Finance
- Student financial aid and federal loan programs
- Pell Grant and scholarship initiatives
- Education financing and tuition assistance

### Administrative Compliance
- Regulatory reporting requirements
- Title IX and civil rights compliance
- Federal mandates for universities

### Workforce & Employment Policy
- Visa regulations for international faculty and students
- Employment policies and labor regulations
- Diversity and inclusion requirements

### Public-Private Partnerships
- University-industry collaboration frameworks
- Technology transfer and commercialization
- Economic development initiatives involving higher education

## Prerequisites

- Node.js (v16 or later)
- Anthropic API key
- Internet connection

## Getting Started

### 1. Environment Setup

Create a `.env` file in the project root directory with:

```
# Required for AI functionality
ANTHROPIC_API_KEY=your_api_key

# Optional configuration
PORT=3001
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the API Server

```bash
# Using the convenience script
./start_api.sh

# Or directly
node api_server.js
```

### 4. Access the Web Interface

Once the server is running, open your browser and navigate to:

```
http://localhost:3001/index.html
```

## Core Components

### Server Options

The system provides multiple server implementations for different use cases:

- `api_server.js`: Full-featured RESTful API with database integration (recommended)
- `simplified_server.js`: Lightweight server for basic functionality
- `basic_server.js`: Minimal server implementation for static files
- `mcp_server.js`: Server with Model Context Provider for advanced AI features

### Data Collection and Processing

- `fetch_orders.js`: Fetches executive orders from public data sources
- `fetch_recent_orders.js` & `fetch_historical_orders.js`: Tools for fetching orders by date range
- `fetch_whitehouse_orders.js`: Imports orders directly from whitehouse.gov
- `ai_scraper.js`: AI-powered data extraction from various sources
- `data_processor.js`: Utilities for cleaning and enhancing data
- `generate_plain_summaries.js`: Creates plain language summaries using Claude AI

### Database Management

- `sqlite_setup.js`: Creates and initializes the SQLite database schema
- `database_setup.js`: Provides additional database functionality

## API Endpoints

The API server provides comprehensive endpoints for executive order management:

### Executive Order Access
- `GET /api/executive-orders`: List all orders with filtering and pagination
- `GET /api/executive-orders/:id`: Get detailed information about a specific order
- `GET /api/executive-orders/:id/plain-summary`: Get the plain language summary

### Metadata Access
- `GET /api/categories`: Get all available categories
- `GET /api/impact-areas`: Get all impact areas
- `GET /api/university-impact-areas`: Get all university impact areas
- `GET /api/statistics`: Get statistics about the executive orders

### AI and Data Management
- `POST /api/fetch-new-orders`: Fetch and import new executive orders
- `POST /api/categorize-order/:id`: Use AI to categorize an executive order
- `POST /api/executive-orders/:id/compliance-actions`: Add compliance action

For complete API documentation, see the `API_README.md` file.

## Customization and Extension

### Adding New Executive Orders

You can add new executive orders in several ways:

1. **Automatic Import**: Click "Fetch New Orders" in the UI or use the API endpoint
2. **CSV Import**: Add new orders to `financial_executive_orders.csv` and run `node sqlite_setup.js`
3. **Direct API**: Use the `POST /api/executive-orders` endpoint with order data

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

### Customizing Categorization

To modify the AI categorization system:

1. Edit the university impact areas in `sqlite_setup.js` (lines 156-162)
2. Modify the categorization prompt in `api_server.js` (lines 778-784)
3. Add or adjust keyword mappings in `sqlite_setup.js` (lines 279-309)

## Troubleshooting

For common issues and solutions:

- **API Connection**: Ensure the API server is running on port 3001
- **Database Issues**: Run `node sqlite_setup.js` to reset the database
- **Missing Summaries**: Execute `node generate_plain_summaries.js`
- **AI Errors**: Verify your API key in the `.env` file

For detailed troubleshooting information, refer to `DEBUG_README.md`.

## Project Documentation

The project includes several documentation files:

- `API_README.md`: Complete API documentation
- `AI_PIPELINE_EXPLANATION.md`: Details of the AI integration
- `PROJECT_STRUCTURE.md`: Overview of the project files and architecture
- `DEBUG_README.md`: Troubleshooting guide and development tips