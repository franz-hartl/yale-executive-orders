/**
 * database_setup_clean.js
 * 
 * Clean version of database setup that uses the new schema and database API.
 * This replaces the old database_setup.js file.
 */

const Database = require('./utils/database');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// CSV file path
const csvFile = path.join(__dirname, 'financial_executive_orders.csv');

async function setupDatabase() {
  console.log('Starting clean database setup...');
  
  // Create and connect to the database
  const db = new Database();
  await db.connect();
  
  try {
    // Create all tables from schema
    console.log('Creating database tables...');
    await db.createTables();
    
    // Initialize reference data
    console.log('Initializing reference data...');
    await db.initializeReferenceData();
    
    // Check if we have any orders already
    const orderCount = await db.get('SELECT COUNT(*) as count FROM executive_orders');
    
    if (orderCount.count === 0) {
      // Import sample data if the database is empty
      console.log('Database is empty, importing sample data...');
      await importSampleData(db);
      
      // Import from CSV if available
      if (fs.existsSync(csvFile)) {
        console.log('Found CSV file, importing executive orders...');
        await importFromCSV(db);
      }
    } else {
      console.log(`Database already contains ${orderCount.count} orders, skipping import`);
    }
    
    console.log('Database setup completed successfully!');
  } catch (err) {
    console.error('Error in database setup:', err);
  } finally {
    // Close the database connection
    await db.close();
    console.log('Database connection closed');
  }
}

// Import sample data
async function importSampleData(db) {
  // Sample executive orders
  const sampleOrders = [
    {
      "order_number": "EO 14110",
      "title": "Addressing the Risks and Harnessing the Benefits of Artificial Intelligence",
      "signing_date": "2025-01-30",
      "president": "Sanders",
      "summary": "Establishes new standards for AI safety and security in academic institutions. Requires universities receiving federal funding to implement responsible AI practices in research and teaching. Establishes an AI Safety Council with representatives from top research universities.",
      "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/01/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/",
      "impact_level": "High",
      "categories": ["Technology", "Education", "Research & Science Policy"],
      "impact_areas": ["Research", "Compliance", "Policy"],
      "university_impact_areas": ["Research Funding & Science Policy", "Regulatory Compliance"]
    },
    {
      "order_number": "EO 14111",
      "title": "Improving Higher Education Research Funding",
      "signing_date": "2025-02-15",
      "president": "Sanders",
      "summary": "Enhances federal funding for university research programs with focus on climate change, healthcare, and emerging technologies. Simplifies the grant application process for universities and increases transparency in funding allocation. Establishes priority funding for collaborative research initiatives across institutions.",
      "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/02/15/executive-order-on-improving-higher-education-research-funding/",
      "impact_level": "Critical",
      "categories": ["Education", "Research & Science Policy", "Finance"],
      "impact_areas": ["Funding", "Research", "Policy"],
      "university_impact_areas": ["Research Funding & Science Policy", "Public-Private Partnerships"]
    },
    {
      "order_number": "EO 14112",
      "title": "Protecting Student Loan Borrowers",
      "signing_date": "2025-02-22",
      "president": "Sanders",
      "summary": "Implements new protections for student loan borrowers including expanded loan forgiveness programs, caps on interest rates, and strengthened oversight of loan servicers. Requires universities to provide comprehensive financial counseling for students. Creates a Student Borrower Advocacy Office within the Department of Education.",
      "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/02/22/executive-order-on-protecting-student-loan-borrowers/",
      "impact_level": "Medium",
      "categories": ["Education", "Finance"],
      "impact_areas": ["Student Aid", "Compliance", "Policy"],
      "university_impact_areas": ["Student Aid & Higher Education Finance", "Regulatory Compliance"]
    }
  ];
  
  // Insert sample orders
  for (const order of sampleOrders) {
    try {
      // Insert executive order
      const orderId = await db.createOrder({
        order_number: order.order_number,
        title: order.title,
        signing_date: order.signing_date,
        president: order.president,
        summary: order.summary,
        url: order.url,
        impact_level: order.impact_level
      });
      
      console.log(`Created sample order: ${order.order_number} (ID: ${orderId})`);
      
      // Associate categories
      for (const categoryName of order.categories) {
        const category = await db.get('SELECT id FROM categories WHERE name = ?', [categoryName]);
        if (category) {
          await db.run('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', 
            [orderId, category.id]);
        }
      }
      
      // Associate impact areas
      for (const areaName of order.impact_areas) {
        const area = await db.get('SELECT id FROM impact_areas WHERE name = ?', [areaName]);
        if (area) {
          await db.run('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', 
            [orderId, area.id]);
        }
      }
      
      // Associate university impact areas
      for (const areaName of order.university_impact_areas) {
        const area = await db.get('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
        if (area) {
          await db.run('INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)', 
            [orderId, area.id]);
        }
      }
    } catch (err) {
      console.error(`Error creating sample order ${order.order_number}:`, err);
    }
  }
  
  console.log(`Imported ${sampleOrders.length} sample orders`);
}

// Import executive orders from CSV
async function importFromCSV(db) {
  return new Promise((resolve, reject) => {
    const orders = [];
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (data) => orders.push(data))
      .on('end', async () => {
        try {
          console.log(`Found ${orders.length} orders in CSV file`);
          
          for (const order of orders) {
            console.log(`Processing order: ${order.order_number} - ${order.title}`);
            
            // Check if order already exists
            const existingOrder = await db.get('SELECT id FROM executive_orders WHERE order_number = ?', 
              [order.order_number]);
            
            if (existingOrder) {
              console.log(`Order ${order.order_number} already exists, skipping`);
              continue;
            }
            
            // Insert executive order
            const orderId = await db.createOrder({
              order_number: order.order_number,
              title: order.title,
              signing_date: order.signing_date,
              president: order.president,
              summary: order.summary,
              url: order.url,
              impact_level: order.impact_level
            });
            
            // Process categories
            if (order.categories) {
              const categories = order.categories.split(',').map(c => c.trim());
              for (const categoryName of categories) {
                // Find category ID
                const category = await db.get('SELECT id FROM categories WHERE name = ?', [categoryName]);
                if (category) {
                  // Add to order_categories
                  await db.run('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', 
                    [orderId, category.id]);
                }
              }
            }
            
            // Process impact areas
            if (order.impact_areas) {
              const impactAreas = order.impact_areas.split(',').map(a => a.trim());
              for (const areaName of impactAreas) {
                // Find impact area ID
                const area = await db.get('SELECT id FROM impact_areas WHERE name = ?', [areaName]);
                if (area) {
                  // Add to order_impact_areas
                  await db.run('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', 
                    [orderId, area.id]);
                }
              }
            }
            
            // Process university impact areas
            if (order.university_impact_areas) {
              const universityAreas = order.university_impact_areas.split(',').map(a => a.trim());
              for (const areaName of universityAreas) {
                // Find university impact area ID
                const area = await db.get('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
                if (area) {
                  // Add to order_university_impact_areas
                  await db.run('INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)', 
                    [orderId, area.id]);
                }
              }
            }
            
            console.log(`Successfully imported order: ${order.order_number}`);
          }
          
          console.log('CSV import complete');
          resolve();
          
        } catch (err) {
          console.error('Error importing from CSV:', err);
          reject(err);
        }
      });
  });
}

// Run the setup if the script is executed directly
if (require.main === module) {
  setupDatabase().catch(err => {
    console.error('Database setup failed:', err);
    process.exit(1);
  });
}

module.exports = { setupDatabase };