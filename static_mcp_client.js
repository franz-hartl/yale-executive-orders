/**
 * Static MCP Client for Yale Executive Orders
 * 
 * This implementation uses the static JSON files hosted on GitHub Pages
 * instead of requiring the full application server.
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

// Configuration - GitHub Pages URL for Yale Executive Orders
const STATIC_DATA_URL = 'https://franzhartl.github.io/yale-executive-orders/data';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Cache for data from static files
const dataCache = {
  executiveOrders: null,
  categories: null,
  impactAreas: null,
  universityImpactAreas: null
};

/**
 * Load data from static JSON files
 */
async function loadData() {
  try {
    console.log('Loading data from static files...');
    console.log(`URL: ${STATIC_DATA_URL}`);
    
    // Try to load processed_executive_orders.json first (this is the enhanced version)
    if (!dataCache.executiveOrders) {
      console.log('Loading executive orders...');
      try {
        const response = await axios.get(`${STATIC_DATA_URL}/processed_executive_orders.json`);
        dataCache.executiveOrders = response.data;
        console.log(`Loaded ${dataCache.executiveOrders.length} executive orders from processed_executive_orders.json`);
      } catch (e) {
        // Fall back to executive_orders.json
        console.log('Falling back to executive_orders.json...');
        const response = await axios.get(`${STATIC_DATA_URL}/executive_orders.json`);
        dataCache.executiveOrders = response.data;
        console.log(`Loaded ${dataCache.executiveOrders.length} executive orders from executive_orders.json`);
      }
    }
    
    // Load categories
    if (!dataCache.categories) {
      console.log('Loading categories...');
      const response = await axios.get(`${STATIC_DATA_URL}/categories.json`);
      dataCache.categories = response.data;
      console.log(`Loaded ${dataCache.categories.length} categories`);
    }
    
    // Load impact areas
    if (!dataCache.impactAreas) {
      console.log('Loading impact areas...');
      const response = await axios.get(`${STATIC_DATA_URL}/impact_areas.json`);
      dataCache.impactAreas = response.data;
      console.log(`Loaded ${dataCache.impactAreas.length} impact areas`);
    }
    
    // Load university impact areas
    if (!dataCache.universityImpactAreas) {
      console.log('Loading university impact areas...');
      const response = await axios.get(`${STATIC_DATA_URL}/university_impact_areas.json`);
      dataCache.universityImpactAreas = response.data;
      console.log(`Loaded ${dataCache.universityImpactAreas.length} university impact areas`);
    }
    
    console.log('All data loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading data:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Make sure your GitHub Pages site is published and the data files are accessible at:');
      console.error(`${STATIC_DATA_URL}/executive_orders.json`);
    } else {
      console.error('Network error - make sure you have internet access and the URL is correct:');
      console.error(STATIC_DATA_URL);
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
    
    if (filters.signing_date_from && new Date(order.signing_date) < new Date(filters.signing_date_from)) {
      return false;
    }
    
    if (filters.signing_date_to && new Date(order.signing_date) > new Date(filters.signing_date_to)) {
      return false;
    }
    
    if (filters.category && (!order.categories || !order.categories.includes(filters.category))) {
      return false;
    }
    
    if (filters.impact_area && (!order.impact_areas || !order.impact_areas.includes(filters.impact_area))) {
      return false;
    }
    
    if (filters.university_impact_area) {
      const hasImpactArea = order.university_impact_areas && 
        order.university_impact_areas.some(area => 
          typeof area === 'string' 
            ? area === filters.university_impact_area
            : area.name === filters.university_impact_area
        );
      if (!hasImpactArea) return false;
    }
    
    return true;
  });
}

/**
 * Main function to process a user query
 */
async function processUserQuery(userQuery) {
  try {
    console.log('\nProcessing your query...');
    
    // Ensure data is loaded
    if (!dataCache.executiveOrders) {
      await loadData();
    }
    
    // Extract search terms from the user query
    const searchTerms = extractSearchTerms(userQuery);
    console.log(`Extracted search terms: ${searchTerms.join(', ')}`);
    
    // Get relevant executive orders
    const query = searchTerms.join(' ');
    const relevantOrders = searchExecutiveOrders(query);
    
    // Sort by most relevant and take top 3
    // Here we use a simple scoring mechanism based on term frequency
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
    
    console.log(`Found ${relevantOrders.length} relevant executive orders, showing top ${topOrders.length}`);
    
    if (topOrders.length === 0) {
      console.log('No relevant executive orders found. Try a different query.');
      return;
    }
    
    // Format the executive orders as context for the LLM
    const formattedContext = formatOrdersAsContext(topOrders);
    
    // Send the query and context to the LLM
    const llmResponse = await queryLLM(userQuery, formattedContext);
    
    // Display the response
    console.log('\n==== AI Assistant Response ====\n');
    console.log(llmResponse);
    console.log('\n================================\n');
    
  } catch (error) {
    console.error('Error processing query:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
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
    
    if (order.core_impact) {
      context += `Core Impact: ${order.core_impact}\n`;
    }
    
    if (order.yale_imperative) {
      context += `Yale Imperative: ${order.yale_imperative}\n`;
    }
    
    context += '\n';
  });
  
  return context;
}

/**
 * Query the LLM (Claude) with the user query and context
 */
async function queryLLM(userQuery, context) {
  try {
    // Construct the prompt for Claude
    const prompt = `
You are a university policy expert specializing in executive orders and their impact on higher education institutions.

${context}

Based on the executive orders information above, please answer the following question thoroughly:

${userQuery}

If the information provided does not contain an answer to the question, please say so and explain what additional information would be needed.
`;

    // Call the Anthropic API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    // Extract the assistant's response
    if (response.data && response.data.content && response.data.content.length > 0) {
      return response.data.content[0].text;
    } else {
      return 'Error: Unable to get a response from the LLM.';
    }
  } catch (error) {
    console.error('Error calling Anthropic API:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return 'Error: Unable to get a response from the LLM.';
  }
}

/**
 * Start the interactive CLI
 */
function startCLI() {
  console.log('=== Yale Executive Orders AI Assistant (Static Version) ===');
  console.log('This version uses static JSON files from GitHub Pages rather than a live server');
  console.log('Ask questions about executive orders and their impact on Yale University');
  console.log('Type "exit" to quit');
  
  // Preload data
  loadData().then((success) => {
    if (success) {
      askQuestion();
    } else {
      console.log('\n⚠️  Data loading failed. Please check your internet connection and URL configuration.');
      console.log('If you need to update the URL, edit the STATIC_DATA_URL variable in this file.');
      console.log('\nCurrently using: ' + STATIC_DATA_URL);
      
      rl.question('\nDo you want to try again? (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          startCLI();
        } else {
          console.log('Exiting...');
          rl.close();
        }
      });
    }
  });
}

function askQuestion() {
  rl.question('\nYour question: ', async (userQuery) => {
    if (userQuery.toLowerCase() === 'exit') {
      console.log('Goodbye!');
      rl.close();
      return;
    }
    
    await processUserQuery(userQuery);
    askQuestion(); // Continue the loop
  });
}

// Start the CLI
startCLI();