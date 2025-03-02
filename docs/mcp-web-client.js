/**
 * Yale Executive Orders MCP Web Client
 * 
 * This is a browser-compatible version of the static MCP client
 * that can be used directly from the GitHub Pages site.
 */

// Configuration - GitHub Pages data path
const STATIC_DATA_URL = './data';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-3-sonnet-20240229';

// Cache for data from static files
const dataCache = {
  executiveOrders: null,
  categories: null,
  impactAreas: null,
  universityImpactAreas: null
};

// Load API key from config
function getApiKey() {
  // Try getting from window global (set by config file)
  if (window.ANTHROPIC_API_KEY) {
    return window.ANTHROPIC_API_KEY;
  }
  
  // Or prompt the user
  const apiKey = prompt('Please enter your Anthropic API key:', '');
  if (apiKey) {
    // Store temporarily in session
    sessionStorage.setItem('ANTHROPIC_API_KEY', apiKey);
    return apiKey;
  }
  
  return null;
}

/**
 * Load data from static JSON files
 */
async function loadData() {
  try {
    console.log('Loading data from static files...');
    
    // Try to load processed_executive_orders.json first
    if (!dataCache.executiveOrders) {
      console.log('Loading executive orders...');
      try {
        const response = await fetch(`${STATIC_DATA_URL}/processed_executive_orders.json`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        dataCache.executiveOrders = await response.json();
        console.log(`Loaded ${dataCache.executiveOrders.length} executive orders from processed_executive_orders.json`);
      } catch (e) {
        // Fall back to executive_orders.json
        console.log('Falling back to executive_orders.json...');
        const response = await fetch(`${STATIC_DATA_URL}/executive_orders.json`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        dataCache.executiveOrders = await response.json();
        console.log(`Loaded ${dataCache.executiveOrders.length} executive orders from executive_orders.json`);
      }
    }
    
    // Load categories
    if (!dataCache.categories) {
      console.log('Loading categories...');
      const response = await fetch(`${STATIC_DATA_URL}/categories.json`);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      dataCache.categories = await response.json();
      console.log(`Loaded ${dataCache.categories.length} categories`);
    }
    
    // Load impact areas
    if (!dataCache.impactAreas) {
      console.log('Loading impact areas...');
      const response = await fetch(`${STATIC_DATA_URL}/impact_areas.json`);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      dataCache.impactAreas = await response.json();
      console.log(`Loaded ${dataCache.impactAreas.length} impact areas`);
    }
    
    // Load university impact areas
    if (!dataCache.universityImpactAreas) {
      console.log('Loading university impact areas...');
      const response = await fetch(`${STATIC_DATA_URL}/university_impact_areas.json`);
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
      dataCache.universityImpactAreas = await response.json();
      console.log(`Loaded ${dataCache.universityImpactAreas.length} university impact areas`);
    }
    
    console.log('All data loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading data:', error.message);
    
    // Additional debug information
    console.error('Current URL:', window.location.href);
    console.error('Data URL used:', STATIC_DATA_URL);
    
    // Try to list available URLs
    try {
      fetch('./').then(r => r.text()).then(html => {
        console.log('Directory listing attempt:', html.substring(0, 1000));
      }).catch(e => console.error('Could not list directory:', e));
    } catch (e) {
      console.error('Error checking directory:', e);
    }
    
    return false;
  }
}

/**
 * Search executive orders based on query and filters
 */
function searchExecutiveOrders(query, filters = {}) {
  if (!dataCache.executiveOrders) {
    console.error('Executive orders data not loaded');
    return [];
  }
  
  // Convert query to lowercase for case-insensitive search
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  
  return dataCache.executiveOrders.filter(order => {
    // Check search terms
    if (searchTerms.length > 0) {
      const searchableText = [
        order.title,
        order.summary,
        order.full_text,
      ].filter(Boolean).join(' ').toLowerCase();
      
      const matchesSearch = searchTerms.some(term => searchableText.includes(term));
      if (!matchesSearch) return false;
    }
    
    // Apply filters
    if (filters.president && order.president !== filters.president) {
      return false;
    }
    
    if (filters.impact_level && order.impact_level !== filters.impact_level) {
      return false;
    }
    
    return true;
  });
}

/**
 * Extract search terms from the user query
 */
function extractSearchTerms(userQuery) {
  const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'by'];
  
  return userQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 2 && !stopWords.includes(word)) // Remove stop words and short words
    .slice(0, 5); // Take up to 5 terms
}

/**
 * Format the executive orders as context for the LLM
 */
function formatOrdersAsContext(orders) {
  if (!orders || orders.length === 0) {
    return '';
  }
  
  let context = '### RELEVANT EXECUTIVE ORDERS ###\n\n';
  
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
    
    if (order.categories && order.categories.length > 0) {
      context += `Categories: ${order.categories.join(', ')}\n`;
    }
    
    if (order.impact_areas && order.impact_areas.length > 0) {
      context += `Impact Areas: ${order.impact_areas.join(', ')}\n`;
    }
    
    if (order.university_impact_areas && order.university_impact_areas.length > 0) {
      const uiaNames = order.university_impact_areas.map(area => 
        typeof area === 'string' ? area : area.name
      );
      context += `University Impact Areas: ${uiaNames.join(', ')}\n`;
    }
    
    if (order.yale_alert_level) {
      context += `Yale Alert Level: ${order.yale_alert_level}\n`;
    }
    
    context += '\n';
  });
  
  return context;
}

/**
 * Process a user query and get a response from Claude
 */
async function processUserQuery(userQuery) {
  try {
    // Extract search terms from the user query
    const searchTerms = extractSearchTerms(userQuery);
    console.log(`Extracted search terms: ${searchTerms.join(', ')}`);
    
    // Get relevant executive orders
    const query = searchTerms.join(' ');
    const relevantOrders = searchExecutiveOrders(query);
    
    // Sort by most relevant and take top 3
    const scoredOrders = relevantOrders.map(order => {
      const text = [order.title, order.summary, order.full_text].filter(Boolean).join(' ').toLowerCase();
      let score = 0;
      searchTerms.forEach(term => {
        const regex = new RegExp(term, 'gi');
        const matches = text.match(regex) || [];
        score += matches.length;
      });
      return { ...order, relevanceScore: score };
    });
    
    // Sort by score and take top 3
    const topOrders = scoredOrders
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);
    
    console.log(`Found ${relevantOrders.length} relevant executive orders, using top ${topOrders.length}`);
    
    if (topOrders.length === 0) {
      return {
        success: false,
        message: "No relevant executive orders found. Please try a different query."
      };
    }
    
    // Format the executive orders as context for the LLM
    const formattedContext = formatOrdersAsContext(topOrders);
    
    // Get API key
    const apiKey = sessionStorage.getItem('ANTHROPIC_API_KEY') || getApiKey();
    if (!apiKey) {
      return { 
        success: false, 
        message: "API key is required to query Claude. You can get an API key from <a href='https://console.anthropic.com/' target='_blank'>console.anthropic.com</a>. When you return to this page, you'll be prompted to enter your key."
      };
    }
    
    // Prepare prompt for Claude
    const prompt = `
You are a university policy expert specializing in executive orders and their impact on higher education institutions.

${formattedContext}

Based on the executive orders information above, please answer the following question thoroughly:

${userQuery}

If the information provided does not contain an answer to the question, please say so and explain what additional information would be needed.
`;

    // Call the Anthropic API
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    
    const responseData = await response.json();
    
    // Extract the assistant's response
    if (responseData && responseData.content && responseData.content.length > 0) {
      return {
        success: true,
        message: responseData.content[0].text,
        usedContext: formattedContext,
        searchTerms: searchTerms,
        ordersFound: topOrders.length
      };
    } else {
      return {
        success: false,
        message: 'Error: Unable to get a response from Claude.'
      };
    }
  } catch (error) {
    console.error('Error processing query:', error.message);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

// Initialize the MCP client when the page loads
document.addEventListener('DOMContentLoaded', () => {
  // Check if we have the necessary DOM elements
  const queryInput = document.getElementById('query-input');
  const submitButton = document.getElementById('submit-query');
  const resultContainer = document.getElementById('result-container');
  const loadingIndicator = document.getElementById('loading-indicator');
  
  if (!queryInput || !submitButton || !resultContainer) {
    console.error('Required DOM elements not found');
    return;
  }
  
  // Load data
  loadData().then(success => {
    if (success) {
      console.log('MCP client initialized successfully');
      // Enable the submit button
      submitButton.disabled = false;
      // Hide loading if exists
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    } else {
      resultContainer.innerHTML = `
        <div class="error-message">
          <h3>Error Loading Data</h3>
          <p>Unable to load executive orders data. This could be due to one of the following issues:</p>
          <ul>
            <li>The data files are not available at the expected location</li>
            <li>There's a network connectivity issue</li>
            <li>CORS restrictions prevent accessing the data</li>
          </ul>
          <p>Technical details:</p>
          <ul>
            <li>Looking for data at: ${STATIC_DATA_URL}</li>
            <li>Current page URL: ${window.location.href}</li>
          </ul>
          <p><button onclick="window.location.reload()">Reload Page</button></p>
        </div>
      `;
    }
  });
  
  // Handle form submission
  submitButton.addEventListener('click', async () => {
    const query = queryInput.value.trim();
    if (!query) {
      return;
    }
    
    // Show loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }
    
    // Clear previous results
    resultContainer.innerHTML = '<div class="loading">Processing your query...</div>';
    
    // Process the query
    const result = await processUserQuery(query);
    
    // Hide loading indicator
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // Display the result
    if (result.success) {
      resultContainer.innerHTML = `
        <div class="success-result">
          <div class="claude-response">
            <h3>Claude's Response:</h3>
            <div class="response-content">${result.message.replace(/\n/g, '<br>')}</div>
          </div>
          
          <div class="context-details" style="margin-top: 20px; font-size: 0.9em; color: #666;">
            <p>Found ${result.ordersFound} relevant executive orders using search terms: ${result.searchTerms.join(', ')}</p>
            <details>
              <summary>View Context Used</summary>
              <pre style="background-color: #f5f5f5; padding: 10px; overflow: auto; max-height: 300px;">${result.usedContext}</pre>
            </details>
          </div>
        </div>
      `;
    } else {
      resultContainer.innerHTML = `
        <div class="error-result">
          <h3>Error</h3>
          <p>${result.message}</p>
        </div>
      `;
    }
  });
  
  // Allow Enter key to submit
  queryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitButton.click();
    }
  });
});