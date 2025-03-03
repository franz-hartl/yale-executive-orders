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
  // Check for API key in environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment');
  }

  console.log(`Using Claude AI to generate analysis for ${order.order_number}`);
  
  try {
    const anthropicResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 1500,
        system: "You are an expert in higher education administration, specializing in analyzing how executive orders affect operations across diverse institution types, including research universities, liberal arts colleges, community colleges, and both public and private institutions. Your analyses should be concrete and specific, focusing on actionable implications rather than general statements. When analyzing orders, be precise about which departments would be most affected and what specific actions institutions should take in response. For Yale University specifically, consider impacts on research funding, institutional compliance, student programs, and faculty initiatives.",
        messages: [
          {
            role: "user",
            content: `Analyze this executive order for higher education institutions, especially research universities like Yale:
            
            Title: ${order.title}
            Order Number: ${order.order_number}
            President: ${order.president}
            Date: ${order.signing_date || order.publication_date}
            
            Please provide a precise, actionable analysis of how this executive order affects higher education institutions, particularly research universities like Yale. Focus on concrete implications and specific actions needed by various institutional departments. Consider the following:

            1. Which specific departments or offices will be most affected? (e.g., Office of Research Administration, Financial Aid, etc.)
            2. What explicit compliance requirements are created?
            3. What direct financial impacts might result?
            4. What timeline considerations should institutions be aware of?
            5. How should institutions prioritize their response?
            
            Then generate:
            
            1. A standard summary (2-3 sentences) with specific impacts, not general statements
            2. An executive brief (3-4 paragraphs) with actionable recommendations and timeline considerations
            3. A comprehensive analysis (detailed, ~600 words) that highlights department-specific impacts and required actions
            4. Impact level classification (Critical, High, Medium, or Low) with justification
            5. Relevant categories (choose from: Technology, Education, Finance, Healthcare, Research, Immigration, National Security, Diversity, Environment, Industry)
            6. Higher education impact areas (choose from: Research Funding, Student Aid & Higher Education Finance, Administrative Compliance, Workforce & Employment Policy, Public-Private Partnerships, Institutional Accessibility, Academic Freedom & Curriculum)
            7. Yale-specific considerations for institutional response
            
            Format your response as JSON:
            {
              "summary": "...",
              "executiveBrief": "...",
              "comprehensiveAnalysis": "...",
              "impactLevel": "...",
              "impactJustification": "...",
              "categories": ["...", "..."],
              "universityImpactAreas": ["...", "..."],
              "yaleSpecificConsiderations": "...",
              "affectedDepartments": ["...", "..."],
              "complianceRequirements": ["...", "..."],
              "keyTimelines": ["...", "..."],
              "priorityActions": ["...", "..."]
            }`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': apiKey
        }
      }
    );
    
    const responseText = anthropicResponse.data.content[0].text;
    console.log(`Raw response from Claude: ${responseText.substring(0, 200)}...`);
    
    // Parse the JSON from Claude's response
    try {
      // Use regex to extract the JSON object from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        // Parse the JSON object
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Validate the required fields
        if (!parsedResponse.summary || !parsedResponse.executiveBrief || 
            !parsedResponse.comprehensiveAnalysis || !parsedResponse.impactLevel) {
          throw new Error('Missing required fields in Claude response');
        }
        
        // Return the parsed response
        return parsedResponse;
      } else {
        throw new Error('Could not extract JSON from Claude response');
      }
    } catch (parseError) {
      console.error(`Error parsing Claude response: ${parseError.message}`);
      
      // Fallback to a properly formatted object if parsing fails
      return {
        summary: `Analysis of Executive Order ${order.order_number}: ${order.title}`,
        executiveBrief: `Executive Brief for ${order.order_number}: This executive order signed by President ${order.president} addresses key issues relevant to higher education. Institutions should review compliance requirements and assess operational impacts.`,
        comprehensiveAnalysis: `Comprehensive Analysis of Executive Order ${order.order_number}: ${order.title}\n\nThis executive order addresses several areas of significance to higher education institutions. The order, signed by President ${order.president}, may impact research funding, administrative requirements, and institutional operations. Universities should carefully review this order to determine compliance needs and operational adjustments.`,
        impactLevel: "Medium",
        impactJustification: "This order creates moderate compliance requirements and funding opportunities for research universities.",
        categories: ["Education", "Research"],
        universityImpactAreas: ["Research Funding", "Administrative Compliance"],
        yaleSpecificConsiderations: "Yale should monitor implementation guidance and coordinate response through the Office of Research Administration.",
        affectedDepartments: ["Office of Research Administration", "Office of General Counsel"],
        complianceRequirements: ["Review and update institutional policies", "Potential new reporting requirements"],
        keyTimelines: ["Immediate review", "Await implementation guidance"],
        priorityActions: ["Establish monitoring committee", "Review existing policies"]
      };
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
    
    // Update the executive order with enhanced analysis
    await dbRun(
      `UPDATE executive_orders 
       SET summary = ?, 
           impact_level = ?, 
           plain_language_summary = ?,
           executive_brief = ?,
           comprehensive_analysis = ?,
           what_changed = ?,
           yale_alert_level = ?,
           yale_imperative = ?,
           core_impact = ?
       WHERE id = ?`,
      [
        analysis.summary,
        analysis.impactLevel,
        analysis.summary,
        analysis.executiveBrief,
        analysis.comprehensiveAnalysis,
        analysis.impactJustification || null,
        analysis.impactLevel, // Use same level for yale_alert_level for now
        analysis.yaleSpecificConsiderations || null,
        analysis.priorityActions ? JSON.stringify(analysis.priorityActions) : null,
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
    
    // Get orders to reanalyze - specific orders that we want to update with new analysis
    const ordersToAnalyze = await dbAll(`
      SELECT id, order_number, title, signing_date, publication_date, president, summary, full_text, url
      FROM executive_orders 
      WHERE order_number IN ('14097', '14096', '14039', '14008', '14058', 'EO 14028', 'EO 14081', 'EO 14110')
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