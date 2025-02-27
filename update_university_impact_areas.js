// Script to update the university_impact_areas in the JSON files based on the database data
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

// Get university impact areas
function getUniversityImpactAreas() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, name, description 
      FROM university_impact_areas
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const impactAreasMap = {};
      rows.forEach(row => {
        impactAreasMap[row.id] = {
          name: row.name,
          description: row.description
        };
      });
      
      resolve(impactAreasMap);
    });
  });
}

// Get university impact areas for each order
function getOrderUniversityImpactAreas() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT order_id, university_impact_area_id 
      FROM order_university_impact_areas
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const orderImpactAreas = {};
      rows.forEach(row => {
        if (!orderImpactAreas[row.order_id]) {
          orderImpactAreas[row.order_id] = [];
        }
        orderImpactAreas[row.order_id].push(row.university_impact_area_id);
      });
      
      resolve(orderImpactAreas);
    });
  });
}

// Update JSON files
async function updateJsonFiles() {
  try {
    // Get the impact areas and order impact areas
    const impactAreasMap = await getUniversityImpactAreas();
    const orderImpactAreas = await getOrderUniversityImpactAreas();
    
    // Process each JSON file
    for (const filePath of paths) {
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        continue;
      }
      
      try {
        // Read and parse JSON
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Update each order's university_impact_areas
        data.forEach(order => {
          if (orderImpactAreas[order.id]) {
            order.university_impact_areas = orderImpactAreas[order.id].map(areaId => ({
              name: impactAreasMap[areaId].name,
              description: impactAreasMap[areaId].description
            }));
          } else {
            order.university_impact_areas = [];
          }
        });
        
        // Write updated JSON back to file
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Updated ${filePath}`);
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
    
    console.log('University impact areas update completed.');
  } catch (error) {
    console.error('Error updating university impact areas:', error);
  } finally {
    db.close();
  }
}

// Run the update
updateJsonFiles();