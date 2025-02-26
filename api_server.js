const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const { writeFileSync } = require('fs');
require('dotenv').config();

// Import the database
const db = require('./sqlite_setup');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// Get all executive orders with optional filtering
app.get('/api/executive-orders', (req, res) => {
  const {
    category,
    impact_area,
    university_impact_area,
    impact_level,
    president,
    search,
    order_by = 'signing_date',
    order_dir = 'desc',
    limit = 100,
    offset = 0
  } = req.query;
  
  // Start building the query
  let query = `
    SELECT eo.id, eo.order_number, eo.title, eo.signing_date, eo.president, 
           eo.summary, eo.url, eo.impact_level, eo.status, eo.implementation_phase
    FROM executive_orders eo
  `;
  
  const queryParams = [];
  const conditions = [];
  
  // Filter by category
  if (category) {
    query += `
      JOIN order_categories oc ON eo.id = oc.order_id
      JOIN categories c ON oc.category_id = c.id
    `;
    conditions.push('c.name = ?');
    queryParams.push(category);
  }
  
  // Filter by impact area
  if (impact_area) {
    query += `
      JOIN order_impact_areas oia ON eo.id = oia.order_id
      JOIN impact_areas ia ON oia.impact_area_id = ia.id
    `;
    conditions.push('ia.name = ?');
    queryParams.push(impact_area);
  }
  
  // Filter by university impact area
  if (university_impact_area) {
    query += `
      JOIN order_university_impact_areas ouia ON eo.id = ouia.order_id
      JOIN university_impact_areas uia ON ouia.university_impact_area_id = uia.id
    `;
    conditions.push('uia.name = ?');
    queryParams.push(university_impact_area);
  }
  
  // Filter by impact level
  if (impact_level) {
    conditions.push('eo.impact_level = ?');
    queryParams.push(impact_level);
  }
  
  // Filter by president
  if (president) {
    conditions.push('eo.president = ?');
    queryParams.push(president);
  }
  
  // Search text
  if (search) {
    query += `
      JOIN executive_orders_fts fts ON eo.id = fts.rowid
    `;
    conditions.push('executive_orders_fts MATCH ?');
    queryParams.push(search + '*'); // Use prefix search
  }
  
  // Add WHERE clause if we have conditions
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Add GROUP BY to handle joins properly
  query += ' GROUP BY eo.id ';
  
  // Add ORDER BY clause
  const validColumns = ['id', 'order_number', 'title', 'signing_date', 'president', 'impact_level'];
  const validDirections = ['asc', 'desc'];
  
  const safeOrderBy = validColumns.includes(order_by) ? order_by : 'signing_date';
  const safeOrderDir = validDirections.includes(order_dir.toLowerCase()) ? order_dir.toLowerCase() : 'desc';
  
  query += ` ORDER BY eo.${safeOrderBy} ${safeOrderDir}`;
  
  // Add LIMIT and OFFSET
  query += ' LIMIT ? OFFSET ?';
  queryParams.push(Number(limit), Number(offset));
  
  console.log('Query:', query);
  console.log('Params:', queryParams);
  
  // Execute the query
  db.all(query, queryParams, (err, orders) => {
    if (err) {
      console.error('Error fetching executive orders:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    // Fetch additional information for each order
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
        console.error('Error processing orders:', error);
        res.status(500).json({ error: 'Error processing orders: ' + error.message });
      });
  });
});

// Get a single executive order by ID
app.get('/api/executive-orders/:id', (req, res) => {
  const id = req.params.id;
  
  db.get('SELECT * FROM executive_orders WHERE id = ?', [id], (err, order) => {
    if (err) {
      console.error('Error fetching executive order:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
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
          SELECT uia.name, uia.description, ouia.notes
          FROM university_impact_areas uia
          JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
          WHERE ouia.order_id = ?
        `, [id], (err, universityImpactAreas) => {
          if (err) {
            order.university_impact_areas = [];
          } else {
            order.university_impact_areas = universityImpactAreas.map(uia => ({
              name: uia.name,
              description: uia.description,
              notes: uia.notes
            }));
          }
          
          // Get compliance actions
          db.all(`
            SELECT * FROM compliance_actions
            WHERE order_id = ?
            ORDER BY deadline ASC
          `, [id], (err, complianceActions) => {
            if (err) {
              order.compliance_actions = [];
            } else {
              order.compliance_actions = complianceActions;
            }
            
            // Include has_plain_language_summary flag - safely check if column exists first
            try {
              order.has_plain_language_summary = order.hasOwnProperty('plain_language_summary') && 
                                                 order.plain_language_summary !== null && 
                                                 order.plain_language_summary !== '';
            } catch (e) {
              order.has_plain_language_summary = false;
            }
            
            res.json(order);
          });
        });
      });
    });
  });
});

// Get the plain language summary for an executive order
app.get('/api/executive-orders/:id/plain-summary', (req, res) => {
  const id = req.params.id;
  
  // First check if the plain_language_summary column exists
  db.all("PRAGMA table_info(executive_orders)", [], (err, columns) => {
    if (err) {
      console.error('Error checking table schema:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    const hasPlainSummaryColumn = columns.some(col => col.name === 'plain_language_summary');
    
    if (!hasPlainSummaryColumn) {
      console.error('Plain language summary column does not exist in the database schema');
      return res.status(404).json({ error: 'Plain language summaries are not available. Please run generate_plain_summaries.js first.' });
    }
    
    // If column exists, proceed with fetching the summary
    db.get('SELECT plain_language_summary FROM executive_orders WHERE id = ?', [id], (err, result) => {
      if (err) {
        console.error('Error fetching plain language summary:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      if (!result) {
        return res.status(404).json({ error: 'Executive order not found' });
      }
      
      if (!result.plain_language_summary) {
        return res.status(404).json({ error: 'Plain language summary not available for this executive order' });
      }
      
      res.json({ 
        id: id,
        plain_language_summary: result.plain_language_summary
      });
    });
  });
});

// Create a new executive order
app.post('/api/executive-orders', (req, res) => {
  const {
    order_number,
    title,
    signing_date,
    publication_date,
    president,
    summary,
    full_text,
    url,
    impact_level,
    status,
    implementation_phase,
    categories,
    impact_areas,
    university_impact_areas
  } = req.body;
  
  // Validate required fields
  if (!order_number || !title) {
    return res.status(400).json({ error: 'Order number and title are required' });
  }
  
  // Insert executive order
  db.run(
    `INSERT INTO executive_orders 
     (order_number, title, signing_date, publication_date, president, summary, full_text, url, impact_level, status, implementation_phase)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [order_number, title, signing_date, publication_date, president, summary, full_text, url, impact_level, status, implementation_phase],
    function(err) {
      if (err) {
        console.error('Error creating executive order:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      const orderId = this.lastID;
      
      // Process categories
      if (categories && Array.isArray(categories)) {
        const processCategories = categories.map(categoryName => {
          return new Promise((resolve, reject) => {
            db.get('SELECT id FROM categories WHERE name = ?', [categoryName], (err, category) => {
              if (err) {
                return reject(err);
              }
              
              if (category) {
                db.run('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', [orderId, category.id], (err) => {
                  if (err) {
                    return reject(err);
                  }
                  resolve();
                });
              } else {
                resolve(); // Category not found, just skip
              }
            });
          });
        });
        
        Promise.all(processCategories)
          .catch(error => {
            console.error('Error linking categories:', error);
          });
      }
      
      // Process impact areas
      if (impact_areas && Array.isArray(impact_areas)) {
        const processImpactAreas = impact_areas.map(areaName => {
          return new Promise((resolve, reject) => {
            db.get('SELECT id FROM impact_areas WHERE name = ?', [areaName], (err, area) => {
              if (err) {
                return reject(err);
              }
              
              if (area) {
                db.run('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', [orderId, area.id], (err) => {
                  if (err) {
                    return reject(err);
                  }
                  resolve();
                });
              } else {
                resolve(); // Impact area not found, just skip
              }
            });
          });
        });
        
        Promise.all(processImpactAreas)
          .catch(error => {
            console.error('Error linking impact areas:', error);
          });
      }
      
      // Process university impact areas
      if (university_impact_areas && Array.isArray(university_impact_areas)) {
        const processUniversityImpactAreas = university_impact_areas.map(areaItem => {
          const areaName = typeof areaItem === 'string' ? areaItem : areaItem.name;
          const notes = typeof areaItem === 'object' ? areaItem.notes : null;
          
          return new Promise((resolve, reject) => {
            db.get('SELECT id FROM university_impact_areas WHERE name = ?', [areaName], (err, area) => {
              if (err) {
                return reject(err);
              }
              
              if (area) {
                db.run('INSERT INTO order_university_impact_areas (order_id, university_impact_area_id, notes) VALUES (?, ?, ?)', 
                  [orderId, area.id, notes], (err) => {
                  if (err) {
                    return reject(err);
                  }
                  resolve();
                });
              } else {
                resolve(); // University impact area not found, just skip
              }
            });
          });
        });
        
        Promise.all(processUniversityImpactAreas)
          .catch(error => {
            console.error('Error linking university impact areas:', error);
          });
      }
      
      // Return the created order
      res.status(201).json({ 
        id: orderId,
        order_number,
        title,
        message: 'Executive order created successfully'
      });
    }
  );
});

// Update an executive order
app.put('/api/executive-orders/:id', (req, res) => {
  const id = req.params.id;
  const {
    order_number,
    title,
    signing_date,
    publication_date,
    president,
    summary,
    full_text,
    url,
    impact_level,
    status,
    implementation_phase,
    categories,
    impact_areas,
    university_impact_areas
  } = req.body;
  
  // Validate required fields
  if (!order_number || !title) {
    return res.status(400).json({ error: 'Order number and title are required' });
  }
  
  // Update executive order
  db.run(
    `UPDATE executive_orders 
     SET order_number = ?, title = ?, signing_date = ?, publication_date = ?, 
         president = ?, summary = ?, full_text = ?, url = ?, impact_level = ?, 
         status = ?, implementation_phase = ?, last_updated = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [order_number, title, signing_date, publication_date, president, summary, 
     full_text, url, impact_level, status, implementation_phase, id],
    function(err) {
      if (err) {
        console.error('Error updating executive order:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Executive order not found' });
      }
      
      // Clear existing relationships to update them
      db.run('DELETE FROM order_categories WHERE order_id = ?', [id]);
      db.run('DELETE FROM order_impact_areas WHERE order_id = ?', [id]);
      db.run('DELETE FROM order_university_impact_areas WHERE order_id = ?', [id]);
      
      // Process categories
      if (categories && Array.isArray(categories)) {
        categories.forEach(categoryName => {
          db.get('SELECT id FROM categories WHERE name = ?', [categoryName], (err, category) => {
            if (err || !category) return;
            db.run('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', [id, category.id]);
          });
        });
      }
      
      // Process impact areas
      if (impact_areas && Array.isArray(impact_areas)) {
        impact_areas.forEach(areaName => {
          db.get('SELECT id FROM impact_areas WHERE name = ?', [areaName], (err, area) => {
            if (err || !area) return;
            db.run('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', [id, area.id]);
          });
        });
      }
      
      // Process university impact areas
      if (university_impact_areas && Array.isArray(university_impact_areas)) {
        university_impact_areas.forEach(areaItem => {
          const areaName = typeof areaItem === 'string' ? areaItem : areaItem.name;
          const notes = typeof areaItem === 'object' ? areaItem.notes : null;
          
          db.get('SELECT id FROM university_impact_areas WHERE name = ?', [areaName], (err, area) => {
            if (err || !area) return;
            db.run('INSERT INTO order_university_impact_areas (order_id, university_impact_area_id, notes) VALUES (?, ?, ?)', 
              [id, area.id, notes]);
          });
        });
      }
      
      res.json({ message: 'Executive order updated successfully' });
    }
  );
});

// Delete an executive order
app.delete('/api/executive-orders/:id', (req, res) => {
  const id = req.params.id;
  
  db.run('DELETE FROM executive_orders WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting executive order:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Executive order not found' });
    }
    
    res.json({ message: 'Executive order deleted successfully' });
  });
});

// Get all categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', [], (err, categories) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    res.json(categories);
  });
});

// Get all impact areas
app.get('/api/impact-areas', (req, res) => {
  db.all('SELECT * FROM impact_areas ORDER BY name', [], (err, impactAreas) => {
    if (err) {
      console.error('Error fetching impact areas:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    res.json(impactAreas);
  });
});

// Get all university impact areas
app.get('/api/university-impact-areas', (req, res) => {
  db.all('SELECT * FROM university_impact_areas ORDER BY name', [], (err, universityImpactAreas) => {
    if (err) {
      console.error('Error fetching university impact areas:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    res.json(universityImpactAreas);
  });
});

// Get summary statistics
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
      console.error('Error fetching impact level stats:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
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
        console.error('Error fetching university impact area stats:', err);
        return res.status(500).json({ error: 'Database error: ' + err.message });
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
          console.error('Error fetching category stats:', err);
          return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        
        stats.categories = categories;
        
        // Get count by month/year
        db.all(`
          SELECT 
            strftime('%Y-%m', signing_date) as month,
            COUNT(*) as count
          FROM executive_orders
          WHERE signing_date IS NOT NULL
          GROUP BY month
          ORDER BY month
        `, [], (err, timeline) => {
          if (err) {
            console.error('Error fetching timeline stats:', err);
            return res.status(500).json({ error: 'Database error: ' + err.message });
          }
          
          stats.timeline = timeline;
          
          // Return combined statistics
          res.json(stats);
        });
      });
    });
  });
});

// Get system information
app.get('/api/system-info', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM executive_orders', [], (err, result) => {
    if (err) {
      console.error('Error counting executive orders:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    res.json({
      topicName: 'Yale Executive Order Analysis',
      topicDescription: 'Analysis of executive orders and their impact on Yale University operations and compliance',
      usingDatabase: true,
      databaseType: 'SQLite',
      orderCount: result.count,
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    });
  });
});

// Fetch new executive orders and update database
app.post('/api/fetch-new-orders', (req, res) => {
  console.log('Starting fetch and import of new executive orders...');
  
  // Run the fetch orders script
  exec('node fetch_orders.js', (error, stdout, stderr) => {
    if (error) {
      console.error('Error running fetch_orders.js:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch new orders: ' + error.message,
        details: stderr
      });
    }
    
    console.log('Fetch completed successfully. Output:', stdout);
    
    // Now run the database setup to import new orders
    exec('node sqlite_setup.js', (error, stdout, stderr) => {
      if (error) {
        console.error('Error running sqlite_setup.js:', error);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to import orders into database: ' + error.message,
          details: stderr
        });
      }
      
      console.log('Database import completed successfully. Output:', stdout);
      
      res.json({
        success: true,
        message: 'Successfully fetched new executive orders and updated the database',
        details: stdout
      });
    });
  });
});

// AI categorization endpoint using Anthropic Claude
app.post('/api/categorize-order/:id', async (req, res) => {
  const orderId = req.params.id;
  
  // First, get the order details
  db.get('SELECT * FROM executive_orders WHERE id = ?', [orderId], async (err, order) => {
    if (err) {
      console.error('Error fetching order:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    if (!order) {
      return res.status(404).json({ error: 'Executive order not found' });
    }
    
    try {
      // Check if ANTHROPIC_API_KEY exists
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({ 
          error: 'Anthropic API key not configured. Add it to your .env file.' 
        });
      }
      
      // Prepare data for categorization
      const orderText = `
        Executive Order: ${order.order_number}
        Title: ${order.title}
        Date: ${order.signing_date || 'Unknown'}
        President: ${order.president || 'Unknown'}
        Summary: ${order.summary || ''}
        Full Text: ${order.full_text || ''}
      `;
      
      console.log('Categorizing order with Claude:', orderText.substring(0, 100) + '...');
      
      // Call Anthropic API for categorization
      const anthropicResponse = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: "claude-3-haiku-20240307",
          max_tokens: 1000,
          system: `You are an expert in analyzing executive orders and categorizing them for university compliance. 
                  The categories you can use are: ["Technology", "Education", "Healthcare", "Finance", "Environment", 
                  "Immigration", "Security", "Diversity", "Research", "Infrastructure", "International", "Industry"].
                  The impact areas you can assign are: ["Funding", "Policy", "Operations", "Compliance", "Research", "International"].
                  The university impact areas to choose from are: ["Research Funding", "Student Aid & Higher Education Finance", 
                  "Administrative Compliance", "Workforce & Employment Policy", "Public-Private Partnerships"].
                  Return your analysis in JSON format with fields: categories, impactAreas, universityImpactAreas, and rationale.`,
          messages: [
            {
              role: "user",
              content: `Based on the following executive order, provide a categorization for university compliance tracking. 
                        Analyze the content and determine:
                        1. The primary categories the order falls under (select 1-3 from the available list)
                        2. The impact areas affecting universities (select 1-3 from the available list)
                        3. Specific university impact areas most relevant to this order (select 1-2 from the available list)
                        
                        Executive order details:
                        ${orderText}
                        
                        Format your response as a JSON object with fields:
                        {
                          "categories": [array of category strings],
                          "impactAreas": [array of impact area strings],
                          "universityImpactAreas": [array of university impact area strings],
                          "rationale": "Brief explanation of your categorization"
                        }`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': process.env.ANTHROPIC_API_KEY
          }
        }
      );
      
      // Extract the response content
      const claudeResponse = anthropicResponse.data.content[0].text;
      
      // Parse JSON from the response
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/);
      let categorization;
      
      if (jsonMatch) {
        categorization = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Claude response as JSON');
      }
      
      console.log('Claude categorization:', categorization);
      
      // Update the database with the categorization
      db.serialize(() => {
        // Clear existing categorizations
        db.run('DELETE FROM order_categories WHERE order_id = ?', [orderId]);
        db.run('DELETE FROM order_impact_areas WHERE order_id = ?', [orderId]);
        db.run('DELETE FROM order_university_impact_areas WHERE order_id = ?', [orderId]);
        
        // Add new categories
        categorization.categories.forEach(category => {
          db.get('SELECT id FROM categories WHERE name = ?', [category], (err, result) => {
            if (!err && result) {
              db.run('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', [orderId, result.id]);
            } else if (!result) {
              // Create category if it doesn't exist
              db.run('INSERT INTO categories (name) VALUES (?)', [category], function(err) {
                if (!err) {
                  db.run('INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)', [orderId, this.lastID]);
                }
              });
            }
          });
        });
        
        // Add new impact areas
        categorization.impactAreas.forEach(area => {
          db.get('SELECT id FROM impact_areas WHERE name = ?', [area], (err, result) => {
            if (!err && result) {
              db.run('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', [orderId, result.id]);
            } else if (!result) {
              // Create impact area if it doesn't exist
              db.run('INSERT INTO impact_areas (name) VALUES (?)', [area], function(err) {
                if (!err) {
                  db.run('INSERT INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', [orderId, this.lastID]);
                }
              });
            }
          });
        });
        
        // Add new university impact areas
        categorization.universityImpactAreas.forEach(area => {
          db.get('SELECT id FROM university_impact_areas WHERE name = ?', [area], (err, result) => {
            if (!err && result) {
              db.run('INSERT INTO order_university_impact_areas (order_id, university_impact_area_id, notes) VALUES (?, ?, ?)', 
                [orderId, result.id, categorization.rationale]);
            }
          });
        });
      });
      
      // Return the categorization to the client
      res.json({
        success: true,
        message: 'Executive order categorized successfully using Claude AI',
        categories: categorization.categories,
        impactAreas: categorization.impactAreas,
        universityImpactAreas: categorization.universityImpactAreas,
        rationale: categorization.rationale
      });
      
    } catch (error) {
      console.error('Error categorizing order with Claude:', error);
      res.status(500).json({ 
        error: 'Failed to categorize order: ' + error.message 
      });
    }
  });
});

// Manage compliance actions
app.post('/api/executive-orders/:id/compliance-actions', (req, res) => {
  const orderId = req.params.id;
  const { title, description, deadline, status, priority, responsible_office } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required for compliance action' });
  }
  
  db.run(`
    INSERT INTO compliance_actions 
    (order_id, title, description, deadline, status, priority, responsible_office)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [orderId, title, description, deadline, status || 'Pending', priority, responsible_office], function(err) {
    if (err) {
      console.error('Error creating compliance action:', err);
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    res.status(201).json({
      id: this.lastID,
      message: 'Compliance action created successfully'
    });
  });
});

// Start the server
const PORT = process.env.PORT || 3001; // Use port 3001 by default
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
  console.log(`Access the API at http://localhost:${PORT}/api/executive-orders`);
});

module.exports = app;