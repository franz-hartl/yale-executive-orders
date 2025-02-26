/**
 * generate_plain_summaries.js
 * 
 * This script generates plain language summaries for executive orders in the database,
 * making them easier for Yale administrators to understand.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Open SQLite database
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

// Check if the plain_language_summary column exists, add if not
async function setupDatabase() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(executive_orders)", [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Check if column exists
      const hasColumn = rows && rows.some(row => row.name === 'plain_language_summary');
      
      if (!hasColumn) {
        console.log('Adding plain_language_summary column to executive_orders table...');
        db.run(`ALTER TABLE executive_orders ADD COLUMN plain_language_summary TEXT`, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      } else {
        console.log('plain_language_summary column already exists');
        resolve();
      }
    });
  });
}

// Get all executive orders that need plain language summaries
async function getOrdersForProcessing() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT eo.id, eo.order_number, eo.title, eo.summary, eo.full_text, eo.impact_level,
             eo.signing_date, eo.president, 
             GROUP_CONCAT(DISTINCT c.name) as categories,
             GROUP_CONCAT(DISTINCT ia.name) as impact_areas,
             GROUP_CONCAT(DISTINCT uia.name) as university_impact_areas
      FROM executive_orders eo
      LEFT JOIN order_categories oc ON eo.id = oc.order_id
      LEFT JOIN categories c ON oc.category_id = c.id
      LEFT JOIN order_impact_areas oia ON eo.id = oia.order_id
      LEFT JOIN impact_areas ia ON oia.impact_area_id = ia.id
      LEFT JOIN order_university_impact_areas ouia ON eo.id = ouia.order_id
      LEFT JOIN university_impact_areas uia ON ouia.university_impact_area_id = uia.id
      WHERE eo.plain_language_summary IS NULL OR eo.plain_language_summary = ''
      GROUP BY eo.id
      LIMIT 10
    `;
    
    db.all(query, [], (err, orders) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Format the results
      const formattedOrders = orders.map(order => {
        return {
          ...order,
          categories: order.categories ? order.categories.split(',') : [],
          impact_areas: order.impact_areas ? order.impact_areas.split(',') : [],
          university_impact_areas: order.university_impact_areas ? order.university_impact_areas.split(',') : []
        };
      });
      
      resolve(formattedOrders);
    });
  });
}

// Generate plain language summary for an executive order using Claude API
async function generatePlainLanguageSummary(order) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not found in environment');
  }
  
  console.log(`Generating plain language summary for ${order.order_number}: ${order.title}`);
  
  try {
    // Create a prompt for Claude with all available information
    const prompt = `
      Create a comprehensive yet accessible plain language summary of this executive order specifically for Yale University administrators. Your summary should balance detail with clarity - aim for around 400 words total across all sections to provide sufficient depth without overwhelming the reader.

      EXECUTIVE ORDER INFORMATION:
      Title: ${order.title}
      Order Number: ${order.order_number}
      Date: ${order.signing_date || 'Unknown'}
      President: ${order.president || 'Unknown'}
      Impact Level: ${order.impact_level || 'Unknown'}
      Categories: ${order.categories.join(', ')}
      University Impact Areas: ${order.university_impact_areas.join(', ')}
      
      Original Summary: ${order.summary || 'Not available'}
      
      Additional Text: ${order.full_text || ''}
      
      SUMMARY STRUCTURE:
      
      PART 1: EXECUTIVE SUMMARY
      1. Title: Create a clear, informative title (max 10 words) that captures the core purpose of the executive order.
      2. Overview: Provide a concise summary (2-3 sentences, ~50 words) that explains what the order does and its primary goal. Use plain language at an 8th-grade reading level.
      3. Bottom Line Up Front: In one sentence, state the most critical takeaway for Yale administrators.
      
      PART 2: YALE-SPECIFIC IMPACTS
      4. Key Impacts: Explain 3-5 specific ways this order affects Yale University. Focus on operational, financial, compliance, and strategic impacts. For each impact:
         - Clearly state what aspect of Yale's operations is affected
         - Explain how/why it's affected
         - Note the severity/significance of the impact
      5. Important Deadlines: List any specific dates, deadlines, or timelines that Yale administrators must know, formatted as MM/DD/YYYY: description.
      6. Affected Yale Departments: Based on the university impact areas, identify which specific Yale departments, offices, or units will need to respond (e.g., Office of Research Administration, Student Financial Services, etc.)
      
      PART 3: ACTION PLAN
      7. Required Action: Clearly state "Action Required: Yes/No" plus a 1-sentence justification.
      8. Immediate Steps (0-30 days): List 2-3 specific, actionable steps Yale should take immediately, with concrete details.
      9. Short-term Actions (1-3 months): List 2-3 specific follow-up actions needed within the next few months.
      10. Long-term Considerations: Note 1-2 strategic or ongoing activities needed for sustained compliance.
      11. Resource Requirements: Provide realistic estimates of:
          - Personnel needs (FTEs or hours)
          - Budget implications (approximate ranges if possible)
          - Technology or system changes required
          - External expertise needed (if any)
      
      WRITING GUIDELINES:
      - Write at an 8th-grade reading level, using clear language and short sentences (avg 15-20 words)
      - Use active voice and present tense where possible
      - Replace legal jargon with plain language alternatives
      - Use bullet points and numbered lists for better readability
      - Provide specific details rather than vague generalizations
      - Focus on practical implications rather than theoretical analysis
      - Be direct and candid about challenges and requirements
      
      Format your response as JSON with the following structure:
      {
        "title": "Clear, informative title",
        "overview": "Concise explanation of the order",
        "bottom_line": "The single most important takeaway",
        "impacts": [
          {"area": "Area 1", "description": "Detailed explanation of impact"},
          {"area": "Area 2", "description": "Detailed explanation of impact"},
          {"area": "Area 3", "description": "Detailed explanation of impact"}
        ],
        "action_needed": "Yes/No - with brief justification",
        "important_dates": ["MM/DD/YYYY: description", "MM/DD/YYYY: description"],
        "affected_departments": ["Department 1", "Department 2", "Department 3"],
        "immediate_steps": ["Specific step 1", "Specific step 2", "Specific step 3"],
        "short_term_actions": ["Action 1", "Action 2"],
        "long_term_considerations": ["Consideration 1", "Consideration 2"],
        "resource_requirements": {
          "personnel": "Estimate of personnel needs",
          "budget": "Estimate of budget implications",
          "technology": "Required technology changes",
          "external_expertise": "Required external expertise"
        }
      }
    `;
    
    // Call Claude API to generate the summary
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        system: "You are an expert in higher education administration with expertise in regulatory compliance, finance, operations, and government affairs. Your role is to translate complex executive orders into clear, actionable summaries specifically for Yale University administrators. You understand the organizational structure of research universities, how federal regulations impact university operations, and the practical steps required for implementation. Your summaries balance thoroughness with clarity - providing detailed enough guidance to be useful, while still being accessible to administrators without legal expertise.",
        messages: [
          {
            role: "user",
            content: prompt
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
    
    // Extract the JSON from the response
    const responseText = response.data.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const summary = JSON.parse(jsonMatch[0]);
      
      // Format the summary as HTML
      const formattedSummary = `
        <div class="summary-container" style="font-family: Arial, sans-serif; max-width: 800px; line-height: 1.5;">
          <!-- Executive Summary Section -->
          <div class="executive-summary" style="margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
            <h2 style="color: #00356b; font-size: 1.5rem; margin-bottom: 0.5rem;">${summary.title}</h2>
            <p style="font-size: 1rem; margin-bottom: 1rem;"><strong>Overview:</strong> ${summary.overview}</p>
            <p style="font-size: 1rem; background-color: #f0f9ff; padding: 0.75rem; border-left: 4px solid #00356b; font-weight: 500;">
              <strong>Bottom Line:</strong> ${summary.bottom_line}
            </p>
          </div>
          
          <!-- Yale-Specific Impacts Section -->
          <div class="impacts" style="margin-bottom: 1.5rem;">
            <h3 style="color: #00356b; font-size: 1.25rem; margin-bottom: 0.75rem;">Key Impacts on Yale:</h3>
            <div style="margin-bottom: 1rem;">
              ${summary.impacts.map(impact => `
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                  <p><strong>${impact.area}:</strong> ${impact.description}</p>
                </div>
              `).join('')}
            </div>
            
            ${Array.isArray(summary.important_dates) && summary.important_dates.length > 0 ? `
              <div style="margin-bottom: 1rem;">
                <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Important Dates:</h4>
                <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                  ${summary.important_dates.map(date => `<li>${date}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Affected Yale Departments:</h4>
              <p>${summary.affected_departments.join(', ')}</p>
            </div>
          </div>
          
          <!-- Action Plan Section -->
          <div class="action-plan" style="margin-bottom: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <h3 style="color: #00356b; font-size: 1.25rem; margin-bottom: 0.75rem;">Action Plan:</h3>
            
            <p style="font-weight: 500; margin-bottom: 1rem; ${summary.action_needed.startsWith('Yes') ? 'color: #b91c1c;' : 'color: #047857;'}">
              <strong>Action Required:</strong> ${summary.action_needed}
            </p>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Immediate Steps (0-30 days):</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summary.immediate_steps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Short-term Actions (1-3 months):</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summary.short_term_actions.map(action => `<li>${action}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Long-term Considerations:</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summary.long_term_considerations.map(consideration => `<li>${consideration}</li>`).join('')}
              </ul>
            </div>
          </div>
          
          <!-- Resource Requirements Section -->
          <div class="resources" style="margin-bottom: 1rem; background-color: #f9fafb; padding: 1rem; border-radius: 0.375rem;">
            <h3 style="color: #00356b; font-size: 1.25rem; margin-bottom: 0.75rem;">Resource Requirements:</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
              <div>
                <p><strong>Personnel:</strong> ${summary.resource_requirements.personnel}</p>
              </div>
              <div>
                <p><strong>Budget:</strong> ${summary.resource_requirements.budget}</p>
              </div>
              <div>
                <p><strong>Technology:</strong> ${summary.resource_requirements.technology}</p>
              </div>
              <div>
                <p><strong>External Expertise:</strong> ${summary.resource_requirements.external_expertise}</p>
              </div>
            </div>
          </div>
          
          <div style="font-size: 0.75rem; color: #6b7280; text-align: right; margin-top: 1rem;">
            Summary generated by Claude AI on ${new Date().toLocaleDateString()}
          </div>
        </div>
      `;
      
      return formattedSummary;
    } else {
      throw new Error('Failed to parse Claude response as JSON');
    }
  } catch (error) {
    console.error(`Error generating summary: ${error.message}`);
    return null;
  }
}

// Save the plain language summary to the database
async function savePlainLanguageSummary(orderId, summary) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE executive_orders SET plain_language_summary = ? WHERE id = ?`,
      [summary, orderId],
      function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(this.changes);
      }
    );
  });
}

// Main function
async function main() {
  try {
    // Setup database if needed
    await setupDatabase();
    
    // Get orders that need summaries
    const orders = await getOrdersForProcessing();
    console.log(`Found ${orders.length} orders that need plain language summaries`);
    
    if (orders.length === 0) {
      console.log('No orders need processing. Exiting.');
      db.close();
      return;
    }
    
    // Process each order
    let successCount = 0;
    for (const order of orders) {
      try {
        // Generate plain language summary
        const summary = await generatePlainLanguageSummary(order);
        
        if (summary) {
          // Save summary to database
          await savePlainLanguageSummary(order.id, summary);
          console.log(`Successfully processed ${order.order_number}: ${order.title}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing order ${order.order_number}: ${error.message}`);
      }
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Successfully generated ${successCount} plain language summaries`);
    console.log('Process completed.');
    
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    db.close();
  }
}

// Run the main function
main();