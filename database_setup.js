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
        status TEXT DEFAULT 'Active',
        urgency_rating TEXT,
        resource_intensity TEXT,
        implementation_timeline TEXT
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
    
    // Create Yale-specific impact areas tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_impact_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT,
        related_r1_area_id INTEGER NULL,
        FOREIGN KEY (related_r1_area_id) REFERENCES university_impact_areas(id)
      )
    `);
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_yale_impact_areas (
        order_id INTEGER,
        yale_impact_area_id INTEGER,
        yale_specific_notes TEXT,
        yale_impact_rating TEXT,
        PRIMARY KEY (order_id, yale_impact_area_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (yale_impact_area_id) REFERENCES yale_impact_areas(id)
      )
    `);
    
    // Create Yale stakeholders tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_stakeholders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT
      )
    `);
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_yale_stakeholders (
        order_id INTEGER,
        yale_stakeholder_id INTEGER,
        priority_level TEXT,
        action_required BOOLEAN DEFAULT 0,
        stakeholder_notes TEXT,
        PRIMARY KEY (order_id, yale_stakeholder_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (yale_stakeholder_id) REFERENCES yale_stakeholders(id)
      )
    `);
    
    // Create Yale department tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT,
        contact_info TEXT,
        parent_department_id INTEGER NULL,
        FOREIGN KEY (parent_department_id) REFERENCES yale_departments(id)
      )
    `);
    
    // Create Yale impact mapping tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_impact_mapping (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        yale_department_id INTEGER,
        impact_score INTEGER,
        impact_description TEXT,
        action_required BOOLEAN DEFAULT 0,
        priority_level TEXT,
        resource_implications TEXT,
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (yale_department_id) REFERENCES yale_departments(id)
      )
    `);
    
    // Create Yale compliance timeline tables
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_compliance_timelines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        yale_department_id INTEGER,
        deadline_date TEXT,
        requirement TEXT,
        optional INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (yale_department_id) REFERENCES yale_departments(id)
      )
    `);
    
    // Create Yale-specific compliance actions table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_compliance_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        deadline TEXT,
        yale_department_id INTEGER,
        status TEXT DEFAULT 'Pending',
        required INTEGER DEFAULT 1,
        resource_requirement TEXT,
        complexity_level TEXT,
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (yale_department_id) REFERENCES yale_departments(id)
      )
    `);
    
    // Create Yale implementation resources table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS yale_implementation_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        resource_type TEXT,
        title TEXT,
        description TEXT,
        url TEXT,
        yale_department_id INTEGER,
        yale_impact_area_id INTEGER,
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (yale_department_id) REFERENCES yale_departments(id),
        FOREIGN KEY (yale_impact_area_id) REFERENCES yale_impact_areas(id)
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
    
    // Check if Yale-specific impact areas exist
    let yaleImpactAreasCount = 0;
    try {
      yaleImpactAreasCount = await dbGet('SELECT COUNT(*) as count FROM yale_impact_areas');
    } catch (err) {
      // Table might not exist yet, which is fine
      console.log('Yale impact areas table not checked or not available');
    }
    
    if (categoryCount.count === 0 || !yaleImpactAreasCount || yaleImpactAreasCount.count === 0) {
      console.log('Initializing reference data...');
      
      // Insert higher education impact areas
      const universityImpactAreas = [
        { name: 'Research Funding & Science Policy', description: 'Impact on federal research grants, funding priorities, research security, and national science initiatives across all institution types' },
        { name: 'Student Aid & Higher Education Finance', description: 'Impact on student financial aid, loan programs, and education financing for diverse institution types' },
        { name: 'Regulatory Compliance', description: 'Impact on regulatory requirements, federal reporting mandates, certifications, and compliance obligations for higher education institutions' },
        { name: 'Labor & Employment', description: 'Impact on faculty/staff hiring, employment law, union relations, compensation, and workforce policies in higher education' },
        { name: 'Public-Private Partnerships', description: 'Impact on academic-industry collaboration, technology transfer, and economic development initiatives' },
        { name: 'Institutional Accessibility', description: 'Impact on educational access, affordability, and inclusion across diverse student populations and institution types' },
        { name: 'Academic Freedom & Curriculum', description: 'Impact on instructional policy, academic freedom, and curriculum requirements across different institutional contexts' },
        { name: 'Immigration & International Programs', description: 'Impact on international student/scholar visas, study abroad, global partnerships, and academic mobility' },
        { name: 'Diversity, Equity & Inclusion', description: 'Impact on institutional diversity initiatives, civil rights compliance, and inclusion efforts across higher education' }
      ];
      
      for (const area of universityImpactAreas) {
        await dbRun('INSERT INTO university_impact_areas (name, description) VALUES (?, ?)', 
          [area.name, area.description]);
      }
      
      // Initialize Yale-specific impact areas from JSON file if the table exists
      try {
        const yaleImpactAreasPath = path.join(__dirname, 'yale_specific_data', 'yale_impact_areas.json');
        if (fs.existsSync(yaleImpactAreasPath)) {
          const yaleImpactAreasData = JSON.parse(fs.readFileSync(yaleImpactAreasPath, 'utf-8'));
          
          for (const area of yaleImpactAreasData) {
            await dbRun(
              'INSERT INTO yale_impact_areas (id, name, description, related_r1_area_id) VALUES (?, ?, ?, ?)',
              [area.id, area.name, area.description, area.related_r1_area_id]
            );
          }
          console.log(`Imported ${yaleImpactAreasData.length} Yale-specific impact areas`);
        }
      } catch (err) {
        console.error('Error importing Yale-specific impact areas:', err);
      }
      
      // Initialize Yale stakeholders from JSON file if the table exists
      try {
        const yaleStakeholdersPath = path.join(__dirname, 'yale_specific_data', 'yale_stakeholders.json');
        if (fs.existsSync(yaleStakeholdersPath)) {
          const yaleStakeholdersData = JSON.parse(fs.readFileSync(yaleStakeholdersPath, 'utf-8'));
          
          for (const stakeholder of yaleStakeholdersData) {
            await dbRun(
              'INSERT INTO yale_stakeholders (id, name, description) VALUES (?, ?, ?)',
              [stakeholder.id, stakeholder.name, stakeholder.description]
            );
          }
          console.log(`Imported ${yaleStakeholdersData.length} Yale stakeholders`);
        }
      } catch (err) {
        console.error('Error importing Yale stakeholders:', err);
      }
      
      // Insert categories
      const categories = [
        { name: 'Technology', description: 'Related to technology, AI, computing, and digital infrastructure' },
        { name: 'Education', description: 'Related to education policy, learning, and academic programs' },
        { name: 'Finance', description: 'Related to financial regulations, funding, and economic policy' },
        { name: 'Healthcare', description: 'Related to healthcare, public health, and medical research' },
        { name: 'Research & Science Policy', description: 'Related to research initiatives, scientific methodology, funding priorities, and federal science policy' },
        { name: 'Immigration', description: 'Related to immigration policy, international student/scholar visas, and academic mobility' },
        { name: 'National Security', description: 'Related to national security, defense, sensitive research, and export controls' },
        { name: 'Diversity, Equity & Inclusion', description: 'Related to diversity, equity, inclusion, civil rights, and accessibility initiatives' },
        { name: 'Environment', description: 'Related to environmental protection, climate, and sustainability' },
        { name: 'Industry', description: 'Related to industry partnerships, business, and economic development' },
        { name: 'Labor & Employment', description: 'Related to workforce regulations, employment law, labor relations, and compensation policies' },
        { name: 'Regulatory Compliance', description: 'Related to federal reporting requirements, administrative mandates, and compliance frameworks' }
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
      
      // Insert Yale departments
      const yaleDepartments = [
        { 
          name: 'Office of the President',
          description: 'Executive leadership of Yale University',
          contact_info: 'president@yale.edu',
          parent_department_id: null
        },
        { 
          name: 'Office of the Provost',
          description: 'Chief academic officer responsible for all academic policies and activities',
          contact_info: 'provost@yale.edu',
          parent_department_id: null
        },
        { 
          name: 'General Counsel',
          description: 'Legal services for Yale University',
          contact_info: 'general.counsel@yale.edu',
          parent_department_id: null
        },
        { 
          name: 'Office of Research Administration',
          description: 'Oversight for research grants, compliance, and research activities',
          contact_info: 'research.administration@yale.edu',
          parent_department_id: 2 // Reports to Provost
        },
        { 
          name: 'Finance & Administration',
          description: 'Financial management and administrative operations',
          contact_info: 'finance@yale.edu',
          parent_department_id: null
        },
        { 
          name: 'Human Resources',
          description: 'Employment, benefits, and workforce management',
          contact_info: 'human.resources@yale.edu',
          parent_department_id: 5 // Reports to Finance & Admin
        },
        { 
          name: 'Student Affairs',
          description: 'Student services, support, and residential life',
          contact_info: 'student.affairs@yale.edu',
          parent_department_id: null
        },
        { 
          name: 'International Affairs',
          description: 'International programs, partnerships, and global initiatives',
          contact_info: 'international@yale.edu',
          parent_department_id: 2 // Reports to Provost
        },
        { 
          name: 'Yale College',
          description: 'Undergraduate education and residential colleges',
          contact_info: 'yale.college@yale.edu',
          parent_department_id: 2 // Reports to Provost
        },
        { 
          name: 'Graduate School of Arts & Sciences',
          description: 'Graduate education and research training',
          contact_info: 'graduate.school@yale.edu',
          parent_department_id: 2 // Reports to Provost
        },
        { 
          name: 'Yale School of Medicine',
          description: 'Medical education, research, and clinical practice',
          contact_info: 'medicine@yale.edu',
          parent_department_id: 2 // Reports to Provost
        },
        { 
          name: 'Yale Arts & Museums',
          description: 'Arts programs, museums, and cultural collections',
          contact_info: 'arts@yale.edu',
          parent_department_id: 2 // Reports to Provost
        },
        { 
          name: 'Athletics',
          description: 'Sports programs and physical education',
          contact_info: 'athletics@yale.edu',
          parent_department_id: 7 // Reports to Student Affairs
        }
      ];
      
      for (const dept of yaleDepartments) {
        await dbRun(
          'INSERT INTO yale_departments (name, description, contact_info, parent_department_id) VALUES (?, ?, ?, ?)', 
          [dept.name, dept.description, dept.contact_info, dept.parent_department_id]
        );
      }
      
      console.log(`Imported ${yaleDepartments.length} Yale departments`);
      
      console.log('Reference data initialized successfully');
    } else {
      console.log('Reference data already exists, skipping initialization');
      
      // Check if institution types exist and initialize if needed
      const institutionTypeCount = await dbGet('SELECT COUNT(*) as count FROM institution_types');
      if (institutionTypeCount.count === 0) {
        console.log('Initializing institution types...');
        
        // Insert institution types (prioritizing Private R1 institutions)
        const institutionTypes = [
          { name: 'Private R1 Universities', description: 'Private doctoral universities with very high research activity (annual research expenditures >$100M)', priority: 1 },
          { name: 'Private R2 Universities', description: 'Private doctoral universities with high research activity (annual research expenditures $50M-$100M)', priority: 2 },
          { name: 'Public R1 Universities', description: 'Public doctoral universities with very high research activity (annual research expenditures >$100M)', priority: 3 },
          { name: 'Public R2 Universities', description: 'Public doctoral universities with high research activity (annual research expenditures $50M-$100M)', priority: 4 },
          { name: 'Master\'s Universities', description: 'Institutions awarding at least 50 master\'s degrees annually but fewer doctoral degrees', priority: 5 },
          { name: 'Baccalaureate Colleges', description: 'Institutions where baccalaureate degrees represent at least 50% of all degrees awarded', priority: 6 },
          { name: 'Community Colleges', description: 'Associate\'s degree-granting institutions with primarily 2-year programs', priority: 7 },
          { name: 'Specialized Institutions', description: 'Institutions focused on specific fields (medical schools, art schools, etc.)', priority: 8 }
        ];
        
        for (const type of institutionTypes) {
          await dbRun('INSERT INTO institution_types (name, description) VALUES (?, ?)', 
            [type.name, type.description]);
        }
        console.log('Institution types initialized successfully');
      }
      
      // Check if functional areas exist and initialize if needed
      const functionalAreaCount = await dbGet('SELECT COUNT(*) as count FROM functional_areas');
      if (functionalAreaCount.count === 0) {
        console.log('Initializing functional areas...');
        
        // Insert functional areas
        const functionalAreas = [
          { name: 'Research Operations', description: 'Functions related to research administration, grants management, and research conduct' },
          { name: 'Academic Programs', description: 'Functions related to curriculum, instruction, and academic management' },
          { name: 'Student Aid & Financing', description: 'Functions related to financial aid, scholarships, and student financing' },
          { name: 'International Programs', description: 'Functions related to international students, study abroad, and global partnerships' },
          { name: 'Diversity Initiatives', description: 'Functions related to DEI, civil rights compliance, and inclusion programs' },
          { name: 'Regulatory Compliance', description: 'Functions related to federal and state regulatory requirements' },
          { name: 'Workforce & Employment', description: 'Functions related to faculty/staff employment, labor relations, and HR' },
          { name: 'Public-Private Partnerships', description: 'Functions related to industry collaboration and external partnerships' },
          { name: 'Administrative Operations', description: 'Functions related to institutional management and daily operations' },
          { name: 'Financial Operations', description: 'Functions related to institutional finance, accounting, and budget' },
          { name: 'Legal Affairs', description: 'Functions related to legal compliance and risk management' },
          { name: 'Technology Infrastructure', description: 'Functions related to IT systems, data management, and digital resources' }
        ];
        
        for (const area of functionalAreas) {
          await dbRun('INSERT INTO functional_areas (name, description) VALUES (?, ?)', 
            [area.name, area.description]);
        }
        console.log('Functional areas initialized successfully');
      }
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