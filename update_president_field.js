/**
 * update_president_field.js
 * 
 * This script updates the "president" field in the database to correctly set 
 * orders after January 20, 2025 to President Trump.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database connection
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

// Function to update president field in database
async function updatePresidentField() {
  return new Promise((resolve, reject) => {
    console.log("Updating president field for executive orders after January 20, 2025...");
    
    // Update executive_orders table
    const sql = `
      UPDATE executive_orders 
      SET president = 'Trump' 
      WHERE (signing_date >= '2025-01-20' OR publication_date >= '2025-01-20')
      AND (president IS NULL OR president = 'Unknown')
    `;
    
    db.run(sql, function(err) {
      if (err) {
        console.error("Error updating president field:", err.message);
        reject(err);
        return;
      }
      
      console.log(`Updated ${this.changes} executive orders to set president to 'Trump'`);
      resolve(this.changes);
    });
  });
}

// Function to update JSON files
async function updateJsonFiles() {
  try {
    // Update executive_orders.json
    if (fs.existsSync('executive_orders.json')) {
      console.log("Updating executive_orders.json...");
      const data = JSON.parse(fs.readFileSync('executive_orders.json', 'utf8'));
      
      let updatedCount = 0;
      data.forEach(order => {
        const pubDate = new Date(order.publication_date);
        const signingDate = order.signing_date ? new Date(order.signing_date) : null;
        const cutoffDate = new Date('2025-01-20');
        
        if ((pubDate >= cutoffDate || (signingDate && signingDate >= cutoffDate)) && 
            (order.president === 'Unknown' || !order.president)) {
          order.president = 'Trump';
          updatedCount++;
        }
      });
      
      fs.writeFileSync('executive_orders.json', JSON.stringify(data, null, 2));
      console.log(`Updated ${updatedCount} records in executive_orders.json`);
    }
    
    // Update financial_executive_orders.json
    if (fs.existsSync('financial_executive_orders.json')) {
      console.log("Updating financial_executive_orders.json...");
      const data = JSON.parse(fs.readFileSync('financial_executive_orders.json', 'utf8'));
      
      let updatedCount = 0;
      data.forEach(order => {
        const pubDate = new Date(order.publication_date);
        const signingDate = order.signing_date ? new Date(order.signing_date) : null;
        const cutoffDate = new Date('2025-01-20');
        
        if ((pubDate >= cutoffDate || (signingDate && signingDate >= cutoffDate)) && 
            (order.president === 'Unknown' || !order.president)) {
          order.president = 'Trump';
          updatedCount++;
        }
      });
      
      fs.writeFileSync('financial_executive_orders.json', JSON.stringify(data, null, 2));
      console.log(`Updated ${updatedCount} records in financial_executive_orders.json`);
    }
    
    // Update processed_executive_orders.json
    if (fs.existsSync('processed_executive_orders.json')) {
      console.log("Updating processed_executive_orders.json...");
      const data = JSON.parse(fs.readFileSync('processed_executive_orders.json', 'utf8'));
      
      let updatedCount = 0;
      data.forEach(order => {
        const signingDate = order.signing_date ? new Date(order.signing_date) : null;
        const cutoffDate = new Date('2025-01-20');
        
        if (signingDate && signingDate >= cutoffDate && 
            (order.president === 'Unknown' || !order.president)) {
          order.president = 'Trump';
          updatedCount++;
        }
      });
      
      fs.writeFileSync('processed_executive_orders.json', JSON.stringify(data, null, 2));
      console.log(`Updated ${updatedCount} records in processed_executive_orders.json`);
    }
    
    // Update docs/data/executive_orders.json if it exists
    const docsDataPath = path.join(__dirname, 'docs', 'data', 'executive_orders.json');
    if (fs.existsSync(docsDataPath)) {
      console.log("Updating docs/data/executive_orders.json...");
      const data = JSON.parse(fs.readFileSync(docsDataPath, 'utf8'));
      
      let updatedCount = 0;
      data.forEach(order => {
        const signingDate = order.signing_date ? new Date(order.signing_date) : null;
        const cutoffDate = new Date('2025-01-20');
        
        if (signingDate && signingDate >= cutoffDate && 
            (order.president === 'Unknown' || !order.president)) {
          order.president = 'Trump';
          updatedCount++;
        }
      });
      
      fs.writeFileSync(docsDataPath, JSON.stringify(data, null, 2));
      console.log(`Updated ${updatedCount} records in docs/data/executive_orders.json`);
    }
    
  } catch (error) {
    console.error("Error updating JSON files:", error);
  }
}

// Main function
async function main() {
  try {
    // Update database
    await updatePresidentField();
    
    // Update JSON files
    await updateJsonFiles();
    
    console.log("President field update completed successfully!");
  } catch (error) {
    console.error("Error in update process:", error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the main function
main();