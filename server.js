const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Setup SQLite database
const dbFile = path.join(__dirname, 'executive_orders.db');
const dbExists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);

// Initialize database if it doesn't exist
if (!dbExists) {
  console.log('Creating database...');
  
  db.serialize(() => {
    // Create executive orders table
    db.run(`
      CREATE TABLE executive_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE,
        title TEXT NOT NULL,
        signing_date TEXT,
        president TEXT,
        summary TEXT,
        url TEXT,
        impact_level TEXT,
        full_text TEXT,
        status TEXT DEFAULT 'Active'
      )
    `);
    
    // Create categories tables
    db.run(`
      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
      )
    `);
    
    db.run(`
      CREATE TABLE order_categories (
        order_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (order_id, category_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);
    
    // Create impact areas tables
    db.run(`
      CREATE TABLE impact_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
      )
    `);
    
    db.run(`
      CREATE TABLE order_impact_areas (
        order_id INTEGER,
        impact_area_id INTEGER,
        PRIMARY KEY (order_id, impact_area_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (impact_area_id) REFERENCES impact_areas(id)
      )
    `);
    
    // Create university impact areas tables
    db.run(`
      CREATE TABLE university_impact_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE
      )
    `);
    
    db.run(`
      CREATE TABLE order_university_impact_areas (
        order_id INTEGER,
        university_impact_area_id INTEGER,
        PRIMARY KEY (order_id, university_impact_area_id),
        FOREIGN KEY (order_id) REFERENCES executive_orders(id),
        FOREIGN KEY (university_impact_area_id) REFERENCES university_impact_areas(id)
      )
    `);
    
    // Insert university impact areas
    const universityImpactAreas = [
      'Research Funding',
      'Student Aid & Higher Education Finance',
      'Administrative Compliance',
      'Workforce & Employment Policy',
      'Public-Private Partnerships'
    ];
    
    universityImpactAreas.forEach(area => {
      db.run('INSERT INTO university_impact_areas (name) VALUES (?)', [area]);
    });
    
    // Insert categories
    const categories = [
      'Technology', 
      'Education', 
      'Finance', 
      'Healthcare', 
      'Research', 
      'Immigration', 
      'National Security',
      'Diversity',
      'Environment',
      'Industry'
    ];
    
    categories.forEach(category => {
      db.run('INSERT INTO categories (name) VALUES (?)', [category]);
    });
    
    // Insert impact areas
    const impactAreas = [
      'Research', 
      'Compliance', 
      'Funding', 
      'Policy', 
      'Student Aid', 
      'Economic Development',
      'Regulatory',
      'Operational'
    ];
    
    impactAreas.forEach(area => {
      db.run('INSERT INTO impact_areas (name) VALUES (?)', [area]);
    });
    
    // Insert sample executive orders
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
    sampleOrders.forEach(order => {
      db.run(
        'INSERT INTO executive_orders (order_number, title, signing_date, president, summary, url, impact_level) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [order.order_number, order.title, order.signing_date, order.president, order.summary, order.url, order.impact_level],
        function(err) {
          if (err) {
            console.error('Error inserting order:', err);
            return;
          }
          
          const orderId = this.lastID;
          
          // Insert categories
          order.categories.forEach(categoryName => {
            db.get('SELECT id FROM categories WHERE name = ?', [categoryName], (err, category) => {
              if (category) {
                db.run('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', [orderId, category.id]);
              }
            });
          });
          
          // Insert impact areas
          order.impact_areas.forEach(areaName => {
            db.get('SELECT id FROM impact_areas WHERE name = ?', [areaName], (err, area) => {
              if (area) {
                db.run('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', [orderId, area.id]);
              }
            });
          });
          
          // Insert university impact areas
          order.university_impact_areas.forEach(areaName => {
            db.get('SELECT id FROM university_impact_areas WHERE name = ?', [areaName], (err, area) => {
              if (area) {
                db.run('INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)', [orderId, area.id]);
              }
            });
          });
        }
      );
    });
  });
  
  console.log('Database initialization complete');
}

// API endpoint to get system information
app.get('/api/system-info', (req, res) => {
  return res.json({
    topicName: 'Yale Executive Order Analysis',
    topicDescription: 'This system helps Yale administrators track and analyze executive orders affecting university operations.',
    usingDatabase: true,
    databaseType: 'SQLite'
  });
});

// API endpoint to get all executive orders with full relationships
app.get('/api/executive-orders', (req, res) => {
  db.all(`
    SELECT 
      eo.id,
      eo.order_number,
      eo.title,
      eo.signing_date,
      eo.president,
      eo.summary,
      eo.url,
      eo.impact_level,
      eo.status
    FROM 
      executive_orders eo
    ORDER BY 
      eo.signing_date DESC
  `, [], (err, orders) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Process each order to get its relationships
    const processOrders = orders.map(order => {
      return new Promise((resolve) => {
        // Get categories
        db.all(`
          SELECT c.name
          FROM categories c
          JOIN order_categories oc ON c.id = oc.category_id
          WHERE oc.order_id = ?
        `, [order.id], (err, categories) => {
          if (err) {
            order.categories = [];
          } else {
            order.categories = categories.map(c => c.name);
          }
          
          // Get impact areas
          db.all(`
            SELECT ia.name
            FROM impact_areas ia
            JOIN order_impact_areas oia ON ia.id = oia.impact_area_id
            WHERE oia.order_id = ?
          `, [order.id], (err, impactAreas) => {
            if (err) {
              order.impact_areas = [];
            } else {
              order.impact_areas = impactAreas.map(ia => ia.name);
            }
            
            // Get university impact areas
            db.all(`
              SELECT uia.name
              FROM university_impact_areas uia
              JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
              WHERE ouia.order_id = ?
            `, [order.id], (err, universityImpactAreas) => {
              if (err) {
                order.university_impact_areas = [];
              } else {
                order.university_impact_areas = universityImpactAreas.map(uia => uia.name);
              }
              
              resolve(order);
            });
          });
        });
      });
    });
    
    Promise.all(processOrders)
      .then(completedOrders => {
        res.json(completedOrders);
      })
      .catch(error => {
        res.status(500).json({ error: error.message });
      });
  });
});

// API endpoint to get summary statistics
app.get('/api/statistics', (req, res) => {
  const stats = {};
  
  // Get count by impact level
  db.all(`
    SELECT impact_level, COUNT(*) as count
    FROM executive_orders
    GROUP BY impact_level
    ORDER BY 
      CASE 
        WHEN impact_level = 'Critical' THEN 1
        WHEN impact_level = 'High' THEN 2
        WHEN impact_level = 'Medium' THEN 3
        WHEN impact_level = 'Low' THEN 4
        ELSE 5
      END
  `, [], (err, impactLevels) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    stats.impactLevels = impactLevels;
    
    // Get count by university impact area
    db.all(`
      SELECT uia.name, COUNT(*) as count
      FROM university_impact_areas uia
      JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
      GROUP BY uia.name
      ORDER BY count DESC
    `, [], (err, universityImpactAreas) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      stats.universityImpactAreas = universityImpactAreas;
      
      // Get count by category
      db.all(`
        SELECT c.name, COUNT(*) as count
        FROM categories c
        JOIN order_categories oc ON c.id = oc.category_id
        GROUP BY c.name
        ORDER BY count DESC
      `, [], (err, categories) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        stats.categories = categories;
        
        // Get count by month/year
        db.all(`
          SELECT 
            strftime('%Y-%m', signing_date) as month,
            COUNT(*) as count
          FROM executive_orders
          GROUP BY month
          ORDER BY month
        `, [], (err, timeline) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          stats.timeline = timeline;
          
          // Return complete statistics
          res.json(stats);
        });
      });
    });
  });
});

// API endpoint to get a single executive order by ID
app.get('/api/executive-orders/:id', (req, res) => {
  const id = req.params.id;
  
  db.get(`
    SELECT *
    FROM executive_orders
    WHERE id = ?
  `, [id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Executive order not found' });
    }
    
    // Get categories
    db.all(`
      SELECT c.name
      FROM categories c
      JOIN order_categories oc ON c.id = oc.category_id
      WHERE oc.order_id = ?
    `, [id], (err, categories) => {
      if (err) {
        order.categories = [];
      } else {
        order.categories = categories.map(c => c.name);
      }
      
      // Get impact areas
      db.all(`
        SELECT ia.name
        FROM impact_areas ia
        JOIN order_impact_areas oia ON ia.id = oia.impact_area_id
        WHERE oia.order_id = ?
      `, [id], (err, impactAreas) => {
        if (err) {
          order.impact_areas = [];
        } else {
          order.impact_areas = impactAreas.map(ia => ia.name);
        }
        
        // Get university impact areas
        db.all(`
          SELECT uia.name
          FROM university_impact_areas uia
          JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
          WHERE ouia.order_id = ?
        `, [id], (err, universityImpactAreas) => {
          if (err) {
            order.university_impact_areas = [];
          } else {
            order.university_impact_areas = universityImpactAreas.map(uia => uia.name);
          }
          
          res.json(order);
        });
      });
    });
  });
});

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});