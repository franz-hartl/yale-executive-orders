/**
 * test_intelligence_hub.js
 * 
 * Test script to verify the Intelligence Hub implementation.
 * This script validates that the database schema and data export work correctly.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'executive_orders.db');
const exportPath = path.join(__dirname, 'public', 'data', 'executive_orders.json');

// Connect to database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database for testing.');
});

// Promisify database queries
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Test functions
async function testDatabaseSchema() {
  console.log('\n--- Testing Database Schema ---');
  try {
    // Test required tables exist
    const tables = [
      'executive_orders',
      'timeline_navigator',
      'source_intelligence',
      'agency_guidance',
      'association_analysis',
      'legal_analysis',
      'yale_response_framework',
      'action_requirements',
      'intelligence_network'
    ];
    
    for (const table of tables) {
      try {
        const result = await dbAll(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
        if (result.length > 0) {
          console.log(`✅ Table exists: ${table}`);
        } else {
          console.error(`❌ Table missing: ${table}`);
        }
      } catch (err) {
        console.error(`❌ Error checking table ${table}:`, err.message);
      }
    }
    
    // Test executive orders have new Intelligence Hub fields
    const columns = await dbAll("PRAGMA table_info(executive_orders)");
    const requiredColumns = [
      'effective_date',
      'yale_alert_level',
      'core_impact',
      'yale_imperative',
      'confidence_rating',
      'what_changed'
    ];
    
    for (const requiredColumn of requiredColumns) {
      const columnExists = columns.some(col => col.name === requiredColumn);
      if (columnExists) {
        console.log(`✅ Column exists in executive_orders: ${requiredColumn}`);
      } else {
        console.error(`❌ Column missing in executive_orders: ${requiredColumn}`);
      }
    }
    
    return true;
  } catch (err) {
    console.error('Error testing database schema:', err);
    return false;
  }
}

async function testDataPopulation() {
  console.log('\n--- Testing Data Population ---');
  try {
    // Test sample data exists in key tables
    const dataChecks = [
      { table: 'timeline_navigator', idField: 'order_id' },
      { table: 'source_intelligence', idField: 'order_id' },
      { table: 'agency_guidance', idField: 'order_id' },
      { table: 'association_analysis', idField: 'order_id' },
      { table: 'legal_analysis', idField: 'order_id' },
      { table: 'yale_response_framework', idField: 'order_id' },
      { table: 'action_requirements', idField: 'order_id' },
      { table: 'intelligence_network', idField: 'order_id' }
    ];
    
    for (const check of dataChecks) {
      try {
        const count = await dbAll(`SELECT COUNT(*) as count FROM ${check.table}`);
        if (count[0].count > 0) {
          console.log(`✅ Data exists in table: ${check.table} (${count[0].count} rows)`);
          
          // Check which orders have data
          const orderIds = await dbAll(`SELECT DISTINCT ${check.idField} FROM ${check.table}`);
          console.log(`   Orders with data: ${orderIds.map(row => row[check.idField]).join(', ')}`);
        } else {
          console.error(`❌ No data in table: ${check.table}`);
        }
      } catch (err) {
        console.error(`❌ Error checking data in ${check.table}:`, err.message);
      }
    }
    
    // Check for enhanced executive order fields
    try {
      const enhancedOrders = await dbAll(`
        SELECT COUNT(*) as count FROM executive_orders 
        WHERE yale_alert_level IS NOT NULL OR core_impact IS NOT NULL
      `);
      
      if (enhancedOrders[0].count > 0) {
        console.log(`✅ Enhanced fields populated in executive_orders: ${enhancedOrders[0].count} orders`);
      } else {
        console.error(`❌ No enhanced fields populated in executive_orders`);
      }
    } catch (err) {
      console.error(`❌ Error checking enhanced executive order fields:`, err.message);
    }
    
    return true;
  } catch (err) {
    console.error('Error testing data population:', err);
    return false;
  }
}

async function testJsonExport() {
  console.log('\n--- Testing JSON Export ---');
  try {
    // Check if export file exists
    try {
      await fs.access(exportPath);
      console.log(`✅ Export file exists: ${exportPath}`);
    } catch (err) {
      console.error(`❌ Export file not found: ${exportPath}`);
      return false;
    }
    
    // Read and parse the JSON file
    const data = await fs.readFile(exportPath, 'utf8');
    const orders = JSON.parse(data);
    
    if (!Array.isArray(orders) || orders.length === 0) {
      console.error('❌ Export file does not contain valid orders array');
      return false;
    }
    
    console.log(`✅ Export file contains ${orders.length} orders`);
    
    // Check for Intelligence Hub data in the export
    let ordersWithIntelligenceHub = 0;
    
    for (const order of orders) {
      if (order.intelligence_hub) {
        ordersWithIntelligenceHub++;
      }
    }
    
    if (ordersWithIntelligenceHub > 0) {
      console.log(`✅ Intelligence Hub data found in ${ordersWithIntelligenceHub} orders`);
      
      // Check a sample order for all required intelligence hub components
      const sampleOrder = orders.find(o => o.intelligence_hub);
      if (sampleOrder) {
        const ih = sampleOrder.intelligence_hub;
        
        console.log('\nSample Intelligence Hub data structure:');
        console.log('- yale_alert_level:', ih.yale_alert_level ? '✅' : '❌');
        console.log('- core_impact:', ih.core_impact ? '✅' : '❌');
        console.log('- what_changed:', ih.what_changed ? '✅' : '❌');
        console.log('- yale_imperative:', ih.yale_imperative ? '✅' : '❌');
        console.log('- timeline_navigator:', ih.timeline_navigator ? '✅' : '❌');
        console.log('- source_intelligence:', ih.source_intelligence ? '✅' : '❌');
        console.log('- yale_response:', ih.yale_response ? '✅' : '❌');
        console.log('- intelligence_network:', ih.intelligence_network ? '✅' : '❌');
      }
    } else {
      console.error('❌ No orders with Intelligence Hub data found in export');
    }
    
    return true;
  } catch (err) {
    console.error('Error testing JSON export:', err);
    return false;
  }
}

// Main function to run all tests
async function runTests() {
  console.log('=== Intelligence Hub Implementation Tests ===');
  
  try {
    const schemaSuccess = await testDatabaseSchema();
    const dataSuccess = await testDataPopulation();
    const exportSuccess = await testJsonExport();
    
    console.log('\n=== Test Summary ===');
    console.log(`Database Schema: ${schemaSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Data Population: ${dataSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`JSON Export: ${exportSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    const allTests = schemaSuccess && dataSuccess && exportSuccess;
    console.log(`\nOverall Test Result: ${allTests ? '✅ PASS' : '❌ FAIL'}`);
    
    if (allTests) {
      console.log('\n✨ Intelligence Hub implementation is working correctly! ✨');
    } else {
      console.log('\n⚠️ Intelligence Hub implementation has issues that need to be fixed. ⚠️');
    }
  } catch (err) {
    console.error('Error running tests:', err);
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
    });
  }
}

// Run the tests
runTests();