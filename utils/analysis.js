/**
 * analysis.js
 * 
 * Shared utilities for analyzing executive orders and updating the database
 */

const axios = require('axios');
const { dbGet, dbRun } = require('./db');

/**
 * Updates an executive order with analysis results
 * @param {sqlite3.Database} db Database connection
 * @param {number} orderId Order ID
 * @param {Object} analysis Analysis object with summary, impactLevel, etc.
 * @returns {Promise<boolean>} Promise resolving to success status
 */
async function updateOrderWithAnalysis(db, orderId, analysis) {
  try {
    console.log(`Updating order ${orderId} with analysis results`);
    
    // Update the executive order with summary and impact level
    await dbRun(
      db,
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
      const category = await dbGet(db, 'SELECT id FROM categories WHERE name = ?', [categoryName]);
      if (category) {
        // Check if relation already exists
        const existingRelation = await dbGet(
          db,
          'SELECT * FROM order_categories WHERE order_id = ? AND category_id = ?',
          [orderId, category.id]
        );
        
        if (!existingRelation) {
          // Add category relation
          await dbRun(
            db,
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
      const area = await dbGet(db, 'SELECT id FROM university_impact_areas WHERE name = ?', [areaName]);
      if (area) {
        // Check if relation already exists
        const existingRelation = await dbGet(
          db,
          'SELECT * FROM order_university_impact_areas WHERE order_id = ? AND university_impact_area_id = ?',
          [orderId, area.id]
        );
        
        if (!existingRelation) {
          // Add impact area relation
          await dbRun(
            db,
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

/**
 * Generates analysis for an executive order using Claude API
 * @param {Object} order Order object with title, order_number, etc.
 * @returns {Promise<Object>} Promise resolving to the analysis object
 */
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
        system: "You are an expert in higher education administration, specializing in analyzing how executive orders affect operations across diverse institution types, including research universities, liberal arts colleges, community colleges, and both public and private institutions.",
        messages: [
          {
            role: "user",
            content: `Analyze this executive order for higher education institutions:
            
            Title: ${order.title}
            Order Number: ${order.order_number}
            President: ${order.president}
            Date: ${order.signing_date || order.publication_date}
            
            Please analyze the impact of this executive order on higher education institutions across the sector, considering different institution types (public/private, large/small, research/teaching-focused). Then generate:
            
            1. A standard summary (2-3 sentences)
            2. An executive brief (3-4 paragraphs, more detailed than summary)
            3. A comprehensive analysis (detailed, ~600 words)
            4. Impact level classification (Critical, High, Medium, or Low)
            5. Relevant categories (choose from: Technology, Education, Finance, Healthcare, Research, Immigration, National Security, Diversity, Environment, Industry)
            6. Higher education impact areas (choose from: Research Funding, Student Aid & Higher Education Finance, Administrative Compliance, Workforce & Employment Policy, Public-Private Partnerships, Institutional Accessibility, Academic Freedom & Curriculum)
            
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

/**
 * Fetches orders that need analysis from the database
 * @param {sqlite3.Database} db Database connection
 * @param {Object} options Query options (limit, offset)
 * @returns {Promise<Array>} Promise resolving to array of orders
 */
async function fetchOrdersNeedingAnalysis(db, options = {}) {
  const { limit, offset, where } = options;
  
  let query = `
    SELECT id, order_number, title, signing_date, publication_date, president, summary, full_text, url
    FROM executive_orders 
    WHERE impact_level IS NULL OR impact_level = ''
  `;
  
  if (where) {
    query += ` AND ${where}`;
  }
  
  query += ' ORDER BY signing_date DESC';
  
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  
  if (offset) {
    query += ` OFFSET ${offset}`;
  }
  
  return await dbAll(db, query);
}

/**
 * Logs analysis status to console with details
 * @param {number} successCount Number of successful analyses
 * @param {number} totalCount Total number of analyses attempted
 * @param {string} jobName Name of the analysis job
 */
function logAnalysisCompletion(successCount, totalCount, jobName = 'Analysis job') {
  console.log(`\n${jobName} completed. Successfully analyzed ${successCount} out of ${totalCount} orders.`);
  
  if (successCount < totalCount) {
    console.log(`Failed to analyze ${totalCount - successCount} orders.`);
  }
}

module.exports = {
  updateOrderWithAnalysis,
  generateAnalysisWithClaude,
  fetchOrdersNeedingAnalysis,
  logAnalysisCompletion
};