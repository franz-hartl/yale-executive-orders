/**
 * generate_plain_summaries.js
 * 
 * This script generates plain language summaries for executive orders in the database,
 * making them easier for higher education administrators to understand.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Open SQLite database
const dbPath = path.join(__dirname, 'executive_orders.db');
const db = new sqlite3.Database(dbPath);

// Check if all summary columns exist, add if not
async function setupDatabase() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(executive_orders)", [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Check if columns exist
      const hasPlainSummary = rows && rows.some(row => row.name === 'plain_language_summary');
      const hasExecutiveBrief = rows && rows.some(row => row.name === 'executive_brief');
      const hasComprehensiveAnalysis = rows && rows.some(row => row.name === 'comprehensive_analysis');
      
      const promises = [];
      
      if (!hasPlainSummary) {
        console.log('Adding plain_language_summary column to executive_orders table...');
        promises.push(new Promise((resolve, reject) => {
          db.run(`ALTER TABLE executive_orders ADD COLUMN plain_language_summary TEXT`, (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }));
      } else {
        console.log('plain_language_summary column already exists');
      }
      
      if (!hasExecutiveBrief) {
        console.log('Adding executive_brief column to executive_orders table...');
        promises.push(new Promise((resolve, reject) => {
          db.run(`ALTER TABLE executive_orders ADD COLUMN executive_brief TEXT`, (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }));
      } else {
        console.log('executive_brief column already exists');
      }
      
      if (!hasComprehensiveAnalysis) {
        console.log('Adding comprehensive_analysis column to executive_orders table...');
        promises.push(new Promise((resolve, reject) => {
          db.run(`ALTER TABLE executive_orders ADD COLUMN comprehensive_analysis TEXT`, (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        }));
      } else {
        console.log('comprehensive_analysis column already exists');
      }
      
      Promise.all(promises)
        .then(() => resolve())
        .catch(err => reject(err));
    });
  });
}

// Get all executive orders that need multi-level summaries
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
      WHERE eo.plain_language_summary IS NULL 
         OR eo.plain_language_summary = ''
         OR eo.executive_brief IS NULL 
         OR eo.executive_brief = ''
         OR eo.comprehensive_analysis IS NULL 
         OR eo.comprehensive_analysis = ''
      GROUP BY eo.id
      LIMIT 1
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

// Generate all three summary types for an executive order using Claude API
async function generateMultiLevelSummaries(order) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not found in environment');
  }
  
  console.log(`Generating multi-level summaries for ${order.order_number}: ${order.title}`);
  
  try {
    // Create a prompt for Claude with all available information
    const prompt = `
      Create three different levels of summaries for this executive order for higher education administrators. Each summary should be tailored to different time constraints and information needs:

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
      
      SUMMARY LEVELS:
      
      1. EXECUTIVE BRIEF (TL;DR) - Maximum 50 words
      - Provide an extremely concise 1-2 sentence summary
      - Focus only on the most critical point(s) relevant to higher education institutions
      - Use plain language at 6th-8th grade reading level
      - Should answer: "What's the one thing I absolutely need to know about this order?"
      
      2. STANDARD SUMMARY - 400 words
      Create a comprehensive yet accessible plain language summary with this structure:
      
      PART 1: EXECUTIVE SUMMARY
      - Title: Clear, informative title (max 10 words) that captures core purpose
      - Overview: Concise explanation (2-3 sentences) of what the order does and its primary goal
      - Bottom Line: One sentence stating the most critical takeaway for administrators
      
      PART 2: HIGHER EDUCATION IMPACTS
      - Key Impacts: 3-5 specific ways this order affects higher education institutions
      - Important Deadlines: Any specific dates or timelines administrators must know
      - Affected Departments: Which departments/offices will need to respond
      
      PART 3: ACTION PLAN
      - Required Action: "Yes/No" plus justification
      - Immediate Steps (0-30 days): 2-3 specific, actionable steps
      - Short-term Actions (1-3 months): 2-3 follow-up actions
      - Long-term Considerations: 1-2 strategic or ongoing activities
      - Resource Requirements: Estimates of personnel, budget, technology, and expertise needs
      
      3. COMPREHENSIVE ANALYSIS - 800-1000 words
      Provide a detailed analysis with all of the above plus:
      
      PART 4: DETAILED CONTEXT
      - Policy Background: Historical context and previous related policies
      - Legal Framework: Underlying statutory authority and regulatory implications
      - Industry/Sector Context: How this fits into broader trends affecting higher education
      
      PART 5: IMPLEMENTATION SPECIFICS
      - Compliance Details: Specific compliance requirements, metrics, and documentation
      - Technical Analysis: More detailed breakdown of technical/specialized aspects
      - Cross-functional Impacts: How this affects different institutional areas
      - Risk Analysis: Potential compliance risks and mitigation strategies
      
      PART 6: STRATEGIC CONSIDERATIONS
      - Competitive Implications: How this might advantage/disadvantage different types of institutions
      - Long-term Vision: How this fits into evolving higher education landscape
      - Advocacy Opportunities: Potential for institutional input on implementation
      
      WRITING GUIDELINES:
      - Maintain consistent formatting and structure across all three versions
      - Ensure each summary contains only the appropriate level of detail for its length
      - Use active voice and plain language (avoid legal jargon)
      - Make all three summaries standalone (don't reference content from other versions)
      - Analyze impacts across diverse institution types (public, private, large research universities, community colleges, etc.) with examples from different contexts
      - Never reference a specific institution by name
      - Consider impacts on institutions with different resource levels, missions, and student populations
      
      Format your response as JSON with the following structure:
      {
        "executive_brief": "1-2 sentence TL;DR summary",
        "standard_summary": {
          "title": "Clear title",
          "overview": "Concise explanation",
          "bottom_line": "Critical takeaway",
          "impacts": [
            {"area": "Area 1", "description": "Impact details"},
            {"area": "Area 2", "description": "Impact details"},
            {"area": "Area 3", "description": "Impact details"}
          ],
          "action_needed": "Yes/No with justification",
          "important_dates": ["MM/DD/YYYY: description", "MM/DD/YYYY: description"],
          "affected_departments": ["Department 1", "Department 2", "Department 3"],
          "immediate_steps": ["Step 1", "Step 2", "Step 3"],
          "short_term_actions": ["Action 1", "Action 2"],
          "long_term_considerations": ["Consideration 1", "Consideration 2"],
          "resource_requirements": {
            "personnel": "Personnel needs",
            "budget": "Budget implications",
            "technology": "Technology changes",
            "external_expertise": "External expertise"
          }
        },
        "comprehensive_analysis": {
          "title": "Detailed title",
          "overview": "Thorough explanation",
          "bottom_line": "Critical takeaway with nuance",
          "impacts": [
            {"area": "Area 1", "description": "Detailed impact analysis"},
            {"area": "Area 2", "description": "Detailed impact analysis"},
            {"area": "Area 3", "description": "Detailed impact analysis"},
            {"area": "Area 4", "description": "Detailed impact analysis"},
            {"area": "Area 5", "description": "Detailed impact analysis"}
          ],
          "policy_background": "Historical and policy context",
          "legal_framework": "Legal and regulatory details",
          "industry_context": "Higher education sector context",
          "action_needed": "Yes/No with detailed justification",
          "important_dates": ["MM/DD/YYYY: detailed description", "MM/DD/YYYY: detailed description"],
          "affected_departments": ["Department 1", "Department 2", "Department 3", "Department 4", "Department 5"],
          "immediate_steps": ["Detailed step 1", "Detailed step 2", "Detailed step 3", "Detailed step 4"],
          "short_term_actions": ["Detailed action 1", "Detailed action 2", "Detailed action 3"],
          "long_term_considerations": ["Detailed consideration 1", "Detailed consideration 2", "Detailed consideration 3"],
          "compliance_details": "Specific compliance requirements and documentation",
          "technical_analysis": "Specialized technical aspects",
          "cross_functional_impacts": "How this affects different areas",
          "risk_analysis": "Compliance risks and mitigation",
          "competitive_implications": "Advantages/disadvantages for institutions",
          "long_term_vision": "Future higher education landscape impact",
          "advocacy_opportunities": "Input opportunities on implementation",
          "resource_requirements": {
            "personnel": "Detailed personnel needs",
            "budget": "Detailed budget implications",
            "technology": "Detailed technology needs",
            "external_expertise": "Detailed external expertise"
          }
        }
      }
    `;
    
    // Call Claude API to generate the summaries
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        system: "You are an expert in higher education administration with expertise in regulatory compliance, finance, operations, and government affairs. Your role is to translate complex executive orders into clear, actionable summaries specifically for higher education administrators. You understand the organizational structure of research universities, how federal regulations impact university operations, and the practical steps required for implementation. Your summaries balance thoroughness with clarity and are tailored to different stakeholder needs and time constraints.",
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
      const summaries = JSON.parse(jsonMatch[0]);
      
      // Format the executive brief
      const executiveBrief = `
        <div class="executive-brief" style="font-family: Arial, sans-serif; max-width: 800px; line-height: 1.5; padding: 1rem; background-color: #f0f9ff; border-left: 4px solid #2563eb; font-weight: 500; margin-bottom: 1.5rem;">
          <h2 style="color: #1e3a8a; font-size: 1.25rem; margin-bottom: 0.5rem;">Executive Brief</h2>
          <p>${summaries.executive_brief}</p>
        </div>
      `;
      
      // Format the standard summary as HTML
      const standardSummary = `
        <div class="summary-container" style="font-family: Arial, sans-serif; max-width: 800px; line-height: 1.5;">
          <!-- Executive Summary Section -->
          <div class="executive-summary" style="margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
            <h2 style="color: #2563eb; font-size: 1.5rem; margin-bottom: 0.5rem;">${summaries.standard_summary.title}</h2>
            <p style="font-size: 1rem; margin-bottom: 1rem;"><strong>Overview:</strong> ${summaries.standard_summary.overview}</p>
            <p style="font-size: 1rem; background-color: #f0f9ff; padding: 0.75rem; border-left: 4px solid #2563eb; font-weight: 500;">
              <strong>Bottom Line:</strong> ${summaries.standard_summary.bottom_line}
            </p>
          </div>
          
          <!-- Higher Education Impacts Section -->
          <div class="impacts" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Key Impacts on Higher Education:</h3>
            <div style="margin-bottom: 1rem;">
              ${summaries.standard_summary.impacts.map(impact => `
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                  <p><strong>${impact.area}:</strong> ${impact.description}</p>
                </div>
              `).join('')}
            </div>
            
            ${Array.isArray(summaries.standard_summary.important_dates) && summaries.standard_summary.important_dates.length > 0 ? `
              <div style="margin-bottom: 1rem;">
                <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Important Dates:</h4>
                <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                  ${summaries.standard_summary.important_dates.map(date => `<li>${date}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Affected Departments:</h4>
              <p>${summaries.standard_summary.affected_departments.join(', ')}</p>
            </div>
          </div>
          
          <!-- Action Plan Section -->
          <div class="action-plan" style="margin-bottom: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Action Plan:</h3>
            
            <p style="font-weight: 500; margin-bottom: 1rem; ${summaries.standard_summary.action_needed.startsWith('Yes') ? 'color: #b91c1c;' : 'color: #047857;'}">
              <strong>Action Required:</strong> ${summaries.standard_summary.action_needed}
            </p>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Immediate Steps (0-30 days):</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summaries.standard_summary.immediate_steps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Short-term Actions (1-3 months):</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summaries.standard_summary.short_term_actions.map(action => `<li>${action}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Long-term Considerations:</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summaries.standard_summary.long_term_considerations.map(consideration => `<li>${consideration}</li>`).join('')}
              </ul>
            </div>
          </div>
          
          <!-- Resource Requirements Section -->
          <div class="resources" style="margin-bottom: 1rem; background-color: #f9fafb; padding: 1rem; border-radius: 0.375rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Resource Requirements:</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
              <div>
                <p><strong>Personnel:</strong> ${summaries.standard_summary.resource_requirements.personnel}</p>
              </div>
              <div>
                <p><strong>Budget:</strong> ${summaries.standard_summary.resource_requirements.budget}</p>
              </div>
              <div>
                <p><strong>Technology:</strong> ${summaries.standard_summary.resource_requirements.technology}</p>
              </div>
              <div>
                <p><strong>External Expertise:</strong> ${summaries.standard_summary.resource_requirements.external_expertise}</p>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Format the comprehensive analysis as HTML
      const comprehensiveAnalysis = `
        <div class="comprehensive-analysis" style="font-family: Arial, sans-serif; max-width: 800px; line-height: 1.5;">
          <!-- Executive Summary Section -->
          <div class="executive-summary" style="margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
            <h2 style="color: #2563eb; font-size: 1.5rem; margin-bottom: 0.5rem;">${summaries.comprehensive_analysis.title}</h2>
            <p style="font-size: 1rem; margin-bottom: 1rem;"><strong>Overview:</strong> ${summaries.comprehensive_analysis.overview}</p>
            <p style="font-size: 1rem; background-color: #f0f9ff; padding: 0.75rem; border-left: 4px solid #2563eb; font-weight: 500;">
              <strong>Bottom Line:</strong> ${summaries.comprehensive_analysis.bottom_line}
            </p>
          </div>
          
          <!-- Context Section -->
          <div class="context" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Policy Context:</h3>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Policy Background:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.policy_background}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Legal Framework:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.legal_framework}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Higher Education Context:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.industry_context}</p>
            </div>
          </div>
          
          <!-- Higher Education Impacts Section -->
          <div class="impacts" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Key Impacts on Higher Education:</h3>
            <div style="margin-bottom: 1rem;">
              ${summaries.comprehensive_analysis.impacts.map(impact => `
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                  <p><strong>${impact.area}:</strong> ${impact.description}</p>
                </div>
              `).join('')}
            </div>
            
            ${Array.isArray(summaries.comprehensive_analysis.important_dates) && summaries.comprehensive_analysis.important_dates.length > 0 ? `
              <div style="margin-bottom: 1rem;">
                <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Important Dates:</h4>
                <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                  ${summaries.comprehensive_analysis.important_dates.map(date => `<li>${date}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Affected Departments:</h4>
              <p>${summaries.comprehensive_analysis.affected_departments.join(', ')}</p>
            </div>
          </div>
          
          <!-- Implementation Specifics -->
          <div class="implementation" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Implementation Details:</h3>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Compliance Requirements:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.compliance_details}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Technical Analysis:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.technical_analysis}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Cross-Functional Impacts:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.cross_functional_impacts}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Risk Analysis:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.risk_analysis}</p>
            </div>
          </div>
          
          <!-- Strategic Considerations -->
          <div class="strategic" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Strategic Considerations:</h3>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Competitive Implications:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.competitive_implications}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Long-term Vision:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.long_term_vision}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Advocacy Opportunities:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.advocacy_opportunities}</p>
            </div>
          </div>
          
          <!-- Action Plan Section -->
          <div class="action-plan" style="margin-bottom: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Action Plan:</h3>
            
            <p style="font-weight: 500; margin-bottom: 1rem; ${summaries.comprehensive_analysis.action_needed.startsWith('Yes') ? 'color: #b91c1c;' : 'color: #047857;'}">
              <strong>Action Required:</strong> ${summaries.comprehensive_analysis.action_needed}
            </p>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Immediate Steps (0-30 days):</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summaries.comprehensive_analysis.immediate_steps.map(step => `<li>${step}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Short-term Actions (1-3 months):</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summaries.comprehensive_analysis.short_term_actions.map(action => `<li>${action}</li>`).join('')}
              </ul>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Long-term Considerations:</h4>
              <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                ${summaries.comprehensive_analysis.long_term_considerations.map(consideration => `<li>${consideration}</li>`).join('')}
              </ul>
            </div>
          </div>
          
          <!-- Resource Requirements Section -->
          <div class="resources" style="margin-bottom: 1rem; background-color: #f9fafb; padding: 1rem; border-radius: 0.375rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Resource Requirements:</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
              <div>
                <p><strong>Personnel:</strong> ${summaries.comprehensive_analysis.resource_requirements.personnel}</p>
              </div>
              <div>
                <p><strong>Budget:</strong> ${summaries.comprehensive_analysis.resource_requirements.budget}</p>
              </div>
              <div>
                <p><strong>Technology:</strong> ${summaries.comprehensive_analysis.resource_requirements.technology}</p>
              </div>
              <div>
                <p><strong>External Expertise:</strong> ${summaries.comprehensive_analysis.resource_requirements.external_expertise}</p>
              </div>
            </div>
          </div>
          
          <div style="font-size: 0.75rem; color: #6b7280; text-align: right; margin-top: 1rem;">
            Summary generated by Claude AI on ${new Date().toLocaleDateString()}
          </div>
        </div>
      `;
      
      return {
        executiveBrief,
        standardSummary,
        comprehensiveAnalysis
      };
    } else {
      throw new Error('Failed to parse Claude response as JSON');
    }
  } catch (error) {
    console.error(`Error generating summaries: ${error.message}`);
    return null;
  }
}

// Save all summary types to the database
async function saveSummaries(orderId, summaries) {
  return new Promise((resolve, reject) => {
    const { executiveBrief, standardSummary, comprehensiveAnalysis } = summaries;
    
    db.run(
      `UPDATE executive_orders 
       SET plain_language_summary = ?, 
           executive_brief = ?, 
           comprehensive_analysis = ? 
       WHERE id = ?`,
      [standardSummary, executiveBrief, comprehensiveAnalysis, orderId],
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
    console.log(`Found ${orders.length} orders that need multi-level summaries`);
    
    if (orders.length === 0) {
      console.log('No orders need processing. Exiting.');
      db.close();
      return;
    }
    
    // Process each order
    let successCount = 0;
    for (const order of orders) {
      try {
        // Generate all summary types
        const summaries = await generateMultiLevelSummaries(order);
        
        if (summaries) {
          // Save summaries to database
          await saveSummaries(order.id, summaries);
          console.log(`Successfully processed multi-level summaries for ${order.order_number}: ${order.title}`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing order ${order.order_number}: ${error.message}`);
      }
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Successfully generated ${successCount} multi-level summaries`);
    console.log('Process completed.');
    
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    db.close();
  }
}

// Run the main function
main();