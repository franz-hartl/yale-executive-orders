/**
 * fetch_historical_orders.js
 * 
 * This script fetches all executive orders from 2022 onward and inserts them into the database.
 * It's designed to build a comprehensive historical database of executive orders.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');
const db = new sqlite3.Database(path.join(__dirname, 'executive_orders.db'));

// Function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    console.log(`Making request to: ${url}`);
    https.get(url, (res) => {
      console.log(`Response status code: ${res.statusCode}`);
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log(`Request completed, received ${data.length} bytes`);
        resolve(data);
      });
    }).on('error', (err) => {
      console.error(`Request error: ${err.message}`);
      reject(err);
    });
  });
}

// Function to insert an order into the database
async function insertOrderIntoDatabase(order) {
  return new Promise((resolve, reject) => {
    // First check if the order already exists
    db.get('SELECT id FROM executive_orders WHERE order_number = ?', [order.executive_order_number], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        console.log(`Order ${order.executive_order_number} already exists in the database, updating...`);
        
        // Update the existing order
        db.run(
          `UPDATE executive_orders 
           SET title = ?, signing_date = ?, publication_date = ?, president = ?, summary = ?, full_text = ?, url = ?
           WHERE order_number = ?`,
          [
            order.title,
            order.signing_date,
            order.publication_date,
            order.president,
            order.summary,
            order.full_text,
            order.url,
            order.executive_order_number
          ],
          (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(row.id);
          }
        );
      } else {
        console.log(`Inserting new order: ${order.executive_order_number}`);
        
        // Insert the order
        db.run(
          `INSERT INTO executive_orders 
           (order_number, title, signing_date, publication_date, president, summary, full_text, url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.executive_order_number,
            order.title,
            order.signing_date,
            order.publication_date,
            order.president,
            order.summary,
            order.full_text,
            order.url
          ],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            resolve(this.lastID);
          }
        );
      }
    });
  });
}

// Function to fetch all executive orders since 2022
async function fetchHistoricalExecutiveOrders() {
  try {
    console.log("Starting historical executive order fetch...");
    let allOrders = [];
    let currentPage = 1;
    const perPage = 50; // Maximum allowed by the API
    let hasMorePages = true;
    
    // Step 1: First, get ALL executive orders from 2022 onwards
    console.log("Fetching ALL executive orders from 2022 onwards...");
    
    const fromDate = "2022-01-01";
    while (hasMorePages) {
      console.log(`Fetching page ${currentPage} of executive orders...`);
      const url = `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bpresidential_document_type%5D=executive_order&conditions%5Bpublication_date%5D%5Bgte%5D=${fromDate}&per_page=${perPage}&page=${currentPage}&order=newest`;
      
      const response = await makeRequest(url);
      const data = JSON.parse(response);
      
      if (data.results && data.results.length > 0) {
        console.log(`Found ${data.results.length} results on page ${currentPage}`);
        
        // Process each order
        for (const order of data.results) {
          if (!allOrders.some(o => o.document_number === order.document_number)) {
            console.log(`Processing order: ${order.executive_order_number || 'N/A'} - ${order.title}`);
            
            // Get the full text of the executive order
            let fullText = '';
            try {
              if (order.body_html_url) {
                const bodyResponse = await makeRequest(order.body_html_url);
                // Extract text content from HTML
                fullText = bodyResponse.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
              }
            } catch (error) {
              console.error(`Error fetching full text for order ${order.executive_order_number}:`, error.message);
            }
            
            // Create order object
            const orderObj = {
              document_number: order.document_number,
              title: order.title,
              publication_date: order.publication_date,
              signing_date: order.signing_date,
              executive_order_number: order.executive_order_number,
              president: order.president?.name || "Unknown",
              url: order.html_url,
              summary: order.abstract || order.description || "No summary available",
              full_text: fullText || order.abstract || order.description || "No full text available"
            };
            
            // Add to our collection
            allOrders.push(orderObj);
            
            // Insert into database
            try {
              await insertOrderIntoDatabase(orderObj);
              console.log(`Successfully processed order ${orderObj.executive_order_number}`);
            } catch (error) {
              console.error(`Error inserting order ${orderObj.executive_order_number} into database:`, error);
            }
            
            // Add a small delay to prevent overwhelming the server
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Check if there are more pages
        if (data.next_page_url) {
          currentPage++;
        } else {
          hasMorePages = false;
        }
      } else {
        hasMorePages = false;
      }
    }
    
    console.log(`Successfully processed ${allOrders.length} executive orders from 2022 onwards`);
    console.log("Finished importing historical executive orders!");
    
  } catch (error) {
    console.error('Error fetching historical executive orders:', error);
  } finally {
    // Close the database
    db.close();
  }
}

// Run the main function
fetchHistoricalExecutiveOrders();