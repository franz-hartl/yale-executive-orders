/**
 * update_missing_dates.js
 * 
 * This script updates executive orders in the database where signing_date is NULL
 * by using the publication_date as a fallback value.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

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

// Main function
async function main() {
  try {
    console.log("Starting update of missing signing dates...");
    
    // Get all orders with missing signing dates but have publication dates
    const ordersToUpdate = await dbAll(`
      SELECT id, order_number, title, publication_date, url
      FROM executive_orders 
      WHERE (signing_date IS NULL OR signing_date = '') 
      AND publication_date IS NOT NULL
      ORDER BY publication_date DESC
    `);
    
    console.log(`Found ${ordersToUpdate.length} orders that need date updates`);
    
    let successCount = 0;
    
    // Update each order
    for (const order of ordersToUpdate) {
      try {
        console.log(`Updating order ${order.id}: ${order.order_number} - ${order.title}`);
        
        // Use publication_date as the signing_date
        const result = await dbRun(
          `UPDATE executive_orders 
           SET signing_date = ?
           WHERE id = ?`,
          [order.publication_date, order.id]
        );
        
        if (result.changes > 0) {
          successCount++;
          console.log(`Successfully updated signing date for order ${order.id} to ${order.publication_date}`);
        } else {
          console.log(`No changes made for order ${order.id}`);
        }
      } catch (error) {
        console.error(`Error updating order ${order.id}:`, error);
      }
    }
    
    console.log(`\nUpdate completed. Successfully updated ${successCount} out of ${ordersToUpdate.length} orders.`);
    
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the main function
main();