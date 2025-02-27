// Script to update the categories in the JSON files based on the database data
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Paths to JSON files
const paths = [
  path.join(__dirname, 'docs', 'data', 'executive_orders.json'),
  path.join(__dirname, 'public', 'data', 'executive_orders.json')
];

// Connect to the database
const db = new sqlite3.Database('./executive_orders.db');

// Get categories
function getCategories() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, name, description 
      FROM categories
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const categoriesMap = {};
      rows.forEach(row => {
        categoriesMap[row.id] = {
          name: row.name,
          description: row.description
        };
      });
      
      resolve(categoriesMap);
    });
  });
}

// Get categories for each order
function getOrderCategories() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT order_id, category_id 
      FROM order_categories
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const orderCategories = {};
      rows.forEach(row => {
        if (!orderCategories[row.order_id]) {
          orderCategories[row.order_id] = [];
        }
        orderCategories[row.order_id].push(row.category_id);
      });
      
      resolve(orderCategories);
    });
  });
}

// Update JSON files
async function updateJsonFiles() {
  try {
    // Get the categories and order categories
    const categoriesMap = await getCategories();
    const orderCategories = await getOrderCategories();
    
    // Process each JSON file
    for (const filePath of paths) {
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        continue;
      }
      
      try {
        // Read and parse JSON
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Update each order's categories
        data.forEach(order => {
          if (orderCategories[order.id]) {
            order.categories = orderCategories[order.id].map(categoryId => 
              categoriesMap[categoryId].name
            );
          } else {
            order.categories = [];
          }
        });
        
        // Write updated JSON back to file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Updated ${filePath}`);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
    
    console.log('Categories update completed.');
  } catch (error) {
    console.error('Error updating categories:', error);
  } finally {
    db.close();
  }
}

// Run the update
updateJsonFiles();