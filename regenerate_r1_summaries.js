/**
 * regenerate_r1_summaries.js
 * 
 * This script regenerates summaries for executive orders with high impact on private R1 institutions,
 * using the new R1-focused AI prompt system.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Import the generateMultiLevelSummaries and saveSummaries functions from generate_plain_summaries.js
const { generateMultiLevelSummaries, saveSummaries } = require('./generate_plain_summaries');

// Open SQLite database
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

// Get executive orders with high impact on R1s for priority reanalysis
async function getHighImpactOrders() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT eo.id, eo.order_number, eo.title, eo.summary, eo.full_text, eo.impact_level,
             eo.signing_date, eo.president, 
             GROUP_CONCAT(DISTINCT c.name) as categories,
             GROUP_CONCAT(DISTINCT ia.name) as impact_areas,
             GROUP_CONCAT(DISTINCT uia.name) as university_impact_areas
      FROM executive_orders eo
      LEFT JOIN order_categories oc ON eo.id = oc.order_id
      LEFT JOIN categories c ON oc.category_id = c.id
      LEFT JOIN order_impact_areas oia ON eo.id = oia.order_id
      LEFT JOIN impact_areas ia ON oia.impact_area_id = ia.id
      LEFT JOIN order_university_impact_areas ouia ON eo.id = ouia.order_id
      LEFT JOIN university_impact_areas uia ON ouia.university_impact_area_id = uia.id
      WHERE (eo.impact_level = 'Critical' OR eo.impact_level = 'High') 
        AND (
          ouia.university_impact_area_id IN (
            SELECT id FROM university_impact_areas 
            WHERE name LIKE '%Research%' 
               OR name LIKE '%International%'
               OR name LIKE '%Endowment%'
          )
          OR
          oc.category_id IN (
            SELECT id FROM categories 
            WHERE name LIKE '%Research%' 
               OR name LIKE '%Technology%'
               OR name LIKE '%National Security%'
          )
        )
      GROUP BY eo.id
      ORDER BY eo.signing_date DESC
      LIMIT 10
    `;
    
    db.all(query, [], (err, orders) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Format the results
      const formattedOrders = orders.map(order => {
        return {
          ...order,
          categories: order.categories ? order.categories.split(',') : [],
          impact_areas: order.impact_areas ? order.impact_areas.split(',') : [],
          university_impact_areas: order.university_impact_areas ? order.university_impact_areas.split(',') : []
        };
      });
      
      resolve(formattedOrders);
    });
  });
}

// Main function
async function main() {
  try {
    // Get orders with high impact on R1s
    const orders = await getHighImpactOrders();
    console.log(`Found ${orders.length} high-impact orders for private R1 reanalysis`);
    
    if (orders.length === 0) {
      console.log('No orders need reanalysis. Exiting.');
      db.close();
      return;
    }
    
    // Process each order
    let successCount = 0;
    for (const order of orders) {
      try {
        console.log(`Regenerating R1-focused analysis for ${order.order_number}: ${order.title}`);
        
        // Generate all summary types with R1 focus
        const summaries = await generateMultiLevelSummaries(order);
        
        if (summaries) {
          // Save summaries to database
          await saveSummaries(order.id, summaries);
          console.log(`Successfully regenerated R1-focused summaries for ${order.order_number}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing order ${order.order_number}: ${error.message}`);
      }
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Successfully regenerated ${successCount} R1-focused summaries`);
    console.log('Process completed.');
    
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    db.close();
  }
}

// Run the main function
main();