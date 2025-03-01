/**
 * fetch_recent_db_clean.js
 * 
 * Clean version of the script to fetch recent executive orders using the new Database API.
 * Retrieves orders after Jan 20, 2025 and adds them to the database.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Database = require('./utils/database');
require('dotenv').config();

// Initialize database
const db = new Database();

// Fetch recent executive orders from Federal Register API
async function fetchRecentExecutiveOrders() {
  try {
    console.log('Fetching recent executive orders from Federal Register API...');
    
    // Fetch data from financial_executive_orders.json
    const jsonData = fs.readFileSync(path.join(__dirname, 'financial_executive_orders.json'), 'utf8');
    const allOrders = JSON.parse(jsonData);
    
    // Filter orders after January 20, 2025
    const cutoffDate = new Date('2025-01-20');
    const recentOrders = allOrders.filter(order => {
      const orderDate = new Date(order.signing_date);
      return orderDate >= cutoffDate;
    });
    
    console.log(`Found ${recentOrders.length} recent executive orders to process.`);
    
    // Connect to database
    await db.connect();
    
    // Process each order
    for (const order of recentOrders) {
      await processOrder(order);
    }
    
    console.log('All recent orders processed successfully!');
  } catch (error) {
    console.error('Error fetching recent orders:', error);
  } finally {
    await db.close();
  }
}

// Process a single executive order
async function processOrder(order) {
  try {
    console.log(`Processing order ${order.order_number}: ${order.title}`);
    
    // Check if order already exists
    const existingOrder = await db.getOrderByNumber(order.order_number);
    
    if (existingOrder) {
      console.log(`Order ${order.order_number} already exists in database, skipping...`);
      return;
    }
    
    // Prepare order data
    const orderData = {
      order_number: order.order_number,
      title: order.title,
      signing_date: order.signing_date,
      president: order.president,
      summary: order.summary,
      url: order.url,
      impact_level: determineImpactLevel(order)
    };
    
    // Insert executive order
    const orderId = await db.createOrder(orderData);
    console.log(`Inserted order ${order.order_number} with ID ${orderId}`);
    
    // Add categories
    if (order.categories && order.categories.length > 0) {
      await addCategories(orderId, order.categories);
    }
    
    // Add impact areas
    if (order.impact_areas && order.impact_areas.length > 0) {
      await addImpactAreas(orderId, order.impact_areas);
    }
    
    // Add university impact areas
    if (order.university_impact_areas && order.university_impact_areas.length > 0) {
      await addUniversityImpactAreas(orderId, order.university_impact_areas);
    }
    
    console.log(`Successfully processed order ${order.order_number}`);
  } catch (error) {
    console.error(`Error processing order ${order.order_number}:`, error);
  }
}

// Determine impact level based on keywords
function determineImpactLevel(order) {
  const highImpactKeywords = [
    'education', 'university', 'college', 'student', 'academic', 'research',
    'grant', 'science', 'funding', 'scholarship', 'higher education'
  ];
  
  const title = order.title.toLowerCase();
  const summary = order.summary ? order.summary.toLowerCase() : '';
  
  // Check for high impact keywords
  for (const keyword of highImpactKeywords) {
    if (title.includes(keyword) || summary.includes(keyword)) {
      return 'High';
    }
  }
  
  // Default to Medium
  return 'Medium';
}

// Add categories to an order
async function addCategories(orderId, categories) {
  for (const categoryName of categories) {
    // Find or create category
    let category = await db.get('SELECT id FROM categories WHERE name = ?', [categoryName]);
    
    if (!category) {
      const result = await db.run('INSERT INTO categories (name) VALUES (?)', [categoryName]);
      category = { id: result.lastID };
    }
    
    // Link category to order
    await db.run(
      'INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)',
      [orderId, category.id]
    );
  }
}

// Add impact areas to an order
async function addImpactAreas(orderId, impactAreas) {
  for (const areaName of impactAreas) {
    // Find or create impact area
    let area = await db.get('SELECT id FROM impact_areas WHERE name = ?', [areaName]);
    
    if (!area) {
      const result = await db.run('INSERT INTO impact_areas (name) VALUES (?)', [areaName]);
      area = { id: result.lastID };
    }
    
    // Link impact area to order
    await db.run(
      'INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)',
      [orderId, area.id]
    );
  }
}

// Add university impact areas to an order
async function addUniversityImpactAreas(orderId, universityImpactAreas) {
  for (const areaName of universityImpactAreas) {
    // Find or create university impact area
    let area = await db.get('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
    
    if (!area) {
      const result = await db.run('INSERT INTO university_impact_areas (name) VALUES (?)', [areaName]);
      area = { id: result.lastID };
    }
    
    // Link university impact area to order
    await db.run(
      'INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)',
      [orderId, area.id]
    );
  }
}

// Run the script if executed directly
if (require.main === module) {
  fetchRecentExecutiveOrders()
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}

module.exports = { fetchRecentExecutiveOrders };