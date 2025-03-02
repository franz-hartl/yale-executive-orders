/**
 * Model Context Protocol (MCP) Integration Example
 * for Yale Executive Orders Database
 * 
 * This script demonstrates how to integrate the Yale Executive Orders MCP server
 * with an LLM application, such as an AI assistant for university policy analysis.
 * 
 * The flow:
 * 1. User asks a question about executive orders
 * 2. We extract relevant search terms from the question
 * 3. We query the MCP server to find relevant executive orders
 * 4. We format the retrieved data as context for the LLM
 * 5. We send the user's question along with the context to the LLM
 * 6. We return the LLM's response to the user
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

// Configuration
const MCP_SERVER = 'http://localhost:3001';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // Make sure this is in your .env file

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is not set');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Main function to process a user query
 */
async function processUserQuery(userQuery) {
  try {
    console.log('\nProcessing your query...');
    
    // Step 1: Extract search terms from the user query
    const searchTerms = extractSearchTerms(userQuery);
    console.log(`Extracted search terms: ${searchTerms.join(', ')}`);
    
    // Step 2: Get relevant executive orders from MCP server
    const relevantOrders = await getRelevantExecutiveOrders(searchTerms);
    console.log(`Found ${relevantOrders.length} relevant executive orders`);
    
    if (relevantOrders.length === 0) {
      console.log('No relevant executive orders found. Try a different query.');
      return;
    }
    
    // Step 3: Format the executive orders as context for the LLM
    const formattedContext = formatOrdersAsContext(relevantOrders);
    
    // Step 4: Send the query and context to the LLM
    const llmResponse = await queryLLM(userQuery, formattedContext);
    
    // Step 5: Display the response
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
  // This is a simple implementation
  // In a production system, you might use NLP techniques or an LLM to extract relevant terms
  const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'by'];
  
  return userQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 2 && !stopWords.includes(word)) // Remove stop words and short words
    .slice(0, 5); // Take up to 5 terms
}

/**
 * Query the MCP server to get relevant executive orders
 */
async function getRelevantExecutiveOrders(searchTerms) {
  // If no search terms, return empty array
  if (!searchTerms || searchTerms.length === 0) {
    return [];
  }
  
  // Join the search terms with OR for a more flexible search
  const query = searchTerms.join(' ');
  
  try {
    const response = await axios.post(`${MCP_SERVER}/mcp/search`, {
      query,
      limit: 3, // Limit to 3 most relevant results to keep context size manageable
      offset: 0
    });
    
    if (response.data && response.data.success && response.data.data && response.data.data.results) {
      return response.data.data.results;
    }
    
    return [];
  } catch (error) {
    console.error('Error querying MCP server:', error.message);
    return [];
  }
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
      context += `University Impact Areas: ${order.university_impact_areas.join(', ')}\n`;
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
  console.log('=== Yale Executive Orders AI Assistant ===');
  console.log('Ask questions about executive orders and their impact on Yale University');
  console.log('Type "exit" to quit');
  
  askQuestion();
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