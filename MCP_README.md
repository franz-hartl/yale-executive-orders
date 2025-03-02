# Yale Executive Orders MCP Server

This project implements a Model Context Protocol (MCP) server for the Yale Executive Orders database. It allows language models like Claude to access and retrieve executive order data as contextual information, enabling more accurate and informed responses to queries about executive orders and their impact on universities.

## What is Model Context Protocol (MCP)?

Model Context Protocol (MCP) is a standardized way for large language models (LLMs) to retrieve external information as context for generating responses. It defines how context providers can expose data to LLMs through a consistent API.

## Server Features

- **Full MCP Implementation**: Implements the Model Context Protocol specification
- **Rich Data Access**: Provides access to executive orders, categories, impact areas, and more
- **Advanced Search**: Supports full-text search and filtering on multiple criteria
- **Stateless API**: RESTful API design with JSON responses
- **Comprehensive Documentation**: Detailed API documentation and usage examples

## Architecture Overview

The MCP server has two main components:

1. **API Server**: A Node.js Express server that handles MCP protocol requests
2. **Database Backend**: SQLite database containing executive orders data

The server provides several MCP endpoints:
- `/mcp/info` - Information about the server's capabilities
- `/mcp/search` - Search for executive orders
- `/mcp/context` - Get specific context by ID

## Running the Server

### Prerequisites

- Node.js (v16 or later)
- Yale Executive Orders database (SQLite)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```

### Running the Server

Start the MCP server with:

```
node mcp_server.js
```

The server will run on port 3001 by default. You can change this by setting the PORT environment variable.

## Connecting to the Server

To use this MCP server with a language model:

### Option 1: Direct API Calls

You can make direct HTTP requests to the server endpoints:

```javascript
// Example: Search for executive orders
const response = await fetch('http://localhost:3001/mcp/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'research funding',
    filters: { president: 'Biden' },
    limit: 10
  })
});

const data = await response.json();
```

### Option 2: MCP Integration Library

If you're building an application that needs to use this MCP server with Claude or another LLM, you can use our MCP integration library:

```javascript
const { MCPClient } = require('./mcp_llm_integration.js');

// Create a client instance
const mcpClient = new MCPClient({
  serverUrl: 'http://localhost:3001',
  anthropicApiKey: 'your-api-key'
});

// Ask a question using the MCP context
const response = await mcpClient.askWithContext(
  'How do Biden\'s executive orders impact universities?'
);

console.log(response);
```

## Using with GitHub Pages Static Files

This MCP server can also be configured to work with static JSON files hosted on GitHub Pages instead of a live SQLite database. This allows you to deploy a static version of your executive orders data while still providing MCP functionality.

### Setup for GitHub Pages

1. Export your data to JSON files using the export script:
   ```
   node export_to_json.js
   ```

2. This will create JSON files in the `docs/data/` directory:
   - `executive_orders.json`
   - `categories.json`
   - `impact_areas.json`
   - `university_impact_areas.json`

3. Commit and push these files to GitHub

4. Enable GitHub Pages for your repository (Settings > Pages)

5. Your data will be available at:
   ```
   https://your-username.github.io/yale-executive-orders/data/
   ```

## API Documentation

### MCP Info Endpoint

```
GET /mcp/info
```

Returns information about the server's capabilities.

### MCP Search Endpoint

```
POST /mcp/search
```

Search for executive orders based on query and filters.

Request body:
```json
{
  "query": "string",
  "filters": {
    "president": "string",
    "impact_level": "string",
    "signing_date_from": "date",
    "signing_date_to": "date",
    "category": "string",
    "impact_area": "string",
    "university_impact_area": "string"
  },
  "limit": "number",
  "offset": "number"
}
```

### MCP Context Endpoint

```
POST /mcp/context
```

Gets detailed information about a specific context item.

Request body:
```json
{
  "context_type": "executive_order|category|impact_area",
  "context_id": "string",
  "detail_level": "basic|standard|comprehensive"
}
```

## About the Yale Executive Orders Project

This server is part of the Yale Executive Orders Analysis project, which aims to analyze executive orders and their impact on Yale University and other higher education institutions. The project uses AI and data analysis to provide insights into policy implications and compliance requirements.

For more information, see the main project README.md.