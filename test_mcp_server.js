/**
 * Test script for the Yale Executive Orders MCP Server
 * 
 * This script tests the functionality of the MCP server against both 
 * the SQLite database and static JSON files from GitHub Pages.
 */

require('dotenv').config();
const axios = require('axios');

// Configuration
const MCP_SERVER_URL = 'http://localhost:3001';
const GITHUB_PAGES_URL = 'https://franzhartl.github.io/yale-executive-orders/data';

async function main() {
  console.log('=== Yale Executive Orders MCP Server Test ===');
  
  // Test Server Connection
  console.log('\nTest 1: Checking MCP Server connection...');
  await testServerConnection();
  
  // Test GitHub Pages Static Files
  console.log('\nTest 2: Checking GitHub Pages static files...');
  await testGitHubPagesAccess();
  
  // Test Server Search Endpoint
  console.log('\nTest 3: Testing MCP search endpoint...');
  await testServerSearch();
  
  // Test Server Context Endpoint
  console.log('\nTest 4: Testing MCP context endpoint...');
  await testServerContext();
}

async function testServerConnection() {
  try {
    const response = await axios.get(`${MCP_SERVER_URL}/mcp/info`);
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Successfully connected to MCP server!');
      console.log(`Server name: ${response.data.data.name}`);
      console.log(`Server version: ${response.data.data.version}`);
      console.log(`Capabilities: ${response.data.data.capabilities.length} endpoints available`);
    } else {
      console.log('⚠️ Connected to server but received unexpected response format.');
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('The server might not be running. Start it with: node mcp_server.js');
  }
}

async function testGitHubPagesAccess() {
  try {
    // Try to get processed executive orders first
    try {
      const response = await axios.get(`${GITHUB_PAGES_URL}/processed_executive_orders.json`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        console.log(`✅ Successfully accessed processed_executive_orders.json!`);
        console.log(`Found ${response.data.length} executive orders.`);
      }
    } catch (error) {
      // Fall back to executive_orders.json
      try {
        const response = await axios.get(`${GITHUB_PAGES_URL}/executive_orders.json`);
        
        if (response.status === 200 && Array.isArray(response.data)) {
          console.log(`✅ Successfully accessed executive_orders.json!`);
          console.log(`Found ${response.data.length} executive orders.`);
        }
      } catch (fallbackError) {
        console.error('❌ Failed to access any executive orders JSON file.');
        console.error('Error:', fallbackError.message);
      }
    }
    
    // Check for categories.json
    try {
      const response = await axios.get(`${GITHUB_PAGES_URL}/categories.json`);
      
      if (response.status === 200 && Array.isArray(response.data)) {
        console.log(`✅ Successfully accessed categories.json!`);
        console.log(`Found ${response.data.length} categories.`);
      }
    } catch (error) {
      console.warn('⚠️ Could not access categories.json:', error.message);
    }
    
  } catch (error) {
    console.error('❌ GitHub Pages access failed:', error.message);
    console.log('Check if your GitHub Pages site is published correctly.');
  }
}

async function testServerSearch() {
  try {
    const searchQuery = 'research funding';
    console.log(`Searching for: "${searchQuery}"...`);
    
    const response = await axios.post(`${MCP_SERVER_URL}/mcp/search`, {
      query: searchQuery,
      limit: 3
    });
    
    if (response.status === 200 && response.data.success) {
      const results = response.data.data.results;
      console.log(`✅ Search successful! Found ${results.length} results.`);
      
      if (results.length > 0) {
        console.log('\nSample result:');
        console.log(`- Title: ${results[0].title}`);
        console.log(`- Order Number: ${results[0].order_number}`);
        console.log(`- President: ${results[0].president}`);
        console.log(`- Impact Level: ${results[0].impact_level}`);
      }
    } else {
      console.log('⚠️ Search request succeeded but returned unexpected format.');
    }
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

async function testServerContext() {
  try {
    // First get an order ID from a search
    const searchResponse = await axios.post(`${MCP_SERVER_URL}/mcp/search`, {
      limit: 1
    }).catch(() => ({ data: { data: { results: [] } } }));
    
    const results = searchResponse.data?.data?.results || [];
    const contextId = results.length > 0 ? results[0].order_number : '14021'; // Fallback ID
    
    console.log(`Getting context for order number: ${contextId}...`);
    
    const response = await axios.post(`${MCP_SERVER_URL}/mcp/context`, {
      context_type: 'executive_order',
      context_id: contextId,
      detail_level: 'comprehensive'
    });
    
    if (response.status === 200 && response.data.success) {
      console.log(`✅ Context retrieval successful!`);
      console.log('\nOrder details:');
      console.log(`- Title: ${response.data.data.title}`);
      console.log(`- President: ${response.data.data.president}`);
      console.log(`- Impact Level: ${response.data.data.impact_level}`);
      
      // Check for rich content
      const hasRichContent = response.data.data.plain_language_summary || 
                             response.data.data.executive_brief ||
                             response.data.data.comprehensive_analysis;
      
      console.log(`- Rich content available: ${hasRichContent ? 'Yes' : 'No'}`);
    } else {
      console.log('⚠️ Context request succeeded but returned unexpected format.');
    }
  } catch (error) {
    console.error('❌ Context test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the tests
main().catch(error => {
  console.error('Test script failed with error:', error);
});