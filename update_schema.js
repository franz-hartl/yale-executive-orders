/**
 * update_schema.js
 * 
 * Script to add missing columns to the executive_orders table.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'executive_orders.db');

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Promisify database operations
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Main function
async function updateSchema() {
  try {
    console.log('Updating database schema...');
    
    // Add missing columns to executive_orders table
    const columnsToAdd = [
      { name: 'effective_date', type: 'TEXT' },
      { name: 'yale_alert_level', type: 'TEXT' },
      { name: 'core_impact', type: 'TEXT' },
      { name: 'yale_imperative', type: 'TEXT' },
      { name: 'confidence_rating', type: 'REAL DEFAULT 0.85' },
      { name: 'what_changed', type: 'TEXT' }
    ];
    
    for (const column of columnsToAdd) {
      try {
        await dbRun(`ALTER TABLE executive_orders ADD COLUMN ${column.name} ${column.type}`);
        console.log(`✅ Added column: ${column.name}`);
      } catch (err) {
        // Column might already exist
        console.log(`Column ${column.name} already exists or could not be added: ${err.message}`);
      }
    }
    
    console.log('Schema update completed');
  } catch (err) {
    console.error('Error updating schema:', err);
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

// Run the update
updateSchema();