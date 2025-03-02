/**
 * Setup Script for Static MCP Client
 * 
 * This script helps configure the Static MCP Client by:
 * 1. Creating a .env file with the Anthropic API key
 * 2. Testing connectivity to the GitHub Pages data files
 * 3. Providing instructions for using the client
 */

const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Default configuration
const STATIC_DATA_URL = 'https://franzhartl.github.io/yale-executive-orders/data';

async function main() {
  console.log('=== Yale Executive Orders Static MCP Client Setup ===\n');
  
  // Check for existing .env file
  let existingApiKey = '';
  try {
    const envContents = fs.readFileSync('.env', 'utf8');
    const match = envContents.match(/ANTHROPIC_API_KEY=([^\r\n]+)/);
    if (match && match[1]) {
      existingApiKey = match[1];
      console.log('Found existing Anthropic API key in .env file.');
    }
  } catch (error) {
    // No .env file exists yet
  }
  
  // Ask about API key storage method
  console.log('\nAPI Key Storage Options:');
  console.log('1. Store locally in .env file (for development)');
  console.log('2. Use GitHub Secrets (for production/deployment)');
  console.log('3. Skip for now\n');
  
  rl.question('How would you like to set up your API key? (1/2/3): ', (option) => {
    switch(option) {
      case '1':
        // Local .env file method
        const apiKeyPrompt = existingApiKey 
          ? `Enter Anthropic API key (press Enter to keep existing key): ` 
          : `Enter your Anthropic API key: `;
        
        rl.question(apiKeyPrompt, async (apiKey) => {
          // Use existing key if no input provided
          const finalApiKey = apiKey.trim() || existingApiKey;
          
          if (!finalApiKey) {
            console.log('\n⚠️  No API key provided. The MCP client will not work without an API key.');
            console.log('You can get an API key from https://console.anthropic.com/\n');
            askToContinue();
            return;
          }
          
          // Save to .env file
          const envContent = `ANTHROPIC_API_KEY=${finalApiKey}\n`;
          fs.writeFileSync('.env', envContent);
          console.log('.env file created with API key.');
          
          // Test connection to data files
          await testDataConnection();
        });
        break;
        
      case '2':
        // GitHub Secrets method - provide instructions
        console.log('\n=== Setting up GitHub Secrets ===');
        console.log('To use GitHub Secrets for your Anthropic API key:');
        console.log('1. Go to your GitHub repository');
        console.log('2. Click on "Settings" > "Secrets and variables" > "Actions"');
        console.log('3. Click "New repository secret"');
        console.log('4. Name: ANTHROPIC_API_KEY');
        console.log('5. Value: [Your Anthropic API key]');
        console.log('6. Click "Add secret"');
        console.log('\nTo use this secret in your GitHub Pages workflow:');
        console.log('- Create or update your .github/workflows/deploy.yml file');
        console.log('- Add the secret as an environment variable');
        console.log('- Example workflow available at: https://github.com/username/repo/blob/main/.github/workflows/deploy-example.yml');
        
        rl.question('\nPress Enter to continue...', async () => {
          await testDataConnection();
        });
        break;
        
      case '3':
        console.log('\nSkipping API key setup.');
        testDataConnection();
        break;
        
      default:
        console.log('\nInvalid option. Please select 1, 2, or 3.');
        main();
        break;
    }
  });
}

function askToContinue() {
  rl.question('Do you want to continue setup without an API key? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      testDataConnection();
    } else {
      console.log('Setup aborted. Please run this script again with an API key.');
      rl.close();
    }
  });
}

async function testDataConnection() {
  console.log('\nTesting connection to GitHub Pages data files...');
  
  try {
    // Test connection to executive_orders.json
    console.log(`Checking ${STATIC_DATA_URL}/executive_orders.json...`);
    const response = await axios.get(`${STATIC_DATA_URL}/executive_orders.json`);
    
    if (response.status === 200 && Array.isArray(response.data)) {
      console.log(`✅ Successfully connected! Found ${response.data.length} executive orders.`);
      displaySuccessInstructions();
    } else {
      console.log('⚠️  Connected, but received unexpected data format.');
      askForUrlUpdate();
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    askForUrlUpdate();
  }
}

function askForUrlUpdate() {
  console.log('\nThe client might not be able to access the data files at:');
  console.log(STATIC_DATA_URL);
  
  rl.question('\nDo you want to update the GitHub Pages URL? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      rl.question('\nEnter the correct GitHub Pages URL: ', (newUrl) => {
        if (newUrl.trim()) {
          // Update the URL in the static_mcp_client.js file
          try {
            let clientContent = fs.readFileSync('static_mcp_client.js', 'utf8');
            clientContent = clientContent.replace(
              /const STATIC_DATA_URL = ['"](.*)['"]/,
              `const STATIC_DATA_URL = '${newUrl.trim()}'`
            );
            fs.writeFileSync('static_mcp_client.js', clientContent);
            console.log(`\n✅ Updated URL in static_mcp_client.js to: ${newUrl.trim()}`);
            displaySuccessInstructions();
          } catch (error) {
            console.error('Error updating file:', error.message);
            displaySuccessInstructions();
          }
        } else {
          console.log('No URL provided. Keeping the default URL.');
          displaySuccessInstructions();
        }
      });
    } else {
      displaySuccessInstructions();
    }
  });
}

function displaySuccessInstructions() {
  console.log('\n=== Setup Complete! ===');
  console.log('\nTo start the static MCP client, run:');
  console.log('npm run mcp:static');
  console.log('\nYou can then ask questions about executive orders and their impact on Yale University.');
  console.log('The client will retrieve relevant orders from the GitHub Pages site and use Claude');
  console.log('to generate informative responses.');
  console.log('\nEnjoy using the Yale Executive Orders MCP Client!');
  rl.close();
}

// Start the setup process
main();