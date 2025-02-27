/**
 * Script to fetch recent executive orders (after Jan 20, 2025) and add them to the SQLite database
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

// Open SQLite database
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

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
      const pubDate = new Date(order.publication_date);
      return pubDate >= cutoffDate;
    });
    
    console.log(`Found ${recentOrders.length} executive orders after January 20, 2025`);
    return recentOrders;
  } catch (error) {
    console.error('Error fetching recent executive orders:', error.message);
    return [];
  }
}

// Enrich order data with Yale-specific information
async function enrichExecutiveOrderData(orders) {
  try {
    console.log('Enriching executive order data...');
    
    const enrichedOrders = [];
    
    for (const order of orders) {
      // Extract document number as the order number
      const orderNumber = order.document_number || 'Unknown';
      
      // Extract president name
      let president = order.president || 'Unknown';
      
      // For orders after January 20, 2025, set to Trump
      const pubDate = new Date(order.publication_date);
      const signingDate = order.signing_date ? new Date(order.signing_date) : null;
      const cutoffDate = new Date('2025-01-20');
      
      if (pubDate >= cutoffDate || (signingDate && signingDate >= cutoffDate)) {
        president = "Trump";
      }
      
      // Create Yale-specific impact categories based on the title
      const categories = [];
      const impactAreas = [];
      const universityImpactAreas = [];
      
      // Add categories based on keywords in title
      const titleLower = order.title.toLowerCase();
      
      if (titleLower.includes('artificial intelligence') || titleLower.includes(' ai ')) {
        categories.push('Technology');
        impactAreas.push('Research');
        universityImpactAreas.push('Research Funding');
      }
      
      if (titleLower.includes('education') || titleLower.includes('school') || 
          titleLower.includes('college') || titleLower.includes('student')) {
        categories.push('Education');
        impactAreas.push('Policy');
        universityImpactAreas.push('Student Aid & Higher Education Finance');
      }
      
      if (titleLower.includes('health') || titleLower.includes('medical')) {
        categories.push('Healthcare');
        impactAreas.push('Compliance');
      }
      
      if (titleLower.includes('research') || titleLower.includes('science')) {
        categories.push('Research');
        impactAreas.push('Funding');
        universityImpactAreas.push('Research Funding');
      }
      
      if (titleLower.includes('security') || titleLower.includes('cyber')) {
        categories.push('National Security');
        impactAreas.push('Compliance');
        universityImpactAreas.push('Administrative Compliance');
      }
      
      if (titleLower.includes('immigration') || titleLower.includes('visa') || 
          titleLower.includes('foreign') || titleLower.includes('international')) {
        categories.push('Immigration');
        impactAreas.push('Policy');
        universityImpactAreas.push('Workforce & Employment Policy');
      }
      
      if (titleLower.includes('finance') || titleLower.includes('economic') || 
          titleLower.includes('budget') || titleLower.includes('tax')) {
        categories.push('Finance');
        impactAreas.push('Funding');
        universityImpactAreas.push('Student Aid & Higher Education Finance');
      }
      
      if (titleLower.includes('environment') || titleLower.includes('climate')) {
        categories.push('Environment');
        impactAreas.push('Compliance');
      }
      
      if (titleLower.includes('diversity') || titleLower.includes('equity') || 
          titleLower.includes('inclusion') || titleLower.includes('civil rights')) {
        categories.push('Diversity');
        impactAreas.push('Policy');
        universityImpactAreas.push('Administrative Compliance');
      }
      
      // Default category if none matched
      if (categories.length === 0) {
        categories.push('General Policy');
        impactAreas.push('Operational');
      }
      
      // Default university impact area if none matched
      if (universityImpactAreas.length === 0) {
        universityImpactAreas.push('Administrative Compliance');
      }
      
      // Generate AI summary of the EO and its impact on Yale using Claude
      let aiSummary = "";
      let impactLevel = "Medium";
      let financialImpact = "";
      
      try {
        // Try to get AI-generated summary using Anthropic's Claude API
        if (process.env.ANTHROPIC_API_KEY) {
          console.log(`Using Claude AI to generate summary for ${orderNumber}`);
          
          const anthropicResponse = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
              model: "claude-3-haiku-20240307",
              max_tokens: 1000,
              system: "You are an expert in university administration, specializing in analyzing how executive orders affect university finances and operations.",
              messages: [
                {
                  role: "user",
                  content: `Analyze this executive order and its impact on Yale University:
                  
                  Title: ${order.title}
                  
                  Respond with a JSON object containing:
                  1. A 2-3 sentence summary of the executive order
                  2. A 2-3 sentence analysis of its financial impact on universities like Yale
                  3. An impact level (Critical, High, Medium, or Low)
                  
                  Format: {"summary": "...", "financialImpact": "...", "impactLevel": "..."}`
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
          
          const responseText = anthropicResponse.data.content[0].text;
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          
          if (jsonMatch) {
            const aiResult = JSON.parse(jsonMatch[0]);
            aiSummary = aiResult.summary;
            financialImpact = aiResult.financialImpact;
            impactLevel = aiResult.impactLevel;
            console.log(`Claude generated summary with impact level: ${impactLevel}`);
          } else {
            throw new Error('Could not parse Claude response as JSON');
          }
        } else {
          throw new Error('ANTHROPIC_API_KEY not found in environment');
        }
      } catch (error) {
        console.log(`Using fallback method for summary generation: ${error.message}`);
        
        // Fallback to rule-based summary generation
        aiSummary = `This executive order titled "${order.title}" may affect university operations.`;
        financialImpact = "Financial impact is currently under assessment.";
        
        if (categories.includes('Education') || categories.includes('Research') || categories.includes('Finance')) {
          impactLevel = "High";
        } else if (categories.includes('Technology') || categories.includes('Healthcare') || categories.includes('Immigration')) {
          impactLevel = "Medium";
        } else {
          impactLevel = "Low";
        }
      }
      
      // Create enhanced order object
      const enhancedOrder = {
        number: orderNumber,
        title: order.title,
        date: order.publication_date,
        president: president,
        summary: aiSummary,
        financialImpact: financialImpact,
        url: order.url,
        impactLevel: impactLevel,
        categories: categories,
        impactAreas: impactAreas,
        universityImpactAreas: universityImpactAreas
      };
      
      enrichedOrders.push(enhancedOrder);
      console.log(`Processed: ${orderNumber} - ${order.title}`);
    }
    
    return enrichedOrders;
  } catch (error) {
    console.error('Error enriching executive order data:', error);
    return [];
  }
}

// Insert orders into SQLite database
async function insertOrdersIntoDatabase(orders) {
  return new Promise((resolve, reject) => {
    console.log(`Inserting ${orders.length} orders into database...`);
    
    db.serialize(() => {
      // Begin transaction
      db.run('BEGIN TRANSACTION');
      
      // Prepare statements
      const insertOrderStmt = db.prepare(`
        INSERT OR IGNORE INTO executive_orders 
        (order_number, title, signing_date, president, summary, full_text, url, impact_level, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // Process each order
      let successCount = 0;
      
      orders.forEach(order => {
        try {
          // Insert the order
          insertOrderStmt.run(
            order.number,
            order.title,
            order.date,
            order.president,
            order.summary,
            order.financialImpact, // We'll use the financial impact as full_text for now
            order.url,
            order.impactLevel,
            'Active', // Set status to Active
            function(err) {
              if (err) {
                console.error(`Error inserting order ${order.number}:`, err.message);
                return;
              }
              
              const orderId = this.lastID;
              
              // If we have a new order (not ignored due to existing), process categories
              if (orderId && order.categories) {
                // Get category IDs and insert relations
                order.categories.forEach(categoryName => {
                  db.get('SELECT id FROM categories WHERE name = ?', [categoryName], (err, category) => {
                    if (err || !category) return;
                    db.run('INSERT OR IGNORE INTO order_categories (order_id, category_id) VALUES (?, ?)', 
                      [orderId, category.id]);
                  });
                });
                
                // Process impact areas
                order.impactAreas.forEach(areaName => {
                  db.get('SELECT id FROM impact_areas WHERE name = ?', [areaName], (err, area) => {
                    if (err || !area) return;
                    db.run('INSERT OR IGNORE INTO order_impact_areas (order_id, impact_area_id) VALUES (?, ?)', 
                      [orderId, area.id]);
                  });
                });
                
                // Process university impact areas
                order.universityImpactAreas.forEach(areaName => {
                  db.get('SELECT id FROM university_impact_areas WHERE name = ?', [areaName], (err, area) => {
                    if (err || !area) return;
                    db.run('INSERT OR IGNORE INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)', 
                      [orderId, area.id]);
                  });
                });
                
                successCount++;
              }
            }
          );
        } catch (error) {
          console.error(`Error processing order ${order.number}:`, error);
        }
      });
      
      // Finalize prepared statement
      insertOrderStmt.finalize();
      
      // Commit transaction
      db.run('COMMIT', (err) => {
        if (err) {
          console.error('Error committing transaction:', err.message);
          reject(err);
        } else {
          console.log(`Successfully inserted ${successCount} orders into the database`);
          resolve(successCount);
        }
      });
    });
  });
}

// Main function
async function main() {
  try {
    // Fetch recent executive orders (after Jan 20, 2025)
    const recentOrders = await fetchRecentExecutiveOrders();
    
    if (recentOrders.length === 0) {
      console.log('No recent executive orders found. Exiting.');
      db.close();
      return;
    }
    
    // Enrich the order data with Yale-specific information
    const enrichedOrders = await enrichExecutiveOrderData(recentOrders);
    
    // Insert orders into SQLite database
    await insertOrdersIntoDatabase(enrichedOrders);
    
    // Close database connection
    db.close();
    
    console.log('Process completed successfully.');
    console.log(`\nYou can now access the updated data at http://localhost:3001/api/executive-orders`);
    
  } catch (error) {
    console.error('Error in main process:', error);
    // Close database connection in case of error
    db.close();
  }
}

// Run the main function
main();