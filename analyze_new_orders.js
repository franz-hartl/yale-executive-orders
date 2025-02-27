/**
 * analyze_new_orders.js
 * 
 * This script generates multi-level analyses and categorizations for executive orders
 * that are missing impact levels or other metadata in our database.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

// Database connection
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

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

// Function to generate analysis using Claude API
async function generateAnalysisWithClaude(order) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not found in environment');
  }

  console.log(`Using Claude AI to generate analysis for ${order.order_number}`);
  
  try {
    const anthropicResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        system: "You are an expert in academic administration, specializing in analyzing how executive orders affect university operations, particularly in financial aspects.",
        messages: [
          {
            role: "user",
            content: `Analyze this executive order for Yale University:
            
            Title: ${order.title}
            Order Number: ${order.order_number}
            President: ${order.president}
            Date: ${order.signing_date || order.publication_date}
            
            Please analyze the impact of this executive order on Yale University operations, with special focus on financial impacts. Then generate:
            
            1. A standard summary (2-3 sentences)
            2. An executive brief (3-4 paragraphs, more detailed than summary)
            3. A comprehensive analysis (detailed, ~600 words)
            4. Impact level classification (Critical, High, Medium, or Low)
            5. Relevant categories (choose from: Technology, Education, Finance, Healthcare, Research, Immigration, National Security, Diversity, Environment, Industry)
            6. University impact areas (choose from: Research Funding, Student Aid & Higher Education Finance, Administrative Compliance, Workforce & Employment Policy, Public-Private Partnerships)
            
            Format your response as JSON:
            {
              "summary": "...",
              "executiveBrief": "...",
              "comprehensiveAnalysis": "...",
              "impactLevel": "...",
              "categories": ["...", "..."],
              "universityImpactAreas": ["...", "..."]
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
    
    const responseText = anthropicResponse.data.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Could not parse Claude response as JSON');
    }
  } catch (error) {
    console.error(`Error calling Claude API: ${error.message}`);
    throw error;
  }
}

// Function to update order with analysis results
async function updateOrderWithAnalysis(orderId, analysis) {
  try {
    console.log(`Updating order ${orderId} with analysis results`);
    
    // Update the executive order with summary and impact level
    await dbRun(
      `UPDATE executive_orders 
       SET summary = ?, 
           impact_level = ?, 
           plain_language_summary = ?,
           executive_brief = ?,
           comprehensive_analysis = ?
       WHERE id = ?`,
      [
        analysis.summary,
        analysis.impactLevel,
        analysis.summary,
        analysis.executiveBrief,
        analysis.comprehensiveAnalysis,
        orderId
      ]
    );
    
    // Update categories
    for (const categoryName of analysis.categories) {
      // Get category ID
      const category = await dbGet('SELECT id FROM categories WHERE name = ?', [categoryName]);
      if (category) {
        // Check if relation already exists
        const existingRelation = await dbGet(
          'SELECT * FROM order_categories WHERE order_id = ? AND category_id = ?',
          [orderId, category.id]
        );
        
        if (!existingRelation) {
          // Add category relation
          await dbRun(
            'INSERT INTO order_categories (order_id, category_id) VALUES (?, ?)',
            [orderId, category.id]
          );
          console.log(`Added category ${categoryName} to order ${orderId}`);
        }
      } else {
        console.log(`Category not found: ${categoryName}`);
      }
    }
    
    // Update university impact areas
    for (const areaName of analysis.universityImpactAreas) {
      // Get impact area ID
      const area = await dbGet('SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
      if (area) {
        // Check if relation already exists
        const existingRelation = await dbGet(
          'SELECT * FROM order_university_impact_areas WHERE order_id = ? AND university_impact_area_id = ?',
          [orderId, area.id]
        );
        
        if (!existingRelation) {
          // Add impact area relation
          await dbRun(
            'INSERT INTO order_university_impact_areas (order_id, university_impact_area_id) VALUES (?, ?)',
            [orderId, area.id]
          );
          console.log(`Added university impact area ${areaName} to order ${orderId}`);
        }
      } else {
        console.log(`University impact area not found: ${areaName}`);
      }
    }
    
    console.log(`Successfully updated order ${orderId} with analysis results`);
    return true;
  } catch (error) {
    console.error(`Error updating order ${orderId} with analysis:`, error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log("Starting analysis of executive orders without impact levels...");
    
    // Get orders that need analysis (those without impact levels)
    const ordersToAnalyze = await dbAll(`
      SELECT id, order_number, title, signing_date, publication_date, president, summary, full_text, url
      FROM executive_orders 
      WHERE impact_level IS NULL OR impact_level = ''
      ORDER BY signing_date DESC
    `);
    
    console.log(`Found ${ordersToAnalyze.length} orders that need analysis`);
    
    // Process each order
    let successCount = 0;
    
    for (const order of ordersToAnalyze) {
      try {
        console.log(`\nProcessing order: ${order.order_number} - ${order.title}`);
        
        // Generate analysis
        const analysis = await generateAnalysisWithClaude(order);
        
        // Update order with analysis
        const success = await updateOrderWithAnalysis(order.id, analysis);
        if (success) {
          successCount++;
        }
        
        // Add a delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Error processing order ${order.order_number}:`, error);
      }
    }
    
    console.log(`\nAnalysis completed. Successfully analyzed ${successCount} out of ${ordersToAnalyze.length} orders.`);
    
  } catch (error) {
    console.error("Error in main process:", error);
  } finally {
    // Close the database connection
    db.close();
  }
}

// Run the main function
main();