const { setupSourceTracking, fetchNIHPolicyNotices, processAndStoreSourceData } = require('./fetch_external_sources');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Test database connection in memory
const db = new sqlite3.Database(':memory:');

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

async function testIntegration() {
  console.log('Testing NIH data integration process...');
  
  // Force sample data
  process.env.USE_SAMPLE_DATA = 'true';
  
  try {
    // Create minimal DB structure for testing
    await dbRun(`
      CREATE TABLE IF NOT EXISTS executive_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE,
        title TEXT NOT NULL,
        summary TEXT,
        categories TEXT,
        status TEXT DEFAULT 'Active'
      )
    `);
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT
      )
    `);
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_categories (
        order_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (order_id, category_id)
      )
    `);
    
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
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_sources (
        order_id INTEGER,
        source_id INTEGER,
        external_reference_id TEXT,
        source_specific_data TEXT,
        fetch_date TEXT,
        PRIMARY KEY (order_id, source_id)
      )
    `);
    
    // Insert sample categories
    await dbRun('INSERT INTO categories (name, description) VALUES (?, ?)', 
      ['Healthcare', 'Related to healthcare and medical research']);
    
    await dbRun('INSERT INTO categories (name, description) VALUES (?, ?)', 
      ['Research & Science Policy', 'Related to research and science policy']);
    
    await dbRun('INSERT INTO categories (name, description) VALUES (?, ?)', 
      ['Technology', 'Related to technology and computing']);
    
    // Insert NIH source
    await dbRun(
      'INSERT INTO source_metadata (source_name, source_url, fetch_frequency, description) VALUES (?, ?, ?, ?)',
      [
        'NIH Policy Notices',
        'https://grants.nih.gov/policy/index.htm',
        'bi-weekly',
        'National Institutes of Health policy notices'
      ]
    );
    
    // Fetch NIH data
    console.log('Fetching NIH data...');
    const nihData = await fetchNIHPolicyNotices();
    
    // Get source ID
    const source = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['NIH Policy Notices']);
    
    // Process and store data
    console.log('Processing and storing NIH data...');
    await processAndStoreSourceData(nihData, source.id);
    
    // Query results
    console.log('Querying results...');
    const orders = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM executive_orders', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log(`Found ${orders.length} orders in database.`);
    
    // For the first order, show categories
    if (orders.length > 0) {
      const firstOrder = orders[0];
      console.log('First order:', firstOrder);
      
      // Get categories
      const categories = await new Promise((resolve, reject) => {
        db.all(
          'SELECT c.name FROM categories c JOIN order_categories oc ON c.id = oc.category_id WHERE oc.order_id = ?',
          [firstOrder.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      console.log('Categories:', categories.map(c => c.name).join(', '));
      
      // Get source data
      const sourceData = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM order_sources WHERE order_id = ?',
          [firstOrder.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (sourceData) {
        console.log('Source data available');
        try {
          const specificData = JSON.parse(sourceData.source_specific_data);
          console.log('Implementation references:', specificData.implementation_references.length);
        } catch (e) {
          console.error('Error parsing source data:', e);
        }
      }
    }
    
    console.log('Integration test completed successfully');
    
  } catch (err) {
    console.error('Error in integration test:', err);
  } finally {
    // Close the database
    db.close();
  }
}

testIntegration();
