/**
 * test_cogr_fetch.js
 * 
 * Test script to validate the COGR fetcher functionality
 */

const { fetchCOGRTracker, setupSourceTracking } = require('./fetch_external_sources');

async function main() {
  try {
    console.log('Setting up source tracking...');
    await setupSourceTracking();
    
    console.log('Testing COGR fetcher...');
    await fetchCOGRTracker();
    
    console.log('Test completed successfully');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

// Run the test
main();