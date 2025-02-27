/**
 * import_all_trump_orders.js
 * 
 * This script imports all Trump executive orders from the executive_orders.json file
 * to ensure our database contains all 75 executive orders, not just the 33 currently there.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database connection
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

// Function to insert an order into the database
function insertOrderIntoDatabase(order) {
  return new Promise((resolve, reject) => {
    // First check if the order already exists
    db.get('SELECT id FROM executive_orders WHERE order_number = ?', 
      [order.document_number || order.executive_order_number], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        console.log(`Order ${order.document_number || order.executive_order_number} already exists, skipping`);
        resolve(null);
        return;
      }
      
      console.log(`Inserting new order: ${order.document_number || order.executive_order_number} - ${order.title}`);
      
      // Insert the order
      db.run(
        `INSERT INTO executive_orders 
         (order_number, title, signing_date, publication_date, president, summary, full_text, url, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.document_number || order.executive_order_number,
          order.title,
          order.signing_date,
          order.publication_date,
          order.president,
          order.summary || "No summary available",
          order.full_text || order.summary || "No full text available",
          order.url,
          "Active"
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        }
      );
    });
  });
}

// Main function
async function main() {
  try {
    console.log("Starting import of all Trump executive orders...");
    
    // Read the JSON file
    const jsonFilePath = path.join(__dirname, 'executive_orders.json');
    const data = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    
    // Filter to only Trump executive orders
    const trumpOrders = data.filter(order => order.president === 'Trump');
    console.log(`Found ${trumpOrders.length} Trump executive orders in the JSON file`);
    
    // Get count from database
    db.get('SELECT COUNT(*) as count FROM executive_orders WHERE president="Trump"', [], async (err, row) => {
      if (err) {
        console.error("Error querying database:", err);
        db.close();
        return;
      }
      
      console.log(`Currently have ${row.count} Trump executive orders in the database`);
      
      // Import each order
      let insertedCount = 0;
      for (const order of trumpOrders) {
        try {
          const id = await insertOrderIntoDatabase(order);
          if (id) insertedCount++;
        } catch (error) {
          console.error(`Error inserting order ${order.document_number}:`, error);
        }
      }
      
      console.log(`Successfully inserted ${insertedCount} new Trump executive orders`);
      
      // Get final count from database
      db.get('SELECT COUNT(*) as count FROM executive_orders WHERE president="Trump"', [], (err, row) => {
        if (err) {
          console.error("Error querying database:", err);
        } else {
          console.log(`Now have ${row.count} Trump executive orders in the database`);
        }
        
        // Close the database connection
        db.close();
      });
    });
    
  } catch (error) {
    console.error("Error in main process:", error);
    db.close();
  }
}

// Run the main function
main();