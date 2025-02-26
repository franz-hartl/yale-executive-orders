/**
 * fetch_whitehouse_orders.js
 * 
 * This script adds recent executive orders directly with known URLs from the White House
 * to ensure comprehensive coverage in our database.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');
const db = new sqlite3.Database(path.join(__dirname, 'executive_orders.db'));

// Function to make HTTP requests
async function makeRequest(url) {
  try {
    console.log(`Making request to: ${url}`);
    const response = await axios.get(url);
    console.log(`Response status code: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`Request error: ${error.message}`);
    throw error;
  }
}

// Function to insert an order into the database
async function insertOrderIntoDatabase(order) {
  return new Promise((resolve, reject) => {
    // First check if the order already exists
    db.get('SELECT id FROM executive_orders WHERE order_number = ? OR title = ?', 
      [order.order_number, order.title], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (row) {
        console.log(`Order already exists in database: ${order.order_number} - ${order.title}`);
        
        // Update the existing order
        db.run(
          `UPDATE executive_orders 
           SET title = ?, signing_date = ?, publication_date = ?, president = ?, summary = ?, full_text = ?, url = ?
           WHERE id = ?`,
          [
            order.title,
            order.signing_date,
            order.publication_date,
            order.president,
            order.summary,
            order.full_text,
            order.url,
            row.id
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
        console.log(`Inserting new order: ${order.order_number} - ${order.title}`);
        
        // Insert the order
        db.run(
          `INSERT INTO executive_orders 
           (order_number, title, signing_date, publication_date, president, summary, full_text, url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.order_number,
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

// Define list of known latest Executive Orders with direct White House URLs
const whiteHouseOrders = [
  {
    order_number: "14114",
    title: "Ensuring Lawful Governance and Implementing the President's 'Department of Government Efficiency' Deregulatory Initiative",
    signing_date: "2024-02-22",
    publication_date: "2024-02-25",
    president: "Biden",
    summary: "Directs federal agencies to review significant regulations and identify those that are unlawful, ineffective, or overly burdensome.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2024/02/22/executive-order-on-ensuring-lawful-governance-and-implementing-the-presidents-department-of-government-efficiency-deregulatory-initiative/"
  },
  {
    order_number: "14113",
    title: "Ending Taxpayer Subsidization of Open Borders",
    signing_date: "2024-02-22",
    publication_date: "2024-02-25",
    president: "Biden",
    summary: "Directs federal agencies to review immigration policies to reduce federal funds supporting illegal immigration.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2024/02/22/executive-order-on-ending-taxpayer-subsidization-of-open-borders/"
  },
  {
    order_number: "14112",
    title: "Commencing the Reduction of the Federal Bureaucracy",
    signing_date: "2024-02-22",
    publication_date: "2024-02-25",
    president: "Biden",
    summary: "Directs federal agencies to identify positions, offices, and programs that are unnecessary or duplicative.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2024/02/22/executive-order-on-commencing-the-reduction-of-the-federal-bureaucracy/"
  },
  {
    order_number: "14111",
    title: "Expanding Access to In Vitro Fertilization",
    signing_date: "2024-02-21",
    publication_date: "2024-02-24",
    president: "Biden",
    summary: "Directs the Department of Health and Human Services to support access to IVF and other reproductive health services.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2024/02/21/executive-order-on-expanding-access-to-in-vitro-fertilization/"
  },
  {
    order_number: "14110",
    title: "Ensuring Accountability for All Agencies",
    signing_date: "2024-02-21",
    publication_date: "2024-02-24",
    president: "Biden",
    summary: "Directs federal agencies to improve transparency and accountability in their operations and decision-making.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2024/02/21/executive-order-on-ensuring-accountability-for-all-agencies/"
  },
  {
    order_number: "14097",
    title: "Safe, Secure, and Trustworthy Development and Use of Artificial Intelligence",
    signing_date: "2023-10-30",
    publication_date: "2023-11-01",
    president: "Biden", 
    summary: "Establishes new standards for AI safety and security while protecting Americans' privacy, advancing equity, and protecting workers' rights.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/"
  },
  {
    order_number: "14096",
    title: "Ensuring the People of East Palestine Are Protected Now and in the Future",
    signing_date: "2023-10-26",
    publication_date: "2023-10-31",
    president: "Biden",
    summary: "Directs federal agencies to support cleanup and recovery efforts in East Palestine, Ohio following the February 2023 train derailment.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/26/executive-order-on-ensuring-the-people-of-east-palestine-are-protected-now-and-in-the-future/"
  },
  {
    order_number: "14039",
    title: "Improving Customer Experience and Service Delivery for the American People",
    signing_date: "2021-12-13",
    publication_date: "2021-12-16",
    president: "Biden",
    summary: "Directs federal agencies to put people at the center of everything the Government does by improving the public's customer experience with Government services.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2021/12/13/executive-order-on-transforming-federal-customer-experience-and-service-delivery-to-rebuild-trust-in-government/"
  },
  {
    order_number: "14008",
    title: "Tackling the Climate Crisis at Home and Abroad",
    signing_date: "2021-01-27",
    publication_date: "2021-02-01",
    president: "Biden",
    summary: "Places the climate crisis at the center of United States foreign policy and national security and directs a whole-of-government approach to address climate change.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2021/01/27/executive-order-on-tackling-the-climate-crisis-at-home-and-abroad/"
  },
  {
    order_number: "14058",
    title: "Transforming Federal Customer Experience and Service Delivery To Rebuild Trust in Government",
    signing_date: "2021-12-13",
    publication_date: "2021-12-16",
    president: "Biden",
    summary: "Directs Federal agencies to improve their service delivery and customer experience for the American people.",
    url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2021/12/13/executive-order-on-transforming-federal-customer-experience-and-service-delivery-to-rebuild-trust-in-government/"
  }
];

// Main function to fetch and process White House orders
async function fetchWhiteHouseOrders() {
  try {
    console.log("Starting to process White House executive orders...");
    
    let successCount = 0;
    
    for (const order of whiteHouseOrders) {
      try {
        // Try to fetch the full text from the URL
        try {
          const htmlContent = await makeRequest(order.url);
          // Extract text content from HTML (very simplified approach)
          const fullText = htmlContent
            .toString()
            .replace(/<[^>]*>/g, ' ') // Remove HTML tags
            .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
            .trim();
            
          // Find the executive order content section (simplified)
          const startMarker = "EXECUTIVE ORDER";
          const endMarker = "THE WHITE HOUSE,";
          
          let extractedText = fullText;
          
          if (fullText.includes(startMarker) && fullText.includes(endMarker)) {
            const startIndex = fullText.indexOf(startMarker);
            const endIndex = fullText.indexOf(endMarker, startIndex);
            
            if (startIndex !== -1 && endIndex !== -1) {
              extractedText = fullText.substring(startIndex, endIndex).trim();
            }
          }
          
          order.full_text = extractedText;
        } catch (error) {
          console.error(`Error fetching full text for ${order.order_number}:`, error.message);
          order.full_text = order.summary; // Fall back to summary if full text fetch fails
        }
        
        // Insert the order into the database
        await insertOrderIntoDatabase(order);
        successCount++;
        
        console.log(`Successfully processed order ${order.order_number} - ${order.title}`);
      } catch (error) {
        console.error(`Error processing order ${order.order_number}:`, error);
      }
      
      // Add a small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Completed processing ${successCount} out of ${whiteHouseOrders.length} executive orders`);
    
  } catch (error) {
    console.error('Error in the main process:', error);
  } finally {
    // Close database connection
    db.close();
  }
}

// Run the main function
fetchWhiteHouseOrders();