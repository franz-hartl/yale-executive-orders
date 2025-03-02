/**
 * Test Client for Yale Executive Orders MCP Server
 * 
 * This script provides a command-line interface to test the MCP server functionality
 * and demonstrates how to interact with the server from client applications.
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const MCP_SERVER = 'http://localhost:3001';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper to print JSON responses in a formatted way
function printResponse(response) {
  console.log('\nResponse:');
  console.log(JSON.stringify(response.data, null, 2));
}

// Main menu
async function showMainMenu() {
  console.log('\n========== Yale Executive Orders MCP Client ==========');
  console.log('1. Get MCP Server Info');
  console.log('2. Search Executive Orders');
  console.log('3. Get Executive Order by ID');
  console.log('4. Get Category Info');
  console.log('5. Get Impact Area Info');
  console.log('6. List All Categories');
  console.log('7. List All Impact Areas');
  console.log('8. List All University Impact Areas');
  console.log('9. Get System Statistics');
  console.log('0. Exit');
  
  rl.question('\nSelect an option: ', async (option) => {
    try {
      switch (option) {
        case '1':
          await getMcpInfo();
          break;
        case '2':
          await searchExecutiveOrders();
          break;
        case '3':
          await getExecutiveOrderById();
          break;
        case '4':
          await getCategoryInfo();
          break;
        case '5':
          await getImpactAreaInfo();
          break;
        case '6':
          await listCategories();
          break;
        case '7':
          await listImpactAreas();
          break;
        case '8':
          await listUniversityImpactAreas();
          break;
        case '9':
          await getSystemStats();
          break;
        case '0':
          console.log('Exiting...');
          rl.close();
          return;
        default:
          console.log('Invalid option');
      }
    } catch (error) {
      console.error('Error:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
    }
    
    // Return to main menu
    setTimeout(showMainMenu, 1000);
  });
}

// 1. Get MCP Server Info
async function getMcpInfo() {
  const response = await axios.get(`${MCP_SERVER}/mcp/info`);
  printResponse(response);
}

// 2. Search Executive Orders
async function searchExecutiveOrders() {
  console.log('\n--- Search Executive Orders ---');
  rl.question('Enter search query (or leave blank for all): ', async (query) => {
    rl.question('President (optional): ', async (president) => {
      rl.question('Impact level (optional): ', async (impactLevel) => {
        const filters = {};
        if (president) filters.president = president;
        if (impactLevel) filters.impact_level = impactLevel;
        
        const response = await axios.post(`${MCP_SERVER}/mcp/search`, {
          query: query || '',
          filters,
          limit: 10,
          offset: 0
        });
        
        printResponse(response);
      });
    });
  });
}

// 3. Get Executive Order by ID
async function getExecutiveOrderById() {
  console.log('\n--- Get Executive Order by ID ---');
  rl.question('Enter order ID or order number: ', async (id) => {
    rl.question('Detail level (basic, standard, comprehensive): ', async (detailLevel) => {
      const level = detailLevel || 'standard';
      
      const response = await axios.post(`${MCP_SERVER}/mcp/context`, {
        context_type: 'executive_order',
        context_id: id,
        detail_level: level
      });
      
      printResponse(response);
    });
  });
}

// 4. Get Category Info
async function getCategoryInfo() {
  console.log('\n--- Get Category Info ---');
  rl.question('Enter category name or ID: ', async (category) => {
    const response = await axios.post(`${MCP_SERVER}/mcp/context`, {
      context_type: 'category',
      context_id: category
    });
    
    printResponse(response);
  });
}

// 5. Get Impact Area Info
async function getImpactAreaInfo() {
  console.log('\n--- Get Impact Area Info ---');
  rl.question('Enter impact area name or ID: ', async (impactArea) => {
    const response = await axios.post(`${MCP_SERVER}/mcp/context`, {
      context_type: 'impact_area',
      context_id: impactArea
    });
    
    printResponse(response);
  });
}

// 6. List All Categories
async function listCategories() {
  const response = await axios.get(`${MCP_SERVER}/api/categories`);
  printResponse(response);
}

// 7. List All Impact Areas
async function listImpactAreas() {
  const response = await axios.get(`${MCP_SERVER}/api/impact-areas`);
  printResponse(response);
}

// 8. List All University Impact Areas
async function listUniversityImpactAreas() {
  const response = await axios.get(`${MCP_SERVER}/api/university-impact-areas`);
  printResponse(response);
}

// 9. Get System Statistics
async function getSystemStats() {
  const response = await axios.get(`${MCP_SERVER}/api/statistics`);
  printResponse(response);
}

// Start the client
console.log('Starting Yale Executive Orders MCP Client...');
console.log(`Connecting to MCP server at ${MCP_SERVER}`);

showMainMenu();