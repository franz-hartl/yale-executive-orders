/**
 * database_setup_with_knowledge.js
 * 
 * Enhanced version of database_setup.js that includes the knowledge management tables.
 * This script initializes and updates the SQLite database with executive order data.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Import schemas
const knowledgeSchema = require('./models/knowledge_schema');

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

// Create the knowledge management tables
async function createKnowledgeTables() {
  try {
    console.log('Creating knowledge management tables...');
    
    // Create knowledge_facts table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS knowledge_facts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        fact_type TEXT NOT NULL,
        fact_value TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES executive_orders(id) ON DELETE CASCADE
      )
    `);
    
    // Create knowledge_sources table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS knowledge_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fact_id INTEGER NOT NULL,
        source_id INTEGER NOT NULL,
        source_context TEXT,
        extraction_date TIMESTAMP,
        extraction_method TEXT,
        extraction_metadata TEXT,
        FOREIGN KEY (fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE,
        FOREIGN KEY (source_id) REFERENCES source_metadata(id) ON DELETE CASCADE
      )
    `);
    
    // Create knowledge_relationships table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS knowledge_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fact_id INTEGER NOT NULL,
        related_fact_id INTEGER NOT NULL,
        relationship_type TEXT NOT NULL,
        description TEXT,
        confidence REAL DEFAULT 0.5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE,
        FOREIGN KEY (related_fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE
      )
    `);
    
    // Create knowledge_yale_impacts table
    await dbRun(`
      CREATE TABLE IF NOT EXISTS knowledge_yale_impacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fact_id INTEGER NOT NULL,
        yale_department_id INTEGER,
        impact_level TEXT,
        impact_description TEXT,
        analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        analyst TEXT,
        FOREIGN KEY (fact_id) REFERENCES knowledge_facts(id) ON DELETE CASCADE,
        FOREIGN KEY (yale_department_id) REFERENCES yale_departments(id) ON DELETE SET NULL
      )
    `);
    
    // Create indexes for performance
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_knowledge_facts_order_id ON knowledge_facts(order_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_knowledge_facts_fact_type ON knowledge_facts(fact_type)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_knowledge_sources_fact_id ON knowledge_sources(fact_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_knowledge_sources_source_id ON knowledge_sources(source_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_fact_id ON knowledge_relationships(fact_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_related_fact_id ON knowledge_relationships(related_fact_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_knowledge_yale_impacts_fact_id ON knowledge_yale_impacts(fact_id)`);
    await dbRun(`CREATE INDEX IF NOT EXISTS idx_knowledge_yale_impacts_department_id ON knowledge_yale_impacts(yale_department_id)`);
    
    console.log('Knowledge management tables created successfully');
  } catch (err) {
    console.error('Error creating knowledge tables:', err);
    throw err;
  }
}

// Create tables if they don't exist (core tables from the original script)
async function createCoreTables() {
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
    
    // Create source metadata tables (needed for knowledge management)
    await dbRun(`
      CREATE TABLE IF NOT EXISTS source_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_name TEXT NOT NULL,
        source_url TEXT,
        last_updated TEXT,
        fetch_frequency TEXT,
        description TEXT
      )
    `);
    
    await dbRun(`
      CREATE TABLE IF NOT EXISTS order_sources (
        order_id INTEGER,
        source_id INTEGER,
        external_reference_id TEXT,
        source_specific_data TEXT,
        fetch_date TEXT,
        PRIMARY KEY (order_id, source_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (source_id) REFERENCES source_metadata(id)
      )
    `);
    
    console.log('Core database tables created successfully');
    
  } catch (err) {
    console.error('Error creating core tables:', err);
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
        }
      ];
      
      for (const dept of yaleDepartments) {
        await dbRun(
          'INSERT INTO yale_departments (name, description, contact_info, parent_department_id) VALUES (?, ?, ?, ?)', 
          [dept.name, dept.description, dept.contact_info, dept.parent_department_id]
        );
      }
      
      // Initialize source metadata for knowledge management
      const sources = [
        {
          source_name: 'Federal Register',
          source_url: 'https://www.federalregister.gov/',
          description: 'The official source for executive orders and other presidential documents',
          fetch_frequency: 'daily'
        },
        {
          source_name: 'White House',
          source_url: 'https://www.whitehouse.gov/briefing-room/presidential-actions/',
          description: 'Official White House releases of executive orders and related materials',
          fetch_frequency: 'daily'
        },
        {
          source_name: 'Council on Governmental Relations (COGR)',
          source_url: 'https://www.cogr.edu/',
          description: 'Analysis of executive orders from a research university perspective',
          fetch_frequency: 'weekly'
        },
        {
          source_name: 'American Council on Education (ACE)',
          source_url: 'https://www.acenet.edu/',
          description: 'Higher education sector-wide analyses of executive orders',
          fetch_frequency: 'weekly'
        },
        {
          source_name: 'National Science Foundation (NSF)',
          source_url: 'https://www.nsf.gov/',
          description: 'Implementation guidance for research grants related to executive orders',
          fetch_frequency: 'weekly'
        },
        {
          source_name: 'National Institutes of Health (NIH)',
          source_url: 'https://www.nih.gov/',
          description: 'Policy notices for biomedical research related to executive orders',
          fetch_frequency: 'weekly'
        },
        {
          source_name: 'Yale Analysis',
          source_url: 'internal',
          description: 'Yale-specific analysis and interpretation of executive orders',
          fetch_frequency: 'as needed'
        }
      ];
      
      for (const source of sources) {
        await dbRun(
          'INSERT INTO source_metadata (source_name, source_url, description, fetch_frequency) VALUES (?, ?, ?, ?)',
          [source.source_name, source.source_url, source.description, source.fetch_frequency]
        );
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
        
        // Now add sample knowledge facts for the first order
        if (order.order_number === "EO 14110") {
          // First, add order to sources
          const federalRegisterSource = await dbGet('SELECT id FROM source_metadata WHERE source_name = ?', ['Federal Register']);
          if (federalRegisterSource) {
            await dbRun('INSERT INTO order_sources (order_id, source_id, fetch_date) VALUES (?, ?, ?)', 
              [orderId, federalRegisterSource.id, new Date().toISOString()]);
          }
          
          // Add a sample date fact
          await dbRun(`
            INSERT INTO knowledge_facts (order_id, fact_type, fact_value, confidence)
            VALUES (?, ?, ?, ?)
          `, [
            orderId, 
            knowledgeSchema.factTypes.DATE, 
            JSON.stringify({
              date: "2025-03-01",
              dateType: "effective",
              description: "Full implementation deadline for AI safety requirements",
              isExplicit: true
            }),
            0.95
          ]);
          
          // Add a sample requirement fact
          const requirementResult = await dbRun(`
            INSERT INTO knowledge_facts (order_id, fact_type, fact_value, confidence)
            VALUES (?, ?, ?, ?)
          `, [
            orderId, 
            knowledgeSchema.factTypes.REQUIREMENT, 
            JSON.stringify({
              requirementType: "compliance",
              description: "Universities must submit an AI safety implementation plan",
              targetEntities: ["universities", "research institutions"],
              deadline: "2025-06-30",
              priority: "high"
            }),
            0.9
          ]);
          
          // Link fact to source
          if (federalRegisterSource && requirementResult.lastID) {
            await dbRun(`
              INSERT INTO knowledge_sources (fact_id, source_id, source_context, extraction_method)
              VALUES (?, ?, ?, ?)
            `, [
              requirementResult.lastID,
              federalRegisterSource.id,
              "Section 3, paragraph 2",
              "manual"
            ]);
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
    console.log('Starting enhanced database setup with knowledge management...');
    
    // Create core tables if they don't exist
    await createCoreTables();
    
    // Create knowledge management tables
    await createKnowledgeTables();
    
    // Initialize reference data
    await initializeReferenceData();
    
    // Import sample data if needed
    await importSampleData();
    
    console.log('Enhanced database setup completed successfully');
    
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