# Model Context Protocol (MCP) Client Guide

This guide explains how external clients, such as Claude running in a terminal, can connect to the Yale Executive Orders database for document analysis through the Model Context Protocol (MCP).

## Overview

The Yale Executive Orders MCP provides a standardized way for language models and other AI systems to access executive order data and analyze documents against this repository of information. This enables AI assistants to:

1. Extract relevant key terms from user documents
2. Match these terms against executive orders
3. Analyze potential compliance issues and impacts
4. Generate actionable recommendations

## Connection Methods

External clients have two main options for connecting to the Yale EO data:

### 1. Direct API Connection (Live Server)

For clients that can make HTTP requests, the MCP server exposes endpoints that implement the Model Context Protocol:

```
https://your-mcp-server.example.com/mcp/
```

### 2. Static JSON Access (GitHub Pages)

For clients without direct API access, or for improved performance, all data is available as static JSON files on GitHub Pages:

```
https://franzhartl.github.io/yale-executive-orders/data/
```

## Data Flow for Document Analysis

The document analysis process follows these steps:

1. **Term Extraction**: Extract key terms from the document
2. **Search**: Use extracted terms to find relevant executive orders
3. **Context Retrieval**: Get detailed information about matching orders
4. **Analysis**: Compare document against relevant executive orders
5. **Results**: Generate formatted analysis with recommendations

## Client Implementation

### Using the API Endpoints

```javascript
// Example using fetch API
async function analyzeDocument(documentText) {
  // Step 1: Extract terms
  const termsResponse = await fetch('https://your-server.com/mcp/extract-terms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_text: documentText })
  });
  const termsData = await termsResponse.json();
  const extractedTerms = termsData.data.terms;
  
  // Step 2: Search for relevant orders using extracted terms
  const searchResponse = await fetch('https://your-server.com/mcp/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ terms: extractedTerms, limit: 5 })
  });
  const searchData = await searchResponse.json();
  const relevantOrders = searchData.data.results;
  
  // Step 3: Get detailed context for analysis
  const orderDetails = await Promise.all(
    relevantOrders.map(async order => {
      const contextResponse = await fetch('https://your-server.com/mcp/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context_type: 'executive_order',
          context_id: order.id,
          detail_level: 'comprehensive'
        })
      });
      return contextResponse.json();
    })
  );
  
  // Step 4 & 5: Analyze and format results (client-specific)
  return {
    extractedTerms,
    relevantOrders,
    orderDetails,
    // Add your analysis here
  };
}
```

### Using Static JSON Files (Client-Side Processing)

```javascript
// Example using fetch API with GitHub Pages data
async function analyzeDocumentStatic(documentText) {
  // Load necessary data files
  const [ordersResponse, searchIndexResponse] = await Promise.all([
    fetch('https://franzhartl.github.io/yale-executive-orders/data/processed_executive_orders.json'),
    fetch('https://franzhartl.github.io/yale-executive-orders/data/search_index.json')
  ]);
  
  const orders = await ordersResponse.json();
  const searchIndex = await searchIndexResponse.json();
  
  // Step 1: Extract terms (client-side implementation)
  const extractedTerms = extractKeyTerms(documentText);
  
  // Step 2: Use search index to find relevant orders
  const relevantOrderIds = new Set();
  extractedTerms.forEach(term => {
    const matchingIds = searchIndex[term.toLowerCase()] || [];
    matchingIds.forEach(id => relevantOrderIds.add(id));
  });
  
  // Get order details from IDs
  const relevantOrders = orders.filter(order => relevantOrderIds.has(order.id));
  
  // Sort by relevance (based on number of term matches)
  relevantOrders.sort((a, b) => {
    const aMatches = countTermMatches(a, extractedTerms);
    const bMatches = countTermMatches(b, extractedTerms);
    return bMatches - aMatches;
  });
  
  // Step 3, 4 & 5: Client-side analysis and formatting
  return {
    extractedTerms,
    relevantOrders: relevantOrders.slice(0, 5), // Top 5 most relevant
    // Add your analysis here
  };
}

// Helper function to count term matches in an order
function countTermMatches(order, terms) {
  const orderText = `${order.title} ${order.summary} ${order.full_text || ''}`.toLowerCase();
  return terms.reduce((count, term) => {
    return count + (orderText.includes(term.toLowerCase()) ? 1 : 0);
  }, 0);
}

// Simple term extraction implementation
function extractKeyTerms(text) {
  // Implementation similar to the server-side version
  // ...
}
```

## Examples for Claude Terminal Client

### Basic Claude Prompt Structure

When Claude is running in a terminal, it can analyze documents against executive orders using this workflow:

```
User: I need help analyzing this document against relevant executive orders:
[DOCUMENT TEXT]

Claude: I'll analyze this document against Yale's executive orders database.

[Claude extracts key terms from the document]
[Claude queries Yale EO data with those terms]
[Claude formats relevant EOs as context]
[Claude generates analysis comparing document against EOs]
```

### Example Claude Command

```bash
claude analyze --document path/to/document.txt --context yale-executive-orders --output compliance-report.md
```

### Example Prompt for Claude

```
I need to analyze this research grant proposal against relevant executive orders:

[RESEARCH GRANT PROPOSAL TEXT]

Please:
1. Extract key terms from this proposal
2. Identify relevant executive orders from the Yale database
3. Analyze potential compliance issues or requirements
4. Provide recommendations for ensuring the proposal meets all requirements
```

## Accessing Yale EO Data in Claude

Claude can access the Yale Executive Orders data through these methods:

1. **Direct URL References**: Claude can access the JSON files directly through the GitHub Pages URLs when it has web access capabilities.

2. **Pre-loaded Context**: In some implementations, relevant Yale EO data can be pre-loaded as context for Claude.

3. **Hybrid Approach**: The user can provide both the document and relevant EOs, letting Claude focus on analysis.

## Security and Privacy Considerations

When using the Yale EO MCP for document analysis:

1. **Document Privacy**: All document processing happens client-side; sensitive content is not stored on the server.

2. **Rate Limiting**: The API includes rate limiting to prevent abuse.

3. **Attribution**: Always attribute any analysis to both Claude and the Yale Executive Orders database.

## Getting Help

For more detailed documentation:

- API documentation: See `/docs/data/api_description.json`
- MCP Server documentation: See `MCP_SERVER_DOCUMENTATION.md`
- Document analysis workflow: See `/docs/document_analysis_flow.md`

For technical support, please contact the repository maintainers.