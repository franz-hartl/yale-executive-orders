/**
 * test_nsf_fetch.js
 * 
 * Test script to validate the NSF fetcher functionality
 */

const { fetchNSFImplementation, setupSourceTracking, processAndStoreSourceData } = require('./fetch_external_sources');

async function main() {
  try {
    console.log('Setting up source tracking...');
    await setupSourceTracking();
    
    console.log('Testing NSF fetcher...');
    const nsfData = await fetchNSFImplementation();
    
    if (nsfData && nsfData.length > 0) {
      console.log(`NSF fetcher returned ${nsfData.length} items`);
      
      // Get source ID for NSF
      const sqlite3 = require('sqlite3').verbose();
      const path = require('path');
      const dbPath = path.join(__dirname, 'executive_orders.db');
      const db = new sqlite3.Database(dbPath);
      
      const getSourceId = () => {
        return new Promise((resolve, reject) => {
          db.get('SELECT id FROM source_metadata WHERE source_name = ?', ['NSF Implementation Pages'], (err, row) => {
            if (err) reject(err);
            else resolve(row ? row.id : null);
          });
        });
      };
      
      const sourceId = await getSourceId();
      if (sourceId) {
        console.log(`Processing NSF data with source ID ${sourceId}...`);
        await processAndStoreSourceData(nsfData, sourceId);
      } else {
        console.error('Could not find NSF source ID');
      }
      
      db.close();
    } else {
      console.log('NSF fetcher returned no data');
    }
    
    console.log('Test completed successfully');
  } catch (err) {
    console.error('Test failed:', err);
  }
}

// Run the test
// Set test environment to use sample data
process.env.NODE_ENV = 'test';
main();