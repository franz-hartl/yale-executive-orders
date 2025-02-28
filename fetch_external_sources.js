/**
 * fetch_external_sources.js
 * 
 * This script integrates data from external authoritative sources into the executive orders database.
 * It fetches, parses, and normalizes data from organizations like COGR, NSF, NIH, and ACE.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
require('dotenv').config();

// Database connection
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

// Source tracking directory
const sourcesDir = path.join(__dirname, 'external_sources');

// Promisify database operations
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Setup database tables for external source tracking
async function setupSourceTracking() {
  try {
    // Create source_metadata table if it doesn't exist
    await dbRun(`
      CREATE TABLE IF NOT EXISTS source_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT NOT NULL,
        source_url TEXT,
        last_updated TEXT,
        fetch_frequency TEXT,
        description TEXT
      )
    `);
    
    // Create order_sources table to track which orders came from which sources
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_sources (
        order_id INTEGER,
        source_id INTEGER,
        external_reference_id TEXT,
        source_specific_data TEXT,
        fetch_date TEXT,
        PRIMARY KEY (order_id, source_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (source_id) REFERENCES source_metadata(id)
      )
    `);
    
    // Initialize source metadata if not already present
    const sourceCount = await dbGet('SELECT COUNT(*) as count FROM source_metadata');
    if (sourceCount.count === 0) {
      const sources = [
        {
          name: 'COGR Executive Order Tracker',
          url: 'https://www.cogr.edu/cogr-resources',
          frequency: 'monthly',
          description: 'The Council on Governmental Relations (COGR) maintains a tracker of executive orders relevant to research institutions. This source provides detailed analysis of EOs affecting higher education research.'
        },
        {
          name: 'NSF Implementation Pages',
          url: 'https://www.nsf.gov/news/policies_and_procedures/',
          frequency: 'bi-weekly',
          description: 'National Science Foundation pages detailing how executive orders are being implemented in grant procedures and requirements.'
        },
        {
          name: 'NIH Policy Notices',
          url: 'https://grants.nih.gov/policy/index.htm',
          frequency: 'bi-weekly',
          description: 'National Institutes of Health policy notices, which often contain information about how executive orders affect NIH grants and operations.'
        },
        {
          name: 'ACE Policy Briefs',
          url: 'https://www.acenet.edu/Policy-Advocacy/Pages/default.aspx',
          frequency: 'monthly',
          description: 'American Council on Education policy briefs and analysis of executive orders affecting higher education institutions.'
        }
      ];
      
      for (const source of sources) {
        await dbRun(
          'INSERT INTO source_metadata (source_name, source_url, fetch_frequency, description) VALUES (?, ?, ?, ?)',
          [source.name, source.url, source.frequency, source.description]
        );
      }
      
      console.log('Initialized source metadata');
    }
    
    // Create directory structure for source data
    await fs.mkdir(sourcesDir, { recursive: true });
    
    console.log('Source tracking setup complete');
  } catch (err) {
    console.error('Error setting up source tracking:', err);
    throw err;
  }
}

/**
 * COGR Executive Order Tracker fetcher
 * 
 * The COGR tracker typically appears as a PDF document on their resources page.
 * This function attempts to:
 * 1. Find the latest tracker PDF
 * 2. Extract executive order information from it
 */
async function fetchCOGRTracker() {
  try {
    console.log('Fetching COGR Executive Order Tracker...');
    
    // Get source ID
    const source = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['COGR Executive Order Tracker']);
    if (!source) {
      throw new Error('COGR source metadata not found');
    }
    
    // Create directory for COGR data if it doesn't exist
    const cogrDir = path.join(sourcesDir, 'cogr');
    await fs.mkdir(cogrDir, { recursive: true });
    
    // TODO: Actual implementation would need PDF parsing capabilities
    // For now, we will simulate the process with a note
    
    console.log('Note: Full implementation would require:');
    console.log('1. Scraping the COGR website to find the latest tracker PDF');
    console.log('2. Downloading the PDF');
    console.log('3. Using a PDF parsing library (like pdf-parse) to extract text');
    console.log('4. Parsing the extracted text to identify executive order data');
    console.log('5. Normalizing the data to match database schema');
    
    // Update the last_updated timestamp for this source
    await dbRun(
      'UPDATE source_metadata SET last_updated = ? WHERE id = ?',
      [new Date().toISOString(), source.id]
    );
    
    // Create a marker file to record this fetch attempt
    const fetchLog = {
      date: new Date().toISOString(),
      status: 'simulated',
      message: 'Simulated fetch of COGR tracker (actual implementation would require PDF parsing)'
    };
    
    await fs.writeFile(
      path.join(cogrDir, `fetch-${new Date().toISOString().split('T')[0]}.json`),
      JSON.stringify(fetchLog, null, 2)
    );
    
    console.log('COGR tracker fetch simulation complete');
    return [];
    
  } catch (err) {
    console.error('Error fetching COGR tracker:', err);
    return [];
  }
}

/**
 * NSF Implementation Pages fetcher
 * 
 * This function accesses NSF's website to find information about 
 * executive order implementation in grant processes.
 */
async function fetchNSFImplementation() {
  try {
    console.log('Fetching NSF Implementation information...');
    
    // Get source ID
    const source = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['NSF Implementation Pages']);
    if (!source) {
      throw new Error('NSF source metadata not found');
    }
    
    // Create directory for NSF data if it doesn't exist
    const nsfDir = path.join(sourcesDir, 'nsf');
    await fs.mkdir(nsfDir, { recursive: true });
    
    // In a full implementation, we would:
    // 1. Fetch the NSF policies page
    // 2. Parse the HTML to find links to executive order implementation pages
    // 3. Extract the relevant information
    
    console.log('Note: Full implementation would:');
    console.log('1. Use axios to fetch the NSF policies page');
    console.log('2. Use cheerio/JSDOM to parse the HTML and find EO implementation information');
    console.log('3. Extract and normalize the relevant data');
    
    // Update the last_updated timestamp for this source
    await dbRun(
      'UPDATE source_metadata SET last_updated = ? WHERE id = ?',
      [new Date().toISOString(), source.id]
    );
    
    // Create a marker file to record this fetch attempt
    const fetchLog = {
      date: new Date().toISOString(),
      status: 'simulated',
      message: 'Simulated fetch of NSF implementation pages'
    };
    
    await fs.writeFile(
      path.join(nsfDir, `fetch-${new Date().toISOString().split('T')[0]}.json`),
      JSON.stringify(fetchLog, null, 2)
    );
    
    console.log('NSF implementation fetch simulation complete');
    return [];
    
  } catch (err) {
    console.error('Error fetching NSF implementation info:', err);
    return [];
  }
}

/**
 * NIH Policy Notices fetcher
 * 
 * This function accesses NIH's policy notices to find information about
 * how executive orders are being implemented in NIH grant procedures.
 */
async function fetchNIHPolicyNotices() {
  try {
    console.log('Fetching NIH Policy Notices...');
    
    // Get source ID
    const source = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['NIH Policy Notices']);
    if (!source) {
      throw new Error('NIH source metadata not found');
    }
    
    // Create directory for NIH data if it doesn't exist
    const nihDir = path.join(sourcesDir, 'nih');
    await fs.mkdir(nihDir, { recursive: true });
    
    // In a full implementation, we would:
    // 1. Fetch the NIH grants policy page
    // 2. Extract notices related to executive orders
    // 3. Parse the content for relevant information
    
    console.log('Note: Full implementation would:');
    console.log('1. Fetch the NIH grants policy pages');
    console.log('2. Filter for notices mentioning executive orders or presidential actions');
    console.log('3. Extract and normalize the data');
    
    // Update the last_updated timestamp for this source
    await dbRun(
      'UPDATE source_metadata SET last_updated = ? WHERE id = ?',
      [new Date().toISOString(), source.id]
    );
    
    // Create a marker file to record this fetch attempt
    const fetchLog = {
      date: new Date().toISOString(),
      status: 'simulated',
      message: 'Simulated fetch of NIH policy notices'
    };
    
    await fs.writeFile(
      path.join(nihDir, `fetch-${new Date().toISOString().split('T')[0]}.json`),
      JSON.stringify(fetchLog, null, 2)
    );
    
    console.log('NIH policy notices fetch simulation complete');
    return [];
    
  } catch (err) {
    console.error('Error fetching NIH policy notices:', err);
    return [];
  }
}

/**
 * ACE Policy Briefs fetcher
 * 
 * This function fetches policy briefs from the American Council on Education
 * that contain analysis of executive orders affecting higher education.
 */
async function fetchACEPolicyBriefs() {
  try {
    console.log('Fetching ACE Policy Briefs...');
    
    // Get source ID
    const source = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['ACE Policy Briefs']);
    if (!source) {
      throw new Error('ACE source metadata not found');
    }
    
    // Create directory for ACE data if it doesn't exist
    const aceDir = path.join(sourcesDir, 'ace');
    await fs.mkdir(aceDir, { recursive: true });
    
    // In a full implementation, we would:
    // 1. Fetch the ACE policy advocacy page
    // 2. Extract briefs and statements related to executive orders
    // 3. Parse the content for relevant information
    
    console.log('Note: Full implementation would:');
    console.log('1. Fetch the ACE policy advocacy pages');
    console.log('2. Filter for briefs mentioning executive orders');
    console.log('3. Extract and normalize the data');
    
    // Update the last_updated timestamp for this source
    await dbRun(
      'UPDATE source_metadata SET last_updated = ? WHERE id = ?',
      [new Date().toISOString(), source.id]
    );
    
    // Create a marker file to record this fetch attempt
    const fetchLog = {
      date: new Date().toISOString(),
      status: 'simulated',
      message: 'Simulated fetch of ACE policy briefs'
    };
    
    await fs.writeFile(
      path.join(aceDir, `fetch-${new Date().toISOString().split('T')[0]}.json`),
      JSON.stringify(fetchLog, null, 2)
    );
    
    console.log('ACE policy briefs fetch simulation complete');
    return [];
    
  } catch (err) {
    console.error('Error fetching ACE policy briefs:', err);
    return [];
  }
}

/**
 * Process and store source-specific data in the database
 */
async function processAndStoreSourceData(orders, sourceId) {
  try {
    if (!orders || orders.length === 0) {
      console.log('No orders to process');
      return;
    }
    
    console.log(`Processing ${orders.length} orders from source ID ${sourceId}...`);
    
    // For each order, check if it already exists in the database
    for (const order of orders) {
      // Check if order exists by order_number
      let existingOrder = await dbGet('SELECT id FROM executive_orders WHERE order_number = ?', [order.order_number]);
      
      let orderId;
      if (existingOrder) {
        // Order exists, update it
        orderId = existingOrder.id;
        console.log(`Updating existing order ${order.order_number}`);
        
        // Update the order with new information
        await dbRun(
          `UPDATE executive_orders SET 
           title = COALESCE(?, title), 
           signing_date = COALESCE(?, signing_date), 
           president = COALESCE(?, president), 
           summary = COALESCE(?, summary), 
           url = COALESCE(?, url), 
           impact_level = COALESCE(?, impact_level),
           full_text = COALESCE(?, full_text),
           status = COALESCE(?, status)
           WHERE id = ?`,
          [
            order.title || null,
            order.signing_date || null,
            order.president || null,
            order.summary || null,
            order.url || null,
            order.impact_level || null,
            order.full_text || null,
            order.status || null,
            orderId
          ]
        );
      } else {
        // Order doesn't exist, insert it
        console.log(`Inserting new order ${order.order_number}`);
        
        const result = await dbRun(
          `INSERT INTO executive_orders (
             order_number, title, signing_date, president, summary, url, impact_level, full_text, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.order_number,
            order.title || null,
            order.signing_date || null,
            order.president || null,
            order.summary || null,
            order.url || null,
            order.impact_level || null,
            order.full_text || null,
            order.status || null
          ]
        );
        
        orderId = result.lastID;
      }
      
      // Update or insert the source reference
      const sourceRef = await dbGet(
        'SELECT * FROM order_sources WHERE order_id = ? AND source_id = ?',
        [orderId, sourceId]
      );
      
      if (sourceRef) {
        // Update existing source reference
        await dbRun(
          `UPDATE order_sources SET 
           external_reference_id = ?, 
           source_specific_data = ?, 
           fetch_date = ? 
           WHERE order_id = ? AND source_id = ?`,
          [
            order.external_reference_id || null,
            order.source_specific_data ? JSON.stringify(order.source_specific_data) : null,
            new Date().toISOString(),
            orderId,
            sourceId
          ]
        );
      } else {
        // Insert new source reference
        await dbRun(
          `INSERT INTO order_sources (
             order_id, source_id, external_reference_id, source_specific_data, fetch_date
           ) VALUES (?, ?, ?, ?, ?)`,
          [
            orderId,
            sourceId,
            order.external_reference_id || null,
            order.source_specific_data ? JSON.stringify(order.source_specific_data) : null,
            new Date().toISOString()
          ]
        );
      }
      
      // If order has categories, process them
      if (order.categories && Array.isArray(order.categories) && order.categories.length > 0) {
        for (const categoryName of order.categories) {
          // Get category ID
          const category = await dbGet('SELECT id FROM categories WHERE name = ?', [categoryName]);
          if (category) {
            // Check if this order-category relationship already exists
            const existingCat = await dbGet(
              'SELECT * FROM order_categories WHERE order_id = ? AND category_id = ?',
              [orderId, category.id]
            );
            
            if (!existingCat) {
              // Insert the new category association
              await dbRun(
                'INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)',
                [orderId, category.id]
              );
            }
          }
        }
      }
      
      // If order has university impact areas, process them
      if (order.university_impact_areas && Array.isArray(order.university_impact_areas) && order.university_impact_areas.length > 0) {
        for (const areaName of order.university_impact_areas) {
          // Get impact area ID
          const area = await dbGet('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
          if (area) {
            // Check if this order-area relationship already exists
            const existingArea = await dbGet(
              'SELECT * FROM order_university_impact_areas WHERE order_id = ? AND university_impact_area_id = ?',
              [orderId, area.id]
            );
            
            if (!existingArea) {
              // Insert the new impact area association
              await dbRun(
                'INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)',
                [orderId, area.id]
              );
            }
          }
        }
      }
    }
    
    console.log('Source data processing complete');
  } catch (err) {
    console.error('Error processing source data:', err);
    throw err;
  }
}

/**
 * Main function to run the external sources fetching process
 */
async function main() {
  try {
    console.log('Starting external sources fetch...');
    
    // Set up database tables for source tracking
    await setupSourceTracking();
    
    // Fetch data from each source
    const cogrOrders = await fetchCOGRTracker();
    const cogrSource = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['COGR Executive Order Tracker']);
    await processAndStoreSourceData(cogrOrders, cogrSource.id);
    
    const nsfOrders = await fetchNSFImplementation();
    const nsfSource = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['NSF Implementation Pages']);
    await processAndStoreSourceData(nsfOrders, nsfSource.id);
    
    const nihOrders = await fetchNIHPolicyNotices();
    const nihSource = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['NIH Policy Notices']);
    await processAndStoreSourceData(nihOrders, nihSource.id);
    
    const aceOrders = await fetchACEPolicyBriefs();
    const aceSource = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['ACE Policy Briefs']);
    await processAndStoreSourceData(aceOrders, aceSource.id);
    
    console.log('External sources fetch complete');
    
  } catch (err) {
    console.error('Error in external sources fetch:', err);
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
module.exports = {
  setupSourceTracking,
  fetchCOGRTracker,
  fetchNSFImplementation,
  fetchNIHPolicyNotices,
  fetchACEPolicyBriefs,
  processAndStoreSourceData
};