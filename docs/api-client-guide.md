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

## Additional Resources

- For more information about the Yale Executive Orders project, see the main README.md
- For server-side MCP implementation details, see the MCP_SERVER_DOCUMENTATION.md
- For technical details about the export process, examine the export_to_json.js script
- API updates and changes will be documented in the GitHub repository