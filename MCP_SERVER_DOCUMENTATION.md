# Yale Executive Orders MCP Server Documentation

This document provides comprehensive documentation for the Yale Executive Orders Model Context Protocol (MCP) server, including how to set it up, configure it, and use it with both SQLite database and GitHub Pages static files.

## Table of Contents
1. [Overview](#overview)
2. [Server Installation](#server-installation)
3. [Server Configuration](#server-configuration)
4. [API Reference](#api-reference)
5. [Using with GitHub Pages](#using-with-github-pages)
6. [Integration Examples](#integration-examples)
7. [Troubleshooting](#troubleshooting)

## Overview

The Yale Executive Orders MCP server provides a standardized API for LLMs (Large Language Models) to access executive order data as contextual information. It implements the Model Context Protocol, allowing tools like Claude to retrieve relevant information about executive orders when answering questions.

### Key Components

1. **MCP Server (`mcp_server.js`)**: The main Express server that implements the MCP protocol
2. **LLM Integration (`mcp_llm_integration.js`)**: Example of how to integrate the MCP server with Claude or other LLMs 
3. **Static Data Files**: JSON files in the `docs/data/` directory that can be hosted on GitHub Pages

## Server Installation

### Prerequisites

- Node.js v16 or later
- npm
- SQLite database with executive orders data

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/yale-executive-orders.git
   cd yale-executive-orders
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file with the following content:
   ```
   PORT=3001
   ANTHROPIC_API_KEY=your_api_key_here  # Only needed for LLM integration
   ```

4. **Start the server:**
   ```bash
   node mcp_server.js
   ```

## Server Configuration

The MCP server can be configured through environment variables and by modifying the server code directly.

### Environment Variables

- `PORT`: The port on which the server will run (default: 3001)
- `ANTHROPIC_API_KEY`: API key for Anthropic's Claude (only needed for LLM integration)

### Configuration Options

Additional configuration options can be modified in the `mcp_server.js` file:

- **Database Path**: Change the SQLite database path in line 28
- **CORS Settings**: Modify CORS settings in line 24
- **Rate Limits**: Adjust request rate limits in lines 74-76

## API Reference

The MCP server exposes the following endpoints:

### Document Analysis Endpoints

#### POST /mcp/extract-terms

Extract key terms from a document for analysis.

**Request:**
```json
{
  "document_text": "This document outlines compliance requirements for university research programs funded by federal grants, with specific attention to research security protocols and international collaborations."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Extracted terms from document",
  "data": {
    "total": 8,
    "terms": [
      "compliance requirements",
      "university research",
      "research programs",
      "federal grants",
      "research security",
      "security protocols",
      "international collaborations",
      "university"
    ]
  },
  "metadata": {
    "source": "Yale Executive Orders Database",
    "timestamp": "2025-03-02T12:34:56.789Z",
    "version": "1.0.0"
  }
}
```

### General MCP Endpoints

#### GET /mcp/info

Returns information about the server's capabilities.

**Response:**
```json
{
  "success": true,
  "message": "MCP server information",
  "data": {
    "name": "Yale Executive Orders MCP Provider",
    "version": "1.0.0",
    "description": "Provides executive order data and analysis for use as context in LLM applications",
    "capabilities": [
      "executive_orders_search",
      "executive_orders_by_id",
      "executive_orders_by_category",
      "executive_orders_by_impact",
      "categories_list",
      "impact_areas_list",
      "university_impact_areas_list"
    ],
    "authentication": {
      "required": false
    },
    "request_limits": {
      "max_tokens_per_request": 100000,
      "max_requests_per_minute": 60
    },
    "contact": "support@example.edu"
  },
  "metadata": {
    "source": "Yale Executive Orders Database",
    "timestamp": "2025-03-02T12:34:56.789Z",
    "version": "1.0.0"
  }
}
```

### POST /mcp/search

Search for executive orders based on query, terms, and filters, with relevance scoring.

**Request:**
```json
{
  "query": "research funding",
  "terms": ["research security", "international collaboration"],
  "filters": {
    "president": "Biden",
    "impact_level": "High",
    "signing_date_from": "2021-01-20",
    "signing_date_to": "2021-12-31",
    "category": "Education",
    "impact_area": "Funding",
    "university_impact_area": "Research Administration"
  },
  "limit": 10,
  "offset": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Search results",
  "data": {
    "total": 2,
    "limit": 10,
    "offset": 0,
    "results": [
      {
        "id": 1234,
        "order_number": "14021",
        "title": "Executive Order on Research Funding",
        "signing_date": "2021-05-15",
        "president": "Biden",
        "impact_level": "High",
        "summary": "This executive order aims to increase federal funding for scientific research...",
        "categories": ["Education", "Science"],
        "impact_areas": ["Funding", "Policy"],
        "university_impact_areas": ["Research Administration", "Research Funding"],
        "relevance_score": 4.87
      },
      {
        "id": 1235,
        "order_number": "14025",
        "title": "Executive Order on Scientific Integrity",
        "signing_date": "2021-06-20",
        "president": "Biden",
        "impact_level": "High",
        "summary": "This executive order establishes policies to ensure scientific integrity...",
        "categories": ["Science", "Policy"],
        "impact_areas": ["Compliance", "Funding"],
        "university_impact_areas": ["Research Administration"],
        "relevance_score": 3.62
      }
    ]
  },
  "metadata": {
    "source": "Yale Executive Orders Database",
    "timestamp": "2025-03-02T12:34:56.789Z",
    "version": "1.0.0"
  }
}
```

### POST /mcp/context

Get detailed information about a specific context item.

**Request:**
```json
{
  "context_type": "executive_order",
  "context_id": "14021",
  "detail_level": "comprehensive"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Executive order details",
  "data": {
    "id": 1234,
    "order_number": "14021",
    "title": "Executive Order on Research Funding",
    "signing_date": "2021-05-15",
    "president": "Biden",
    "impact_level": "High",
    "summary": "This executive order aims to increase federal funding for scientific research...",
    "full_text": "By the authority vested in me as President by the Constitution and the laws of the United States of America...",
    "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2021/05/15/executive-order-14021",
    "status": "Active",
    "implementation_phase": "Implementation",
    "effective_date": "2021-05-15",
    "confidence_rating": "High",
    "categories": ["Education", "Science"],
    "impact_areas": ["Funding", "Policy"],
    "university_impact_areas": ["Research Administration", "Research Funding"],
    "yale_alert_level": "Medium",
    "core_impact": "This order significantly increases available research funding for universities...",
    "yale_imperative": "Yale should prepare grant applications under the new guidelines...",
    "what_changed": "Increases federal research funding by 10% and prioritizes climate science...",
    "plain_language_summary": "<p>This executive order boosts funding for university research...</p>",
    "executive_brief": "<p>Key points for university administrators regarding research funding changes...</p>",
    "comprehensive_analysis": "<p>Detailed analysis of the implications for higher education institutions...</p>"
  },
  "metadata": {
    "source": "Yale Executive Orders Database",
    "timestamp": "2025-03-02T12:34:56.789Z",
    "version": "1.0.0"
  }
}
```

## Using with GitHub Pages

The MCP server can be configured to work with static JSON files hosted on GitHub Pages instead of requiring a live SQLite database. This is useful for deployment scenarios where running a server is not feasible.

### Exporting Data to GitHub Pages

1. **Export database to JSON files:**
   ```bash
   node export_to_json.js
   ```
   This will create JSON files in the `docs/data/` directory.

2. **Push to GitHub:**
   ```bash
   git add docs/data
   git commit -m "Update executive orders data"
   git push
   ```

3. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Navigate to Settings > Pages
   - Select the "main" branch and "/docs" folder
   - Click "Save"

### Accessing Static Data

Once published, your data will be available at:
```
https://yourusername.github.io/yale-executive-orders/data/
```

The following files will be accessible:
- `executive_orders.json` - All executive orders
- `processed_executive_orders.json` - Enhanced executive orders with additional metadata
- `categories.json` - Categories for executive orders
- `impact_areas.json` - Impact areas for executive orders
- `university_impact_areas.json` - University-specific impact areas

## Integration Examples

### Example 1: Direct API Call

```javascript
// Example of searching for executive orders via the MCP API
async function searchExecutiveOrders(query) {
  const response = await fetch('http://localhost:3001/mcp/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query,
      limit: 5
    })
  });
  
  const data = await response.json();
  return data.data.results;
}

// Usage
const orders = await searchExecutiveOrders('climate change');
console.log(orders);
```

### Example 2: LLM Integration

```javascript
const { MCPClient } = require('./mcp_llm_integration.js');

// Create client instance
const mcpClient = new MCPClient({
  serverUrl: 'http://localhost:3001',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
});

// Ask a question using MCP context
async function askAboutExecutiveOrders(question) {
  const response = await mcpClient.askWithContext(question);
  return response;
}

// Usage
const answer = await askAboutExecutiveOrders(
  'How do recent executive orders impact university research funding?'
);
console.log(answer);
```

### Example 3: Integration with GitHub Pages Static Data

```javascript
// Load data from GitHub Pages
async function loadExecutiveOrdersData() {
  const url = 'https://yourusername.github.io/yale-executive-orders/data/processed_executive_orders.json';
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

// Search within the loaded data
function searchOrders(orders, query) {
  const searchTerms = query.toLowerCase().split(' ');
  return orders.filter(order => {
    const text = `${order.title} ${order.summary}`.toLowerCase();
    return searchTerms.some(term => text.includes(term));
  });
}

// Usage
const orders = await loadExecutiveOrdersData();
const results = searchOrders(orders, 'climate research');
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: Server Won't Start

**Possible causes and solutions:**
- **Database not found**: Ensure the SQLite database file exists at the path specified
- **Port already in use**: Change the PORT environment variable
- **Dependencies missing**: Run `npm install` to install all dependencies

#### Issue: Cannot Connect to Server

**Possible causes and solutions:**
- **Wrong URL**: Verify the server URL (default is http://localhost:3001)
- **CORS issues**: Update CORS settings in the server code
- **Server not running**: Check if the server process is running

#### Issue: GitHub Pages Data Not Accessible

**Possible causes and solutions:**
- **Repository not published**: Enable GitHub Pages in repository settings
- **Wrong path**: Ensure the URL path matches the structure of your repository
- **Files not committed**: Verify that data files are committed and pushed to the repository
- **CORS issues**: For direct browser access, you may need to configure CORS headers

#### Issue: Empty Search Results

**Possible causes and solutions:**
- **No matching data**: Try a broader search query
- **Query too specific**: Use fewer search terms
- **Database empty**: Verify that the database contains executive orders data

### Getting Help

If you encounter issues not covered here, you can:
1. Check the server logs for error messages
2. Open an issue on the GitHub repository
3. Contact the project maintainers at [support email]