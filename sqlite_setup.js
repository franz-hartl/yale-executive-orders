const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Database file path
const dbFile = path.join(__dirname, 'executive_orders.db');

// Create or open database
const db = new sqlite3.Database(dbFile);

// Initialize database
function setupDatabase() {
  console.log('Setting up SQLite database...');
  
  // Create tables in a transaction
  db.serialize(() => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    // Create executive orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS executive_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        signing_date DATE,
        publication_date DATE,
        president TEXT,
        summary TEXT,
        full_text TEXT,
        url TEXT,
        impact_level TEXT,
        status TEXT DEFAULT 'Active',
        implementation_phase TEXT,
        added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create categories table
    db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      )
    `);
    
    // Create order-categories junction table
    db.run(`
      CREATE TABLE IF NOT EXISTS order_categories (
        order_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (order_id, category_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      )
    `);
    
    // Create impact areas table
    db.run(`
      CREATE TABLE IF NOT EXISTS impact_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      )
    `);
    
    // Create order-impact areas junction table
    db.run(`
      CREATE TABLE IF NOT EXISTS order_impact_areas (
        order_id INTEGER,
        impact_area_id INTEGER,
        PRIMARY KEY (order_id, impact_area_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (impact_area_id) REFERENCES impact_areas(id) ON DELETE CASCADE
      )
    `);
    
    // Create university impact areas table
    db.run(`
      CREATE TABLE IF NOT EXISTS university_impact_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT
      )
    `);
    
    // Create order-university impact areas junction table
    db.run(`
      CREATE TABLE IF NOT EXISTS order_university_impact_areas (
        order_id INTEGER,
        university_impact_area_id INTEGER,
        notes TEXT,
        PRIMARY KEY (order_id, university_impact_area_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (university_impact_area_id) REFERENCES university_impact_areas(id) ON DELETE CASCADE
      )
    `);
    
    // Create compliance actions table
    db.run(`
      CREATE TABLE IF NOT EXISTS compliance_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        deadline DATE,
        status TEXT DEFAULT 'Pending',
        priority TEXT,
        responsible_office TEXT,
        FOREIGN KEY (order_id) REFERENCES executive_orders(id) ON DELETE CASCADE
      )
    `);

    // Create search tables (using FTS5 for full text search)
    db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS executive_orders_fts USING fts5(
        order_number, 
        title, 
        summary, 
        full_text, 
        content='executive_orders', 
        content_rowid='id'
      )
    `);

    // Create triggers to maintain FTS index
    db.run(`
      CREATE TRIGGER IF NOT EXISTS executive_orders_ai AFTER INSERT ON executive_orders BEGIN
        INSERT INTO executive_orders_fts(rowid, order_number, title, summary, full_text)
        VALUES (new.id, new.order_number, new.title, new.summary, new.full_text);
      END
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS executive_orders_ad AFTER DELETE ON executive_orders BEGIN
        INSERT INTO executive_orders_fts(executive_orders_fts, rowid, order_number, title, summary, full_text)
        VALUES('delete', old.id, old.order_number, old.title, old.summary, old.full_text);
      END
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS executive_orders_au AFTER UPDATE ON executive_orders BEGIN
        INSERT INTO executive_orders_fts(executive_orders_fts, rowid, order_number, title, summary, full_text)
        VALUES('delete', old.id, old.order_number, old.title, old.summary, old.full_text);
        INSERT INTO executive_orders_fts(rowid, order_number, title, summary, full_text)
        VALUES (new.id, new.order_number, new.title, new.summary, new.full_text);
      END
    `);

    console.log('Database schema created successfully');
    
    // Insert predefined university impact areas
    const universityImpactAreas = [
      { name: 'Research Funding', description: 'Impacts on federal research grants, funding priorities, and research administration' },
      { name: 'Student Aid & Higher Education Finance', description: 'Changes to student financial aid, federal student loans, and university funding mechanisms' },
      { name: 'Administrative Compliance', description: 'Compliance requirements, reporting mandates, and regulatory changes affecting university administration' },
      { name: 'Workforce & Employment Policy', description: 'Impacts on faculty, staff employment, labor relations, and workforce diversity' },
      { name: 'Public-Private Partnerships', description: 'Changes affecting university-industry collaborations, tech transfer, and economic development initiatives' }
    ];
    
    // Insert predefined categories
    const categories = [
      { name: 'Technology', description: 'Executive orders related to technology policy, digital infrastructure, and tech regulation' },
      { name: 'Education', description: 'Orders specifically addressing educational institutions, pedagogy, and academic programs' },
      { name: 'Finance', description: 'Orders affecting financial regulations, funding mechanisms, and economic policy' },
      { name: 'Healthcare', description: 'Healthcare policy, medical research, and public health directives' },
      { name: 'Research', description: 'Scientific research priorities, research security, and innovation policy' },
      { name: 'Immigration', description: 'Immigration policies affecting international students, scholars, and academic mobility' },
      { name: 'National Security', description: 'Security policies, export controls, and sensitive research protections' },
      { name: 'Diversity', description: 'Initiatives related to diversity, equity, inclusion, and civil rights' },
      { name: 'Environment', description: 'Climate policy, environmental regulations, and sustainability initiatives' },
      { name: 'Industry', description: 'Business relations, economic development, and industry partnerships' }
    ];
    
    // Insert predefined impact areas
    const impactAreas = [
      { name: 'Research', description: 'Impacts on research activities and scholarly work' },
      { name: 'Compliance', description: 'Regulatory compliance and legal requirements' },
      { name: 'Funding', description: 'Financial impacts and funding mechanisms' },
      { name: 'Policy', description: 'Policy development and governance implications' },
      { name: 'Student Aid', description: 'Financial assistance and support for students' },
      { name: 'Economic Development', description: 'Business growth and economic initiatives' },
      { name: 'Regulatory', description: 'Regulatory framework and oversight' },
      { name: 'Operational', description: 'Day-to-day operations and administrative functions' }
    ];
    
    // Insert university impact areas
    const uiaInsertStmt = db.prepare('INSERT OR IGNORE INTO university_impact_areas (name, description) VALUES (?, ?)');
    universityImpactAreas.forEach(area => {
      uiaInsertStmt.run(area.name, area.description);
    });
    uiaInsertStmt.finalize();
    
    // Insert categories
    const catInsertStmt = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
    categories.forEach(category => {
      catInsertStmt.run(category.name, category.description);
    });
    catInsertStmt.finalize();
    
    // Insert impact areas
    const iaInsertStmt = db.prepare('INSERT OR IGNORE INTO impact_areas (name, description) VALUES (?, ?)');
    impactAreas.forEach(area => {
      iaInsertStmt.run(area.name, area.description);
    });
    iaInsertStmt.finalize();
    
    console.log('Predefined data inserted successfully');
  });
}

// Import data from CSV file
function importFromCSV(csvFilePath) {
  console.log(`Importing data from ${csvFilePath}...`);
  
  const results = [];
  
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
      console.log(`Parsed ${results.length} orders from CSV`);
      
      // Start a transaction
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const insertOrderStmt = db.prepare(`
          INSERT OR IGNORE INTO executive_orders 
          (order_number, title, signing_date, publication_date, president, summary, url) 
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        // Process each order
        results.forEach(order => {
          // Insert the order
          insertOrderStmt.run(
            order['Executive Order Number'] || order['order_number'],
            order['Title'] || order['title'],
            order['Signing Date'] || order['signing_date'],
            order['Publication Date'] || order['publication_date'] || order['Signing Date'] || order['signing_date'],
            order['President'] || order['president'],
            order['Summary'] || order['summary'],
            order['url'] || null
          );
        });
        
        insertOrderStmt.finalize();
        
        // Commit transaction
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err.message);
            return;
          }
          console.log('CSV import completed successfully');
          
          // Now add some categorization
          categorizeExecutiveOrders();
        });
      });
    });
}

// Categorize executive orders based on keywords
function categorizeExecutiveOrders() {
  console.log('Categorizing executive orders...');
  
  db.all('SELECT id, title, summary FROM executive_orders', [], (err, orders) => {
    if (err) {
      console.error('Error fetching orders for categorization:', err.message);
      return;
    }
    
    // Define keywords for categorization
    const categoryKeywords = {
      'Technology': ['technology', 'digital', 'cyber', 'internet', 'innovation', 'artificial intelligence', 'AI', 'machine learning', 'computing'],
      'Education': ['education', 'student', 'school', 'university', 'college', 'academic', 'learning', 'teaching'],
      'Finance': ['finance', 'banking', 'economic', 'economy', 'budget', 'tax', 'fiscal', 'monetary', 'treasury', 'investment'],
      'Healthcare': ['health', 'medical', 'healthcare', 'hospital', 'patient', 'care', 'disease', 'treatment', 'medicine', 'public health'],
      'Research': ['research', 'science', 'scientific', 'laboratory', 'innovation', 'study', 'academic research', 'university research'],
      'Immigration': ['immigration', 'visa', 'foreign national', 'international student', 'border', 'migrant', 'refugee'],
      'National Security': ['security', 'defense', 'military', 'intelligence', 'cybersecurity', 'homeland', 'terrorism', 'national defense'],
      'Diversity': ['diversity', 'equity', 'inclusion', 'civil rights', 'discrimination', 'equal opportunity', 'affirmative action'],
      'Environment': ['environment', 'climate', 'sustainability', 'emission', 'pollution', 'conservation', 'renewable', 'green'],
      'Industry': ['industry', 'business', 'manufacturing', 'commerce', 'trade', 'corporation', 'private sector', 'enterprise']
    };
    
    const impactKeywords = {
      'Research': ['research grant', 'scientific work', 'laboratory', 'academic research', 'research project', 'study', 'investigation'],
      'Compliance': ['compliance', 'regulation', 'requirement', 'standard', 'rule', 'guideline', 'directive', 'mandate', 'report'],
      'Funding': ['funding', 'grant', 'financial', 'budget', 'appropriation', 'allocation', 'resources', 'investment'],
      'Policy': ['policy', 'strategy', 'plan', 'initiative', 'program', 'governance', 'administration', 'oversight'],
      'Student Aid': ['student aid', 'financial aid', 'scholarship', 'grant', 'loan', 'tuition', 'education finance'],
      'Economic Development': ['economic', 'growth', 'development', 'investment', 'innovation', 'business', 'industry'],
      'Regulatory': ['regulatory', 'regulation', 'rule', 'compliance', 'oversight', 'governance', 'enforcement'],
      'Operational': ['operation', 'management', 'procedure', 'process', 'administration', 'implementation', 'execution']
    };
    
    const universityKeywords = {
      'Research Funding': ['research grant', 'research funding', 'scientific funding', 'NSF', 'NIH', 'federal research', 'academic research'],
      'Student Aid & Higher Education Finance': ['student loan', 'financial aid', 'tuition', 'Pell Grant', 'education finance', 'student debt'],
      'Administrative Compliance': ['compliance', 'Title IX', 'reporting', 'transparency', 'regulation', 'administrative', 'governance'],
      'Workforce & Employment Policy': ['employment', 'workforce', 'faculty', 'staff', 'labor', 'job', 'HR', 'human resources', 'visa'],
      'Public-Private Partnerships': ['partnership', 'collaboration', 'industry partnership', 'private sector', 'commercialization', 'tech transfer']
    };
    
    // Process each order
    orders.forEach(order => {
      const content = `${order.title} ${order.summary}`.toLowerCase();
      
      // Categorize by primary category
      let primaryCategory = null;
      let highestMatchCount = 0;
      
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        let matchCount = 0;
        keywords.forEach(keyword => {
          if (content.includes(keyword.toLowerCase())) {
            matchCount++;
          }
        });
        
        if (matchCount > highestMatchCount) {
          highestMatchCount = matchCount;
          primaryCategory = category;
        }
      });
      
      if (primaryCategory) {
        // Lookup the category ID
        db.get('SELECT id FROM categories WHERE name = ?', [primaryCategory], (err, categoryRow) => {
          if (err || !categoryRow) {
            console.error(`Error or missing category: ${primaryCategory}`, err ? err.message : 'Category not found');
            return;
          }
          
          // Insert into order_categories
          db.run('INSERT OR IGNORE INTO order_categories (order_id, category_id) VALUES (?, ?)', [order.id, categoryRow.id]);
        });
      }
      
      // Categorize by impact areas
      Object.entries(impactKeywords).forEach(([impact, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword.toLowerCase())) {
            // Lookup the impact area ID
            db.get('SELECT id FROM impact_areas WHERE name = ?', [impact], (err, impactRow) => {
              if (err || !impactRow) {
                console.error(`Error or missing impact area: ${impact}`, err ? err.message : 'Impact area not found');
                return;
              }
              
              // Insert into order_impact_areas
              db.run('INSERT OR IGNORE INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', [order.id, impactRow.id]);
            });
          }
        });
      });
      
      // Categorize by university impact areas
      Object.entries(universityKeywords).forEach(([area, keywords]) => {
        keywords.forEach(keyword => {
          if (content.includes(keyword.toLowerCase())) {
            // Lookup the university impact area ID
            db.get('SELECT id FROM university_impact_areas WHERE name = ?', [area], (err, areaRow) => {
              if (err || !areaRow) {
                console.error(`Error or missing university impact area: ${area}`, err ? err.message : 'University impact area not found');
                return;
              }
              
              // Insert into order_university_impact_areas
              db.run('INSERT OR IGNORE INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)', [order.id, areaRow.id]);
            });
          }
        });
      });
    });
    
    console.log('Categorization completed');
  });
}

// Main execution
setupDatabase();

// Check if financial_executive_orders.csv exists and import it
const csvFilePath = path.join(__dirname, 'financial_executive_orders.csv');
if (fs.existsSync(csvFilePath)) {
  importFromCSV(csvFilePath);
} else {
  console.log('CSV file not found:', csvFilePath);
}

module.exports = db;