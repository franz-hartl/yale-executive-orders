/**
 * Yale Executive Orders MCP Web Client
 * 
 * This is a browser-compatible version of the static MCP client
 * that can be used directly from the GitHub Pages site.
 */

// Configuration - GitHub Pages data path
// Try different paths to accommodate various GitHub Pages setups
function getDataUrl() {
  // First, try to determine base URL from the script's location
  const scripts = document.getElementsByTagName('script');
  const currentScript = scripts[scripts.length - 1];
  const scriptPath = currentScript.src;
  const baseUrl = scriptPath.substring(0, scriptPath.lastIndexOf('/'));
  
  console.log('Script detected at:', scriptPath);
  console.log('Base URL detected as:', baseUrl);
  
  // Return a function that will try multiple paths in order
  return async function(filename) {
    const paths = [
      './data/' + filename,                          // Relative to current page
      '../data/' + filename,                         // One directory up
      baseUrl + '/data/' + filename,                 // Relative to script location
      '/yale-executive-orders/data/' + filename,     // Repository root
      '/data/' + filename                            // Site root
    ];
    
    // Try each path in order
    for (const path of paths) {
      try {
        console.log('Trying path:', path);
        const response = await fetch(path, { method: 'HEAD' });
        if (response.ok) {
          console.log('Successful path found:', path);
          // Return the base path that worked
          return path.substring(0, path.lastIndexOf('/') + 1);
        }
      } catch (e) {
        console.warn('Path failed:', path, e);
      }
    }
    
    // Default fallback
    console.warn('All paths failed, defaulting to ./data/');
    return './data/';
  };
}

// We'll determine the actual data URL when loading data
const getDataUrlPath = getDataUrl();
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
    console.log('Current page URL:', window.location.href);
    
    // First determine the working data URL by probing for executive_orders.json
    const dataUrl = await getDataUrlPath('executive_orders.json');
    console.log('Resolved data URL path:', dataUrl);
    
    // Try to load processed_executive_orders.json first
    if (!dataCache.executiveOrders) {
      console.log('Loading executive orders...');
      try {
        const response = await fetch(`${dataUrl}processed_executive_orders.json`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        dataCache.executiveOrders = await response.json();
        console.log(`Loaded ${dataCache.executiveOrders.length} executive orders from processed_executive_orders.json`);
      } catch (e) {
        console.log('Falling back to executive_orders.json...');
        try {
          const response = await fetch(`${dataUrl}executive_orders.json`);
          if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
          dataCache.executiveOrders = await response.json();
          console.log(`Loaded ${dataCache.executiveOrders.length} executive orders from executive_orders.json`);
        } catch (innerError) {
          console.error('Error loading executive orders:', innerError);
          throw new Error('Failed to load executive orders data from any source');
        }
      }
    }
    
    // Load categories
    if (!dataCache.categories) {
      console.log('Loading categories...');
      try {
        const response = await fetch(`${dataUrl}categories.json`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        dataCache.categories = await response.json();
        console.log(`Loaded ${dataCache.categories.length} categories`);
      } catch (e) {
        console.warn('Could not load categories:', e);
        // Continue without categories
        dataCache.categories = [];
      }
    }
    
    // Load impact areas
    if (!dataCache.impactAreas) {
      console.log('Loading impact areas...');
      try {
        const response = await fetch(`${dataUrl}impact_areas.json`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        dataCache.impactAreas = await response.json();
        console.log(`Loaded ${dataCache.impactAreas.length} impact areas`);
      } catch (e) {
        console.warn('Could not load impact areas:', e);
        // Continue without impact areas
        dataCache.impactAreas = [];
      }
    }
    
    // Load university impact areas
    if (!dataCache.universityImpactAreas) {
      console.log('Loading university impact areas...');
      try {
        const response = await fetch(`${dataUrl}university_impact_areas.json`);
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        dataCache.universityImpactAreas = await response.json();
        console.log(`Loaded ${dataCache.universityImpactAreas.length} university impact areas`);
      } catch (e) {
        console.warn('Could not load university impact areas:', e);
        // Continue without university impact areas
        dataCache.universityImpactAreas = [];
      }
    }
    
    console.log('All data loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading data:', error.message);
    
    // Additional debug information
    console.error('Current URL:', window.location.href);
    console.error('Browser information:', navigator.userAgent);
    
    // Try direct fetch of known files to test accessibility
    try {
      const urls = [
        './data/executive_orders.json',
        '/yale-executive-orders/data/executive_orders.json',
        '../data/executive_orders.json'
      ];
      
      for (const url of urls) {
        try {
          console.log(`Testing direct access to ${url}...`);
          const response = await fetch(url, { method: 'HEAD' });
          console.log(`Result for ${url}: ${response.status} ${response.statusText}`);
        } catch (e) {
          console.error(`Error accessing ${url}:`, e.message);
        }
      }
    } catch (e) {
      console.error('Error during path testing:', e);
    }
    
    return false;
  }
}

/**
 * Load sample data as a fallback
 */
async function loadSampleData() {
  try {
    console.log('Attempting to load sample data as fallback...');
    
    // Hard-coded sample data (3 executive orders)
    dataCache.executiveOrders = [
      {
        "id": 1221,
        "order_number": "2025-03133",
        "title": "Commencing the Reduction of the Federal Bureaucracy",
        "signing_date": "2025-02-25",
        "president": "Trump",
        "summary": "This executive order aims to reduce the size of the federal bureaucracy by requiring agencies to identify unnecessary positions and functions, and to develop plans to streamline their operations. It also calls for a freeze on new hiring, with exceptions made only for roles deemed essential.",
        "full_text": "For universities like Yale, this order could lead to a reduction in federal funding and research grants, as well as the potential loss of key personnel who work in administrative and support roles. This could have a significant impact on university finances, requiring budget cuts and adjustments to maintain operations.",
        "impact_level": "High",
        "status": "Active",
        "implementation_phase": "Implementation",
        "categories": ["Technology"],
        "impact_areas": ["Policy", "Operational"],
        "university_impact_areas": [
          {
            "name": "Administrative Compliance",
            "description": "Compliance requirements, reporting mandates, and regulatory changes affecting university administration"
          }
        ],
        "yale_alert_level": "Low",
        "core_impact": "This executive order directly impacts Yale's research operations by requiring enhanced compliance measures."
      },
      {
        "id": 1222,
        "order_number": "2025-03134",
        "title": "Ensuring American Leadership in Artificial Intelligence",
        "signing_date": "2025-03-01",
        "president": "Trump",
        "summary": "This executive order establishes a national strategy for advancing artificial intelligence (AI) research, development, and deployment in the United States. It directs federal agencies to prioritize AI investments, reduce barriers to AI innovation, and develop guidance for AI regulation that protects American values and promotes trustworthy AI systems.",
        "full_text": "For universities, this order creates significant opportunities for research funding in AI fields while also introducing new compliance requirements for AI systems developed with federal funds. Yale and other research institutions will need to balance accelerated innovation with responsible AI development practices.",
        "impact_level": "High",
        "status": "Active",
        "implementation_phase": "Planning",
        "categories": ["Technology", "Research", "Education"],
        "impact_areas": ["Funding", "Policy", "Compliance"],
        "university_impact_areas": [
          {
            "name": "Research Funding",
            "description": "Impact on availability and requirements of research funding"
          },
          {
            "name": "Technology Transfer",
            "description": "Regulations and opportunities for commercializing university research"
          }
        ],
        "yale_alert_level": "Medium",
        "core_impact": "Creates significant opportunities for Yale's AI research initiatives while introducing new ethical guidelines and compliance requirements."
      },
      {
        "id": 1255,
        "order_number": "2025-05123",
        "title": "Promoting Excellence in Higher Education Research",
        "signing_date": "2025-04-15",
        "president": "Trump",
        "summary": "This executive order aims to enhance the quality and impact of federally-funded research at American universities. It establishes new accountability measures for research outcomes, promotes collaboration with industry partners, and creates incentives for universities to focus on areas of strategic national importance.",
        "full_text": "The order requires universities receiving federal research funding to implement enhanced reporting on research outcomes, including metrics for technology transfer, commercial applications, and economic impact. It also directs funding agencies to prioritize grants that align with national priorities in areas like quantum computing, advanced manufacturing, and biotechnology.",
        "impact_level": "Critical",
        "status": "Active",
        "implementation_phase": "Planning",
        "categories": ["Education", "Research", "Innovation"],
        "impact_areas": ["Funding", "Policy", "Compliance", "Partnerships"],
        "university_impact_areas": [
          {
            "name": "Research Funding",
            "description": "Impact on availability and requirements of research funding"
          },
          {
            "name": "Research Administration",
            "description": "Changes to management and oversight of research activities"
          },
          {
            "name": "Technology Transfer",
            "description": "Regulations and opportunities for commercializing university research"
          }
        ],
        "yale_alert_level": "High",
        "core_impact": "Fundamentally changes how Yale must prioritize, administer, and report on federally-funded research projects."
      }
    ];

    // Sample categories and impact areas
    dataCache.categories = [
      { "id": 1, "name": "Technology", "description": "Technology-related policies and regulations" },
      { "id": 2, "name": "Research", "description": "Research funding, oversight, and regulations" },
      { "id": 3, "name": "Education", "description": "Higher education policies and regulations" },
      { "id": 4, "name": "Innovation", "description": "Innovation promotion and technology transfer" }
    ];

    dataCache.impactAreas = [
      { "id": 1, "name": "Funding", "description": "Impacts on funding sources and requirements" },
      { "id": 2, "name": "Policy", "description": "Policy changes and regulatory requirements" },
      { "id": 3, "name": "Operational", "description": "Impacts on university operations" },
      { "id": 4, "name": "Compliance", "description": "New compliance requirements" },
      { "id": 5, "name": "Partnerships", "description": "Impacts on external partnerships and collaborations" }
    ];

    dataCache.universityImpactAreas = [
      { "id": 1, "name": "Research Funding", "description": "Impact on availability and requirements of research funding" },
      { "id": 2, "name": "Administrative Compliance", "description": "Compliance requirements, reporting mandates, and regulatory changes affecting university administration" },
      { "id": 3, "name": "Technology Transfer", "description": "Regulations and opportunities for commercializing university research" },
      { "id": 4, "name": "Research Administration", "description": "Changes to management and oversight of research activities" }
    ];
    
    console.log('Loaded sample data successfully');
    return true;
  } catch (error) {
    console.error('Error loading sample data:', error);
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
      // Try to fetch a sample file directly as a last resort
      loadSampleData().then(hasSampleData => {
        if (hasSampleData) {
          // We loaded sample data, enable the client
          submitButton.disabled = false;
          resultContainer.innerHTML = `
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
              <h3 style="color: #856404;">Using Sample Data</h3>
              <p>We couldn't load the full dataset, but we've loaded some sample data so you can try the client.</p>
              <p>Only a subset of executive orders is available in this mode.</p>
            </div>
            <div class="loading">
              <p>Ready to process your queries (sample mode).</p>
            </div>
          `;
        } else {
          // Complete failure, show detailed error
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
                <li>Current page URL: ${window.location.href}</li>
                <li>Browser: ${navigator.userAgent}</li>
              </ul>
              <p>
                <button onclick="window.location.reload()">Reload Page</button>
                <button onclick="window.location.href = '/yale-executive-orders/'">Go to Homepage</button>
              </p>
            </div>
          `;
        }
      });
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