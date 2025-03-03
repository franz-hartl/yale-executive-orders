# Yale Executive Orders MCP API Client Guide

This guide demonstrates how to use the Yale Executive Orders Model Context Protocol (MCP) API with your applications, specifically focusing on accessing the static data files hosted on GitHub Pages.

## Using the GitHub Pages Static Data

The Yale Executive Orders data is exported as static JSON files and hosted on GitHub Pages, making it accessible from any application with an internet connection. This approach allows for simple integration without needing to run a server.

### Data File Locations

The following files are available at the GitHub Pages URL:

```
https://franzhartl.github.io/yale-executive-orders/data/
```

Available files:
- `executive_orders.json` - All executive orders
- `processed_executive_orders.json` - Enhanced executive orders with additional metadata
- `categories.json` - Categories for executive orders
- `impact_areas.json` - Impact areas for executive orders
- `university_impact_areas.json` - University-specific impact areas
- `statistics.json` - System statistics and aggregated data

### Loading Data in JavaScript

Here's a simple example of loading and using the data in a JavaScript application:

```javascript
// Function to load executive order data
async function loadExecutiveOrders() {
  try {
    // First try to load the enhanced processed data
    const url = 'https://franzhartl.github.io/yale-executive-orders/data/processed_executive_orders.json';
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading executive orders:', error);
    
    // Fallback to the basic data
    try {
      const fallbackUrl = 'https://franzhartl.github.io/yale-executive-orders/data/executive_orders.json';
      const fallbackResponse = await fetch(fallbackUrl);
      
      if (!fallbackResponse.ok) {
        throw new Error(`Failed to load fallback data: ${fallbackResponse.status}`);
      }
      
      const fallbackData = await fallbackResponse.json();
      return fallbackData;
    } catch (fallbackError) {
      console.error('Error loading fallback data:', fallbackError);
      throw fallbackError;
    }
  }
}

// Function to search executive orders by query
function searchOrders(orders, query) {
  if (!query || query.trim() === '') {
    return orders;
  }
  
  const searchTerms = query.toLowerCase().split(/\s+/);
  
  return orders.filter(order => {
    const searchText = `${order.title} ${order.summary} ${order.full_text || ''}`.toLowerCase();
    return searchTerms.some(term => searchText.includes(term));
  });
}

// Function to filter orders by criteria
function filterOrders(orders, filters = {}) {
  return orders.filter(order => {
    // Filter by president
    if (filters.president && order.president !== filters.president) {
      return false;
    }
    
    // Filter by impact level
    if (filters.impact_level && order.impact_level !== filters.impact_level) {
      return false;
    }
    
    // Filter by date range
    if (filters.signing_date_from) {
      const fromDate = new Date(filters.signing_date_from);
      const orderDate = new Date(order.signing_date);
      if (orderDate < fromDate) {
        return false;
      }
    }
    
    if (filters.signing_date_to) {
      const toDate = new Date(filters.signing_date_to);
      const orderDate = new Date(order.signing_date);
      if (orderDate > toDate) {
        return false;
      }
    }
    
    // Filter by category
    if (filters.category && order.categories) {
      const hasCategory = typeof order.categories === 'string' 
        ? order.categories.includes(filters.category)
        : order.categories.includes(filters.category);
      
      if (!hasCategory) {
        return false;
      }
    }
    
    return true;
  });
}

// Example usage
(async () => {
  try {
    // Load the data
    const orders = await loadExecutiveOrders();
    console.log(`Loaded ${orders.length} executive orders`);
    
    // Example 1: Search for climate-related orders
    const climateOrders = searchOrders(orders, 'climate change');
    console.log(`Found ${climateOrders.length} orders related to climate change`);
    
    // Example 2: Filter for Biden's high-impact orders
    const highImpactBidenOrders = filterOrders(orders, {
      president: 'Biden',
      impact_level: 'High'
    });
    console.log(`Found ${highImpactBidenOrders.length} high-impact orders from Biden`);
    
    // Example 3: Combined search and filter
    const recentResearchOrders = filterOrders(
      searchOrders(orders, 'research funding'),
      { signing_date_from: '2020-01-01' }
    );
    console.log(`Found ${recentResearchOrders.length} recent orders related to research funding`);
    
  } catch (error) {
    console.error('Failed to process executive orders:', error);
  }
})();
```

## Using with Model Context Protocol (MCP)

You can use the GitHub Pages data as a context source for LLMs like Claude, implementing a lightweight Model Context Protocol solution.

### Basic MCP Implementation

Here's an example of using the data with Claude's API:

```javascript
const axios = require('axios');
require('dotenv').config(); // For loading API key from .env file

// MCP Client configuration
const config = {
  dataUrl: 'https://franzhartl.github.io/yale-executive-orders/data',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: 'claude-3-sonnet-20240229'
};

// MCP Client class
class MCPClient {
  constructor(config) {
    this.config = config;
    this.dataCache = {
      orders: null,
      categories: null,
      impactAreas: null
    };
  }
  
  // Load all necessary data
  async loadData() {
    if (!this.dataCache.orders) {
      const ordersResponse = await axios.get(`${this.config.dataUrl}/processed_executive_orders.json`)
        .catch(() => axios.get(`${this.config.dataUrl}/executive_orders.json`));
      this.dataCache.orders = ordersResponse.data;
      
      try {
        const categoriesResponse = await axios.get(`${this.config.dataUrl}/categories.json`);
        this.dataCache.categories = categoriesResponse.data;
      } catch (error) {
        console.warn('Could not load categories:', error.message);
      }
      
      try {
        const impactAreasResponse = await axios.get(`${this.config.dataUrl}/impact_areas.json`);
        this.dataCache.impactAreas = impactAreasResponse.data;
      } catch (error) {
        console.warn('Could not load impact areas:', error.message);
      }
    }
  }
  
  // Search for relevant orders
  searchOrders(query, limit = 3) {
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    // Score each order by relevance
    const scoredOrders = this.dataCache.orders.map(order => {
      const searchText = `${order.title} ${order.summary} ${order.full_text || ''}`.toLowerCase();
      let score = 0;
      
      for (const term of searchTerms) {
        if (term.length < 3) continue; // Skip short terms
        const count = (searchText.match(new RegExp(term, 'g')) || []).length;
        score += count;
      }
      
      return { order, score };
    });
    
    // Sort by score and take top results
    return scoredOrders
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.order);
  }
  
  // Format orders as context
  formatOrdersAsContext(orders) {
    let context = '';
    
    orders.forEach((order, index) => {
      context += `EXECUTIVE ORDER ${index + 1}:\n`;
      context += `Order Number: ${order.order_number}\n`;
      context += `Title: ${order.title}\n`;
      context += `Signing Date: ${order.signing_date}\n`;
      context += `President: ${order.president}\n`;
      context += `Impact Level: ${order.impact_level}\n`;
      
      if (order.summary) {
        context += `Summary: ${order.summary}\n`;
      }
      
      if (order.categories) {
        const categories = Array.isArray(order.categories) 
          ? order.categories.join(', ') 
          : order.categories;
        context += `Categories: ${categories}\n`;
      }
      
      context += '\n';
    });
    
    return context;
  }
  
  // Ask a question using context
  async askWithContext(question) {
    await this.loadData();
    
    // Find relevant orders
    const relevantOrders = this.searchOrders(question);
    
    if (relevantOrders.length === 0) {
      return 'No relevant executive orders found for your question.';
    }
    
    // Format as context
    const context = this.formatOrdersAsContext(relevantOrders);
    
    // Create prompt
    const prompt = `
You are a policy expert specializing in executive orders and their impact on higher education institutions.

Here is information about executive orders that may be relevant to the question:

${context}

Based on this information, please answer the following question:
${question}

If the provided information doesn't contain enough details to fully answer the question, acknowledge that and explain what additional information would be needed.
`;

    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: this.config.anthropicModel,
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.anthropicApiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    return response.data.content[0].text;
  }
}

// Example usage
async function askAboutExecutiveOrders() {
  const client = new MCPClient(config);
  
  // Example question
  const question = 'How do recent executive orders affect university research funding?';
  console.log(`Question: ${question}`);
  
  const answer = await client.askWithContext(question);
  console.log('Answer:', answer);
}

askAboutExecutiveOrders().catch(error => {
  console.error('Error:', error.message);
});
```

## Integration Examples

### Web Application

For a web application, you can create a simple client that loads data from GitHub Pages:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Orders Explorer</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    .search-form { margin-bottom: 20px; }
    .order-card { border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
    .order-title { font-weight: bold; margin-bottom: 5px; }
    .order-meta { color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Executive Orders Explorer</h1>
  
  <div class="search-form">
    <input type="text" id="search-input" placeholder="Search executive orders...">
    <button id="search-button">Search</button>
  </div>
  
  <div id="results-container"></div>
  
  <script>
    const dataUrl = 'https://franzhartl.github.io/yale-executive-orders/data';
    let executiveOrders = [];
    
    // Load executive orders data
    async function loadData() {
      try {
        const response = await fetch(`${dataUrl}/processed_executive_orders.json`);
        if (!response.ok) throw new Error('Failed to load data');
        executiveOrders = await response.json();
        console.log(`Loaded ${executiveOrders.length} executive orders`);
      } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('results-container').innerHTML = 
          '<p>Error loading executive orders data. Please try again later.</p>';
      }
    }
    
    // Search executive orders
    function searchOrders(query) {
      if (!query) return executiveOrders.slice(0, 10); // Show first 10 if no query
      
      const searchTerms = query.toLowerCase().split(/\s+/);
      return executiveOrders.filter(order => {
        const searchText = `${order.title} ${order.summary || ''}`.toLowerCase();
        return searchTerms.some(term => searchText.includes(term));
      });
    }
    
    // Display search results
    function displayResults(orders) {
      const container = document.getElementById('results-container');
      
      if (orders.length === 0) {
        container.innerHTML = '<p>No executive orders found matching your search.</p>';
        return;
      }
      
      const html = orders.map(order => `
        <div class="order-card">
          <div class="order-title">${order.title}</div>
          <div class="order-meta">
            Order ${order.order_number} | ${order.president} | ${order.signing_date} | Impact: ${order.impact_level}
          </div>
          <p>${order.summary || 'No summary available.'}</p>
        </div>
      `).join('');
      
      container.innerHTML = html;
    }
    
    // Initialize the app
    document.addEventListener('DOMContentLoaded', async () => {
      await loadData();
      displayResults(executiveOrders.slice(0, 10)); // Show first 10 by default
      
      // Set up search button
      document.getElementById('search-button').addEventListener('click', () => {
        const query = document.getElementById('search-input').value;
        const results = searchOrders(query);
        displayResults(results);
      });
      
      // Allow pressing Enter to search
      document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          document.getElementById('search-button').click();
        }
      });
    });
  </script>
</body>
</html>
```

### Python Client

Here's an example of accessing the data with Python:

```python
import requests
import json

class ExecutiveOrdersClient:
    def __init__(self, base_url='https://franzhartl.github.io/yale-executive-orders/data'):
        self.base_url = base_url
        self.orders = None
        self.categories = None
        self.impact_areas = None
    
    def load_data(self):
        """Load all necessary data from GitHub Pages"""
        try:
            # Try to load processed executive orders first
            response = requests.get(f'{self.base_url}/processed_executive_orders.json')
            response.raise_for_status()
            self.orders = response.json()
            print(f"Loaded {len(self.orders)} executive orders")
        except Exception as e:
            print(f"Error loading processed orders: {e}")
            try:
                # Fall back to regular executive orders
                response = requests.get(f'{self.base_url}/executive_orders.json')
                response.raise_for_status()
                self.orders = response.json()
                print(f"Loaded {len(self.orders)} executive orders (fallback)")
            except Exception as fallback_error:
                print(f"Error loading orders (fallback): {fallback_error}")
                raise
        
        # Load categories
        try:
            response = requests.get(f'{self.base_url}/categories.json')
            response.raise_for_status()
            self.categories = response.json()
            print(f"Loaded {len(self.categories)} categories")
        except Exception as e:
            print(f"Warning: Could not load categories: {e}")
        
        # Load impact areas
        try:
            response = requests.get(f'{self.base_url}/impact_areas.json')
            response.raise_for_status()
            self.impact_areas = response.json()
            print(f"Loaded {len(self.impact_areas)} impact areas")
        except Exception as e:
            print(f"Warning: Could not load impact areas: {e}")
    
    def search_orders(self, query=None, filters=None):
        """Search executive orders by query and filters"""
        if self.orders is None:
            self.load_data()
        
        # Start with all orders
        results = self.orders
        
        # Apply text search if query provided
        if query:
            query = query.lower()
            search_terms = query.split()
            
            results = [
                order for order in results
                if any(term in (order.get('title', '') + ' ' + order.get('summary', '')).lower() 
                       for term in search_terms)
            ]
        
        # Apply filters
        if filters:
            if 'president' in filters:
                results = [order for order in results if order.get('president') == filters['president']]
            
            if 'impact_level' in filters:
                results = [order for order in results if order.get('impact_level') == filters['impact_level']]
            
            if 'signing_date_from' in filters:
                date_from = filters['signing_date_from']
                results = [order for order in results if order.get('signing_date', '') >= date_from]
            
            if 'signing_date_to' in filters:
                date_to = filters['signing_date_to']
                results = [order for order in results if order.get('signing_date', '') <= date_to]
        
        return results
    
    def get_order_by_id(self, order_id):
        """Get a specific executive order by ID or order number"""
        if self.orders is None:
            self.load_data()
        
        # Search by ID or order number
        for order in self.orders:
            if str(order.get('id')) == str(order_id) or order.get('order_number') == order_id:
                return order
        
        return None

# Example usage
if __name__ == "__main__":
    client = ExecutiveOrdersClient()
    
    # Example 1: Search by term
    results = client.search_orders("climate")
    print(f"Found {len(results)} orders related to climate")
    if results:
        print(f"First result: {results[0]['title']}")
    
    # Example 2: Filter by president and impact level
    filtered_results = client.search_orders(filters={
        'president': 'Biden',
        'impact_level': 'High'
    })
    print(f"Found {len(filtered_results)} high-impact orders from Biden")
    
    # Example 3: Get specific order
    order = client.get_order_by_id("14008")
    if order:
        print(f"Order details: {order['title']} - {order['signing_date']}")
    else:
        print("Order not found")
```

## Document Analysis with Yale EO Data

The Yale Executive Orders API now supports document analysis capabilities that allow clients (like Claude running in a terminal) to analyze documents against the executive orders database.

### Document Analysis Flow

The basic flow for document analysis follows these steps:

1. Extract key terms from the document
2. Use those terms to search for relevant executive orders
3. Analyze the document against the matched executive orders
4. Generate recommendations and compliance guidance

### Client Implementation for Document Analysis

Here's a complete example showing how to implement document analysis with the Yale EO data:

```javascript
// Document Analysis Client
class DocumentAnalysisClient {
  constructor(baseUrl = 'https://franzhartl.github.io/yale-executive-orders/data') {
    this.baseUrl = baseUrl;
    this.ordersCache = null;
    this.searchIndexCache = null;
  }
  
  // Load necessary data
  async loadData() {
    if (!this.ordersCache || !this.searchIndexCache) {
      try {
        // Load both processed orders and search index in parallel
        const [ordersResponse, searchIndexResponse] = await Promise.all([
          fetch(`${this.baseUrl}/processed_executive_orders.json`),
          fetch(`${this.baseUrl}/search_index.json`)
        ]);
        
        if (!ordersResponse.ok || !searchIndexResponse.ok) {
          throw new Error('Failed to load data files');
        }
        
        this.ordersCache = await ordersResponse.json();
        this.searchIndexCache = await searchIndexResponse.json();
        
        console.log(`Loaded ${this.ordersCache.length} executive orders and search index`);
      } catch (error) {
        console.error('Error loading data:', error);
        throw error;
      }
    }
    
    return {
      orders: this.ordersCache,
      searchIndex: this.searchIndexCache
    };
  }
  
  // Extract key terms from document text
  extractKeyTerms(documentText) {
    // Implementation of key term extraction (simplified version)
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between', 'into', 'through'
      // Add more stop words as needed
    ]);
    
    // Clean and tokenize text
    const words = documentText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Count frequencies
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Extract phrases (bigrams)
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(`${words[i]} ${words[i+1]}`);
    }
    
    // Count phrase frequencies
    const phraseCount = {};
    phrases.forEach(phrase => {
      phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
    });
    
    // Combine and sort by frequency
    const terms = [];
    
    // Add words that appear more than once
    Object.entries(wordCount)
      .filter(([_, count]) => count > 1)
      .forEach(([word, count]) => terms.push({ term: word, score: count }));
    
    // Add phrases that appear more than once
    Object.entries(phraseCount)
      .filter(([_, count]) => count > 1)
      .forEach(([phrase, count]) => terms.push({ term: phrase, score: count * 1.5 }));
    
    // Return top terms
    return terms
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(item => item.term);
  }
  
  // Find relevant orders based on extracted terms
  findRelevantOrders(terms, maxResults = 5) {
    const { orders, searchIndex } = this;
    const relevantOrderIds = new Set();
    
    // Match terms against search index
    terms.forEach(term => {
      const normalizedTerm = term.toLowerCase();
      const matchingIds = searchIndex[normalizedTerm] || [];
      matchingIds.forEach(id => relevantOrderIds.add(id));
    });
    
    // Get full order details
    const relevantOrders = orders
      .filter(order => relevantOrderIds.has(order.id))
      .map(order => {
        // Calculate relevance score
        let relevanceScore = 1.0;
        
        // Count term matches
        const orderText = `${order.title} ${order.summary} ${order.full_text || ''}`.toLowerCase();
        const matchCount = terms.reduce((count, term) => {
          return count + (orderText.includes(term.toLowerCase()) ? 1 : 0);
        }, 0);
        
        // Boost score based on matches
        relevanceScore *= (1 + (matchCount * 0.2));
        
        // Boost based on impact level
        if (order.impact_level === 'Critical') relevanceScore *= 1.5;
        else if (order.impact_level === 'High') relevanceScore *= 1.3;
        
        return {
          ...order,
          relevance_score: parseFloat(relevanceScore.toFixed(2))
        };
      })
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);
    
    return relevantOrders;
  }
  
  // Main analyze method
  async analyzeDocument(documentText) {
    // Load data if not already cached
    await this.loadData();
    
    // Step 1: Extract key terms from document
    const extractedTerms = this.extractKeyTerms(documentText);
    console.log(`Extracted ${extractedTerms.length} key terms`);
    
    // Step 2: Find relevant executive orders
    const relevantOrders = this.findRelevantOrders(extractedTerms);
    console.log(`Found ${relevantOrders.length} relevant executive orders`);
    
    // Step 3: Format analysis result
    return {
      extracted_terms: extractedTerms,
      relevant_orders: relevantOrders,
      analysis_summary: {
        total_analyzed: this.ordersCache.length,
        matched_orders: relevantOrders.length,
        top_terms: extractedTerms.slice(0, 5),
        most_relevant_order: relevantOrders[0]?.title || "No relevant orders found"
      }
    };
  }
}

// Example usage
async function exampleAnalysis() {
  const client = new DocumentAnalysisClient();
  
  const documentText = `
    This research proposal outlines a collaboration between Yale University and international 
    partners to study climate change impacts on coastal ecosystems. The project will receive 
    funding from both federal grants and international sources, with data sharing protocols 
    established for cross-border collaboration. Researchers will have access to sensitive 
    environmental data requiring appropriate security measures.
  `;
  
  const result = await client.analyzeDocument(documentText);
  console.log('Analysis result:', JSON.stringify(result, null, 2));
}

exampleAnalysis().catch(console.error);
```

### Claude Terminal Client Implementation

When using Claude in a terminal environment, you can implement document analysis as follows:

```javascript
// Function to prepare document analysis for Claude
async function prepareDocumentAnalysisForClaude(documentText) {
  const client = new DocumentAnalysisClient();
  const analysis = await client.analyzeDocument(documentText);
  
  // Format data in a way that Claude can effectively use
  let claudeContext = `# DOCUMENT ANALYSIS CONTEXT\n\n`;
  
  // Add extracted terms
  claudeContext += `## EXTRACTED KEY TERMS\n\n`;
  claudeContext += analysis.extracted_terms.join(', ') + '\n\n';
  
  // Add relevant executive orders
  claudeContext += `## RELEVANT EXECUTIVE ORDERS\n\n`;
  
  analysis.relevant_orders.forEach((order, index) => {
    claudeContext += `### EXECUTIVE ORDER ${index + 1}: ${order.order_number}\n`;
    claudeContext += `Title: ${order.title}\n`;
    claudeContext += `Signing Date: ${order.signing_date}\n`;
    claudeContext += `President: ${order.president}\n`;
    claudeContext += `Impact Level: ${order.impact_level}\n`;
    claudeContext += `Relevance Score: ${order.relevance_score}\n\n`;
    claudeContext += `Summary: ${order.summary}\n\n`;
    
    if (order.core_impact) {
      claudeContext += `Core Impact: ${order.core_impact}\n\n`;
    }
    
    if (order.yale_imperative) {
      claudeContext += `Yale Imperative: ${order.yale_imperative}\n\n`;
    }
    
    claudeContext += `Categories: ${order.categories.join(', ')}\n`;
    claudeContext += `Impact Areas: ${order.impact_areas.join(', ')}\n\n`;
    
    // Add a separator between orders
    claudeContext += `${'-'.repeat(40)}\n\n`;
  });
  
  // Create an instruction for Claude
  const instruction = `
    I've analyzed a document against the Yale Executive Orders database.
    Below are the extracted key terms and relevant executive orders.
    
    Please:
    1. Analyze the document content against these executive orders
    2. Identify potential compliance issues or requirements
    3. Provide specific recommendations based on Yale's implementation guidance
    4. Format your response as a structured analysis report
    
    Document to analyze:
    
    ${documentText}
  `;
  
  return {
    instruction,
    context: claudeContext
  };
}
```

## Additional Resources

- For more information about the Yale Executive Orders project, see the main README.md
- For server-side MCP implementation details, see the MCP_SERVER_DOCUMENTATION.md
- For Model Context Protocol client guidance, see MODEL_CONTEXT_PROTOCOL_CLIENTS.md
- For document analysis workflow details, see docs/document_analysis_flow.md
- For technical details about the export process, examine the export_to_json.js script
- API updates and changes will be documented in the GitHub repository