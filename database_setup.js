/**
 * database_setup.js
 * 
 * This script initializes and updates the SQLite database with executive order data.
 * It's used for local preprocessing before exporting data to static JSON files.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Database file path
const dbFile = path.join(__dirname, 'executive_orders.db');
const csvFile = path.join(__dirname, 'financial_executive_orders.csv');

// Connect to or create the database
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

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

// Create tables if they don't exist
async function createTables() {
  try {
    // Create executive orders table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS executive_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE,
        title TEXT NOT NULL,
        signing_date TEXT,
        president TEXT,
        summary TEXT,
        url TEXT,
        impact_level TEXT,
        full_text TEXT,
        plain_language_summary TEXT,
        executive_brief TEXT,
        comprehensive_analysis TEXT,
        status TEXT DEFAULT 'Active'
      )
    `);
    
    // Create categories tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT
      )
    `);
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_categories (
        order_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (order_id, category_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
    
    // Create impact areas tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS impact_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT
      )
    `);
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_impact_areas (
        order_id INTEGER,
        impact_area_id INTEGER,
        PRIMARY KEY (order_id, impact_area_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (impact_area_id) REFERENCES impact_areas(id)
      )
    `);
    
    // Create university impact areas tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS university_impact_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT
      )
    `);
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_university_impact_areas (
        order_id INTEGER,
        university_impact_area_id INTEGER,
        notes TEXT,
        PRIMARY KEY (order_id, university_impact_area_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (university_impact_area_id) REFERENCES university_impact_areas(id)
      )
    `);
    
    // Create compliance actions table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS compliance_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        deadline TEXT,
        responsible_party TEXT,
        status TEXT DEFAULT 'Pending',
        FOREIGN KEY (order_id) REFERENCES executive_orders(id)
      )
    `);
    
    console.log('Database tables created successfully');
    
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  }
}

// Initialize reference data (categories, impact areas, etc.)
async function initializeReferenceData() {
  try {
    // Check if categories already exist
    const categoryCount = await dbGet('SELECT COUNT(*) as count FROM categories');
    if (categoryCount.count === 0) {
      console.log('Initializing reference data...');
      
      // Insert higher education impact areas
      const universityImpactAreas = [
        { name: 'Research Funding', description: 'Impact on federal research grants, funding priorities, and research initiatives across institution types' },
        { name: 'Student Aid & Higher Education Finance', description: 'Impact on student financial aid, loan programs, and education financing for diverse institution types' },
        { name: 'Administrative Compliance', description: 'Impact on regulatory requirements, reporting, and compliance obligations for higher education institutions' },
        { name: 'Workforce & Employment Policy', description: 'Impact on faculty hiring, employment regulations, and visa policies in the higher education sector' },
        { name: 'Public-Private Partnerships', description: 'Impact on academic-industry collaboration and economic development initiatives' },
        { name: 'Institutional Accessibility', description: 'Impact on educational access, affordability, and inclusion across diverse student populations' },
        { name: 'Academic Freedom & Curriculum', description: 'Impact on instructional policy, academic freedom, and curriculum requirements' }
      ];
      
      for (const area of universityImpactAreas) {
        await dbRun('INSERT INTO university_impact_areas (name, description) VALUES (?, ?)', 
          [area.name, area.description]);
      }
      
      // Insert categories
      const categories = [
        { name: 'Technology', description: 'Related to technology, AI, computing, and digital infrastructure' },
        { name: 'Education', description: 'Related to education policy, learning, and academic programs' },
        { name: 'Finance', description: 'Related to financial regulations, funding, and economic policy' },
        { name: 'Healthcare', description: 'Related to healthcare, public health, and medical research' },
        { name: 'Research', description: 'Related to research initiatives, methodology, and priorities' },
        { name: 'Immigration', description: 'Related to immigration policy, visas, and international students' },
        { name: 'National Security', description: 'Related to national security, defense, and safety' },
        { name: 'Diversity', description: 'Related to diversity, equity, inclusion, and accessibility' },
        { name: 'Environment', description: 'Related to environmental protection, climate, and sustainability' },
        { name: 'Industry', description: 'Related to industry partnerships, business, and economic development' }
      ];
      
      for (const category of categories) {
        await dbRun('INSERT INTO categories (name, description) VALUES (?, ?)', 
          [category.name, category.description]);
      }
      
      // Insert impact areas
      const impactAreas = [
        { name: 'Research', description: 'Impact on research activities and initiatives' },
        { name: 'Compliance', description: 'Impact on regulatory compliance requirements' },
        { name: 'Funding', description: 'Impact on funding sources and financial considerations' },
        { name: 'Policy', description: 'Impact on institutional policies and procedures' },
        { name: 'Student Aid', description: 'Impact on student financial aid and support' },
        { name: 'Economic Development', description: 'Impact on economic growth and development' },
        { name: 'Regulatory', description: 'Impact on regulations and regulatory frameworks' },
        { name: 'Operational', description: 'Impact on day-to-day operations and administration' }
      ];
      
      for (const area of impactAreas) {
        await dbRun('INSERT INTO impact_areas (name, description) VALUES (?, ?)', 
          [area.name, area.description]);
      }
      
      console.log('Reference data initialized successfully');
    } else {
      console.log('Reference data already exists, skipping initialization');
    }
  } catch (err) {
    console.error('Error initializing reference data:', err);
    throw err;
  }
}

// Import executive orders from CSV
async function importFromCSV() {
  if (!fs.existsSync(csvFile)) {
    console.log('CSV file not found, skipping import');
    return;
  }
  
  console.log(`Importing executive orders from ${csvFile}...`);
  
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
          const existingOrder = await dbGet('SELECT id FROM executive_orders WHERE order_number = ?', 
            [order.order_number]);
          
          if (existingOrder) {
            console.log(`Order ${order.order_number} already exists, skipping`);
            continue;
          }
          
          // Insert executive order
          const result = await dbRun(
            'INSERT INTO executive_orders (order_number, title, signing_date, president, summary, url, impact_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              order.order_number,
              order.title,
              order.signing_date,
              order.president,
              order.summary,
              order.url,
              order.impact_level
            ]
          );
          
          const orderId = result.lastID;
          
          // Process categories
          if (order.categories) {
            const categories = order.categories.split(',').map(c => c.trim());
            for (const categoryName of categories) {
              // Find category ID
              const category = await dbGet('SELECT id FROM categories WHERE name = ?', [categoryName]);
              if (category) {
                // Add to order_categories
                await dbRun('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', 
                  [orderId, category.id]);
              }
            }
          }
          
          // Process impact areas
          if (order.impact_areas) {
            const impactAreas = order.impact_areas.split(',').map(a => a.trim());
            for (const areaName of impactAreas) {
              // Find impact area ID
              const area = await dbGet('SELECT id FROM impact_areas WHERE name = ?', [areaName]);
              if (area) {
                // Add to order_impact_areas
                await dbRun('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', 
                  [orderId, area.id]);
              }
            }
          }
          
          // Process university impact areas
          if (order.university_impact_areas) {
            const universityAreas = order.university_impact_areas.split(',').map(a => a.trim());
            for (const areaName of universityAreas) {
              // Find university impact area ID
              const area = await dbGet('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
              if (area) {
                // Add to order_university_impact_areas
                await dbRun('INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)', 
                  [orderId, area.id]);
              }
            }
          }
          
          console.log(`Successfully imported order: ${order.order_number}`);
        }
        
        console.log('CSV import complete');
        
      } catch (err) {
        console.error('Error importing from CSV:', err);
      } finally {
        // Close the database connection
        db.close();
      }
    });
}

// Import sample data if the database is empty
async function importSampleData() {
  try {
    // Check if any orders exist
    const orderCount = await dbGet('SELECT COUNT(*) as count FROM executive_orders');
    
    if (orderCount.count === 0) {
      console.log('No orders found, importing sample data...');
      
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
          "categories": ["Technology", "Education", "Research"],
          "impact_areas": ["Research", "Compliance", "Policy"],
          "university_impact_areas": ["Research Funding", "Administrative Compliance"]
        },
        {
          "order_number": "EO 14111",
          "title": "Improving Higher Education Research Funding",
          "signing_date": "2025-02-15",
          "president": "Sanders",
          "summary": "Enhances federal funding for university research programs with focus on climate change, healthcare, and emerging technologies. Simplifies the grant application process for universities and increases transparency in funding allocation. Establishes priority funding for collaborative research initiatives across institutions.",
          "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/02/15/executive-order-on-improving-higher-education-research-funding/",
          "impact_level": "Critical",
          "categories": ["Education", "Research", "Finance"],
          "impact_areas": ["Funding", "Research", "Policy"],
          "university_impact_areas": ["Research Funding", "Public-Private Partnerships"]
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
          "university_impact_areas": ["Student Aid & Higher Education Finance", "Administrative Compliance"]
        },
        {
          "order_number": "EO 14113",
          "title": "Promoting Diversity in Higher Education",
          "signing_date": "2025-03-05",
          "president": "Sanders",
          "summary": "Establishes initiatives to promote diversity and inclusion in higher education institutions through new federal grant programs, data collection requirements, and accountability frameworks. Requires institutions receiving federal funding to implement comprehensive DEI strategic plans and report progress annually.",
          "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/03/05/executive-order-on-promoting-diversity-in-higher-education/",
          "impact_level": "High",
          "categories": ["Education", "Diversity"],
          "impact_areas": ["Policy", "Compliance", "Funding"],
          "university_impact_areas": ["Administrative Compliance", "Workforce & Employment Policy"]
        },
        {
          "order_number": "EO 14114",
          "title": "Strengthening University-Industry Research Partnerships",
          "signing_date": "2025-03-15",
          "president": "Sanders",
          "summary": "Creates new frameworks for collaboration between universities and private industry including tax incentives for industry investments in academic research, streamlined technology transfer processes, and joint innovation hubs. Establishes a University-Industry Partnership Council to identify strategic areas for collaboration.",
          "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/03/15/executive-order-on-strengthening-university-industry-research-partnerships/",
          "impact_level": "High",
          "categories": ["Research", "Industry", "Education"],
          "impact_areas": ["Economic Development", "Research", "Funding"],
          "university_impact_areas": ["Public-Private Partnerships", "Research Funding"]
        },
        {
          "order_number": "EO 14115",
          "title": "Enhancing International Academic Exchange Programs",
          "signing_date": "2025-04-10",
          "president": "Sanders",
          "summary": "Streamlines visa processes for international students and scholars, expands funding for exchange programs, and creates new security frameworks for international research collaborations. Establishes a new Academic Exchange Council to coordinate policies across federal agencies and recommends best practices for universities.",
          "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/04/10/executive-order-on-enhancing-international-academic-exchange-programs/",
          "impact_level": "Medium",
          "categories": ["Education", "Immigration", "Research"],
          "impact_areas": ["Policy", "Compliance", "Funding"],
          "university_impact_areas": ["Workforce & Employment Policy", "Research Funding", "Administrative Compliance"]
        },
        {
          "order_number": "EO 14116",
          "title": "Advancing Climate Research in Higher Education",
          "signing_date": "2025-05-01",
          "president": "Sanders",
          "summary": "Directs federal agencies to prioritize funding for climate research at universities, creates new grant programs for climate-focused initiatives, and establishes reporting requirements for environmental sustainability on campuses. Creates a Climate Research Coordination Office to align university research with national climate goals.",
          "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/05/01/executive-order-on-advancing-climate-research-in-higher-education/",
          "impact_level": "High",
          "categories": ["Environment", "Research", "Education"],
          "impact_areas": ["Research", "Funding", "Compliance"],
          "university_impact_areas": ["Research Funding", "Administrative Compliance", "Public-Private Partnerships"]
        }
      ];
      
      // Insert sample orders
      for (const order of sampleOrders) {
        const result = await dbRun(
          'INSERT INTO executive_orders (order_number, title, signing_date, president, summary, url, impact_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            order.order_number,
            order.title,
            order.signing_date,
            order.president,
            order.summary,
            order.url,
            order.impact_level
          ]
        );
        
        const orderId = result.lastID;
        
        // Insert categories
        for (const categoryName of order.categories) {
          // Find category ID
          const category = await dbGet('SELECT id FROM categories WHERE name = ?', [categoryName]);
          if (category) {
            // Add to order_categories
            await dbRun('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', 
              [orderId, category.id]);
          }
        }
        
        // Insert impact areas
        for (const areaName of order.impact_areas) {
          // Find impact area ID
          const area = await dbGet('SELECT id FROM impact_areas WHERE name = ?', [areaName]);
          if (area) {
            // Add to order_impact_areas
            await dbRun('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', 
              [orderId, area.id]);
          }
        }
        
        // Insert university impact areas
        for (const areaName of order.university_impact_areas) {
          // Find university impact area ID
          const area = await dbGet('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
          if (area) {
            // Add to order_university_impact_areas
            await dbRun('INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)', 
              [orderId, area.id]);
          }
        }
      }
      
      console.log('Sample data imported successfully');
    } else {
      console.log(`Database already contains ${orderCount.count} orders, skipping sample data import`);
    }
  } catch (err) {
    console.error('Error importing sample data:', err);
    throw err;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting database setup...');
    
    // Create tables if they don't exist
    await createTables();
    
    // Initialize reference data
    await initializeReferenceData();
    
    // Import sample data if needed
    await importSampleData();
    
    // Import from CSV
    await importFromCSV();
    
    console.log('Database setup completed successfully');
    
  } catch (err) {
    console.error('Error in database setup:', err);
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

// Run the main function
main();