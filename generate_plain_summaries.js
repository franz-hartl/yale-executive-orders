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
    // Create a streamlined prompt for Claude with essential information
    const prompt = `
      Create three different levels of summaries for this executive order specifically for private R1 research university administrators. Focus entirely on the implications, requirements, and implementation steps for private research universities with very high research activity:

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
      
      FORMAT YOUR RESPONSE SPECIFICALLY FOR PRIVATE R1 RESEARCH UNIVERSITIES, focusing on their unique characteristics:
      - Very high research activity (annual research expenditures >$100M)
      - Substantial endowments
      - Significant international presence
      - Strong graduate and professional programs
      - Extensive research infrastructure
      
      Format your response as JSON with this structure:
      {
        "executive_brief": "1-2 sentence TL;DR summary specifically for private R1 universities",
        "standard_summary": {
          "title": "Clear title focused on private R1 implications",
          "overview": "Concise explanation for research universities",
          "bottom_line": "Critical takeaway for private R1 administrators",
          "impact_rating": "Impact level specifically for private R1s (Critical/High/Moderate/Low/Minimal)",
          "key_research_implications": "How this affects research operations and funding",
          "key_functional_areas": [
            {"area": "Research Area 1", "description": "Impact details for research universities"},
            {"area": "Area 2", "description": "Impact details for private R1s"},
            {"area": "Area 3", "description": "Impact details for research-intensive context"}
          ],
          "action_needed": "Yes/No with justification for private R1 context",
          "important_dates": ["MM/DD/YYYY: description relevant to private R1 universities"],
          "affected_departments": ["Department 1", "Department 2", "Department 3"],
          "immediate_steps": [
            {"action": "Step 1 for private R1 implementation"},
            {"action": "Step 2 for private R1 implementation"}
          ],
          "short_term_actions": [
            {"action": "Action 1 for private R1 implementation"},
            {"action": "Action 2 for private R1 implementation"}
          ],
          "long_term_considerations": ["Private R1 consideration 1", "Private R1 consideration 2"],
          "resource_requirements": {
            "personnel": "Personnel needs for private R1 implementation",
            "budget": "Budget implications for private R1 implementation",
            "technology": "Technology changes for private R1 implementation",
            "external_expertise": "External expertise for private R1 implementation"
          }
        },
        "comprehensive_analysis": {
          "title": "Detailed title with private R1 focus",
          "overview": "Thorough explanation for private research universities",
          "bottom_line": "Critical takeaway with private R1 nuance",
          "research_impact_analysis": {
            "research_security": "Impact on research security requirements",
            "international_collaboration": "Impact on international research partnerships",
            "funding_implications": "Impact on research funding mechanisms",
            "compliance_burden": "Assessment of compliance requirements",
            "competitive_position": "How this affects institutional competitive position"
          },
          "key_focus_areas": [
            {
              "area": "Research Area 1", 
              "description": "Detailed impact analysis for private R1 context",
              "implementation_considerations": "Specific implementation details for research universities"
            },
            {
              "area": "Area 2", 
              "description": "Detailed impact analysis for private R1 context",
              "implementation_considerations": "Specific implementation details for research universities"
            }
          ],
          "exemptions_special_provisions": "Detailed analysis of any exemptions relevant to private R1 universities",
          "policy_background": "Historical and policy context relevant to research universities",
          "legal_framework": "Legal and regulatory details most relevant to private R1s",
          "research_sector_context": "How this affects the research university landscape",
          "action_needed": "Yes/No with detailed justification for private R1 universities",
          "important_dates": [
            {
              "date": "MM/DD/YYYY", 
              "description": "detailed description relevant to private R1 implementation",
              "priority_level": "Importance level for private R1 administrators"
            }
          ],
          "affected_departments": {
            "primary": ["Most affected departments at private R1s"],
            "secondary": ["Secondarily affected departments at private R1s"]
          },
          "implementation_strategy": [
            {
              "phase": "Immediate (0-30 days)",
              "actions": [
                "Detailed private R1 step 1", 
                "Detailed private R1 step 2"
              ],
              "key_considerations": "Critical implementation factors"
            },
            {
              "phase": "Short-term (1-3 months)",
              "actions": [
                "Detailed private R1 action 1",
                "Detailed private R1 action 2"
              ],
              "key_considerations": "Critical implementation factors"
            },
            {
              "phase": "Long-term (4+ months)",
              "actions": [
                "Detailed private R1 action 1",
                "Detailed private R1 action 2"
              ],
              "key_considerations": "Critical implementation factors"
            }
          ],
          "specialized_analysis": {
            "research_competitiveness": "How this affects competitive position in research",
            "talent_acquisition": "Impact on faculty/researcher recruitment and retention",
            "institutional_autonomy": "Effects on institutional independence and governance",
            "financial_implications": "Detailed financial analysis for private R1 context",
            "reputation_management": "Reputation and brand considerations"
          },
          "compliance_details": {
            "core_requirements": "Essential compliance requirements for private R1s",
            "documentation_needs": "Required documentation and record-keeping",
            "reporting_obligations": "Ongoing reporting requirements",
            "audit_considerations": "Audit and oversight implications"
          },
          "technical_analysis": "Specialized technical aspects for research context",
          "cross_functional_impacts": "How this affects different areas of a private R1 university",
          "risk_analysis": {
            "research_risks": "Risks specific to research operations",
            "financial_risks": "Financial and endowment-related risks",
            "compliance_risks": "Risk of non-compliance for private R1 context",
            "operational_risks": "Day-to-day operational risks",
            "strategic_risks": "Long-term strategic position risks"
          },
          "advocacy_opportunities": "Opportunities for private R1 input on implementation",
          "resource_requirements": {
            "personnel": "Personnel needs for private R1 implementation",
            "budget": "Budget implications for private R1 implementation",
            "technology": "Technology needs for private R1 implementation",
            "external_expertise": "External expertise needs for private R1 implementation"
          }
        }
      }
    `;
    
    // Call Claude API to generate the summaries
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-opus-20240229",
        max_tokens: 3500,
        system: "You are an expert in private R1 research university administration with specialized expertise in policy domains relevant to research-intensive private universities. You have deep expertise in how federal policies specifically affect private research universities with very high research activity, substantial endowments, and significant international presence.
        
Your primary role is to translate complex executive orders into clear, actionable summaries for private R1 university administrators, focusing specifically on the implications, requirements, and implementation steps for these institutions. While you may briefly mention other institution types for context, your analysis should always prioritize and emphasize the private R1 university perspective.

You have particular expertise in:
1. Research Funding & Security - Understanding complex research security requirements, export controls, and international collaboration oversight that affect major research universities
2. Advanced Research Programs - Analyzing impacts on specialized research initiatives, major laboratory operations, and high-priority research areas
3. International Collaboration - Evaluating effects on global academic partnerships, scholar mobility, and international research networks
4. Endowment Management - Assessing implications for large endowment investment policies, reporting requirements, and financial regulations
5. Graduate Education - Understanding impacts on doctoral programs, postdoctoral researchers, and research training grants",
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
          <div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="color: #1e3a8a; font-size: 1.25rem; margin: 0;">Executive Brief</h2>
            <div style="font-size: 0.75rem; background-color: #dbeafe; padding: 0.25rem 0.5rem; border-radius: 0.25rem; color: #1e40af;">PRIVATE R1 FOCUS</div>
          </div>
          <p>${summaries.executive_brief}</p>
        </div>
      `;
      
      // Format the standard summary as HTML
      const standardSummary = `
        <div class="summary-container" style="font-family: Arial, sans-serif; max-width: 800px; line-height: 1.5;">
          <!-- Executive Summary Section -->
          <div class="executive-summary" style="margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
            <div style="background-color: #f0f9ff; padding: 0.5rem; margin-bottom: 0.5rem; display: inline-block; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; color: #2563eb;">PRIVATE R1 UNIVERSITY ANALYSIS</div>
            <h2 style="color: #2563eb; font-size: 1.5rem; margin-bottom: 0.5rem;">${summaries.standard_summary.title}</h2>
            <p style="font-size: 1rem; margin-bottom: 1rem;"><strong>Overview:</strong> ${summaries.standard_summary.overview}</p>
            <p style="font-size: 1rem; background-color: #f0f9ff; padding: 0.75rem; border-left: 4px solid #2563eb; font-weight: 500;">
              <strong>Bottom Line for Private R1s:</strong> ${summaries.standard_summary.bottom_line}
            </p>
          </div>
          
          <!-- Private R1 Impact Section -->
          <div class="impacts" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Private R1 University Impact:</h3>
            
            <!-- Impact Rating -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem; border-left: 4px solid #2563eb;">
              <p style="margin: 0; font-weight: 600; color: #2563eb;">Impact Rating for Private R1 Universities: ${summaries.standard_summary.impact_rating}</p>
            </div>
            
            <!-- Research Implications -->
            <div style="margin-bottom: 1rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
              <p><strong>Research Implications:</strong> ${summaries.standard_summary.key_research_implications}</p>
            </div>
            
            <!-- Key Functional Areas -->
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Key Functional Areas Affected:</h4>
              <div style="margin-bottom: 1rem;">
                ${summaries.standard_summary.key_functional_areas.map(area => `
                  <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                    <p><strong>${area.area}:</strong> ${area.description}</p>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <!-- Important Dates -->
            ${Array.isArray(summaries.standard_summary.important_dates) && summaries.standard_summary.important_dates.length > 0 ? `
              <div style="margin-bottom: 1rem;">
                <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Important Dates:</h4>
                <ul style="padding-left: 1.5rem; margin-bottom: 1rem;">
                  ${summaries.standard_summary.important_dates.map(date => `<li>${date}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
            
            <!-- Affected Departments -->
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Affected Departments:</h4>
              <p>${summaries.standard_summary.affected_departments.join(', ')}</p>
            </div>
          </div>
          
          <!-- Private R1 Action Plan Section -->
          <div class="action-plan" style="margin-bottom: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Private R1 Implementation Plan:</h3>
            
            <p style="font-weight: 500; margin-bottom: 1rem; ${summaries.standard_summary.action_needed.startsWith('Yes') ? 'color: #b91c1c;' : 'color: #047857;'}">
              <strong>Action Required:</strong> ${summaries.standard_summary.action_needed}
            </p>
            
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Immediate Steps (0-30 days):</h4>
              ${summaries.standard_summary.immediate_steps.map(step => `
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                  <p style="margin: 0;"><strong>${step.action}</strong></p>
                </div>
              `).join('')}
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Short-term Actions (1-3 months):</h4>
              ${summaries.standard_summary.short_term_actions.map(action => `
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                  <p style="margin: 0;"><strong>${action.action}</strong></p>
                </div>
              `).join('')}
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
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Resource Requirements for Private R1 Implementation:</h3>
            <div style="display: grid; gap: 1rem;">
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
          
          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.875rem; color: #6b7280;">
            Analysis specifically tailored for private R1 research universities
          </div>
        </div>
      `;
      
      // Format the comprehensive analysis as HTML
      const comprehensiveAnalysis = `
        <div class="comprehensive-analysis" style="font-family: Arial, sans-serif; max-width: 800px; line-height: 1.5;">
          <!-- Executive Summary Section -->
          <div class="executive-summary" style="margin-bottom: 1.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 1rem;">
            <div style="background-color: #f0f9ff; padding: 0.5rem; margin-bottom: 0.5rem; display: inline-block; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; color: #2563eb;">PRIVATE R1 UNIVERSITY COMPREHENSIVE ANALYSIS</div>
            <h2 style="color: #2563eb; font-size: 1.5rem; margin-bottom: 0.5rem;">${summaries.comprehensive_analysis.title}</h2>
            <p style="font-size: 1rem; margin-bottom: 1rem;"><strong>Overview:</strong> ${summaries.comprehensive_analysis.overview}</p>
            <p style="font-size: 1rem; background-color: #f0f9ff; padding: 0.75rem; border-left: 4px solid #2563eb; font-weight: 500;">
              <strong>Bottom Line for Private R1s:</strong> ${summaries.comprehensive_analysis.bottom_line}
            </p>
          </div>
          
          <!-- Research Impact Analysis Section -->
          <div class="research-impact" style="margin-bottom: 2rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 1rem;">Research Impact Analysis</h3>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Research Security</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.research_impact_analysis.research_security}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">International Collaboration</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.research_impact_analysis.international_collaboration}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Funding Implications</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.research_impact_analysis.funding_implications}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Compliance Burden</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.research_impact_analysis.compliance_burden}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Competitive Position</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.research_impact_analysis.competitive_position}</p>
              </div>
            </div>
          </div>
          
          <!-- Context Section -->
          <div class="context" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Policy Context for Research Universities:</h3>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Policy Background:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.policy_background}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Legal Framework:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.legal_framework}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Research Sector Context:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.research_sector_context}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Exemptions & Special Provisions:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.exemptions_special_provisions}</p>
            </div>
          </div>
          
          <!-- Key Focus Areas Section -->
          <div class="key-focus-areas" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Key Focus Areas for Private R1s:</h3>
            <div style="margin-bottom: 1rem;">
              ${summaries.comprehensive_analysis.key_focus_areas.map(area => `
                <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                  <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                    <h4 style="margin: 0; font-size: 1.1rem;">${area.area}</h4>
                  </div>
                  <div style="padding: 1rem;">
                    <p style="margin-bottom: 0.75rem;">${area.description}</p>
                    <p style="margin: 0; font-style: italic; color: #4b5563;"><strong>Implementation Considerations:</strong> ${area.implementation_considerations}</p>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- Important Dates with Priority Levels -->
            ${Array.isArray(summaries.comprehensive_analysis.important_dates) && summaries.comprehensive_analysis.important_dates.length > 0 ? `
              <div style="margin-bottom: 1.5rem;">
                <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Important Dates for Private R1 Implementation:</h4>
                ${summaries.comprehensive_analysis.important_dates.map(date => `
                  <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                    <p style="margin-bottom: 0.25rem;"><strong>${date.date}:</strong> ${date.description}</p>
                    <p style="margin: 0; font-size: 0.875rem; color: #4b5563; font-style: italic;"><strong>Priority Level:</strong> ${date.priority_level}</p>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Affected Departments:</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <h5 style="font-size: 0.9rem; margin-bottom: 0.5rem; color: #2563eb;">Primary:</h5>
                  <ul style="margin: 0; padding-left: 1.5rem;">
                    ${summaries.comprehensive_analysis.affected_departments.primary.map(dept => `<li>${dept}</li>`).join('')}
                  </ul>
                </div>
                <div>
                  <h5 style="font-size: 0.9rem; margin-bottom: 0.5rem; color: #4b5563;">Secondary:</h5>
                  <ul style="margin: 0; padding-left: 1.5rem;">
                    ${summaries.comprehensive_analysis.affected_departments.secondary.map(dept => `<li>${dept}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Implementation Strategy -->
          <div class="implementation-strategy" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Private R1 Implementation Strategy:</h3>
            
            ${summaries.comprehensive_analysis.implementation_strategy.map(phase => `
              <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                  <h4 style="margin: 0; font-size: 1.1rem;">${phase.phase}</h4>
                </div>
                <div style="padding: 1rem;">
                  <ul style="margin-top: 0; margin-bottom: 0.75rem; padding-left: 1.5rem;">
                    ${phase.actions.map(action => `<li style="margin-bottom: 0.25rem;">${action}</li>`).join('')}
                  </ul>
                  <p style="margin: 0; font-style: italic; color: #4b5563;"><strong>Key Considerations:</strong> ${phase.key_considerations}</p>
                </div>
              </div>
            `).join('')}
            
            <p style="font-weight: 500; margin: 1rem 0; ${summaries.comprehensive_analysis.action_needed.startsWith('Yes') ? 'color: #b91c1c;' : 'color: #047857;'}">
              <strong>Action Required:</strong> ${summaries.comprehensive_analysis.action_needed}
            </p>
          </div>
          
          <!-- Specialized Analysis Section -->
          <div class="specialized-analysis" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Specialized Analysis for Private R1 Universities:</h3>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Research Competitiveness:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.specialized_analysis.research_competitiveness}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Talent Acquisition:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.specialized_analysis.talent_acquisition}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Institutional Autonomy:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.specialized_analysis.institutional_autonomy}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Financial Implications:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.specialized_analysis.financial_implications}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Reputation Management:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.specialized_analysis.reputation_management}</p>
            </div>
          </div>
          
          <!-- Compliance Details Section -->
          <div class="compliance-details" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Private R1 Compliance Details:</h3>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Core Requirements</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.compliance_details.core_requirements}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Documentation Needs</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.compliance_details.documentation_needs}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Reporting Obligations</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.compliance_details.reporting_obligations}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Audit Considerations</h4>
              </div>
              <div style="padding: 1rem;">
                <p>${summaries.comprehensive_analysis.compliance_details.audit_considerations}</p>
              </div>
            </div>
          </div>
          
          <!-- Technical Analysis & Cross-Functional Impacts -->
          <div style="margin-bottom: 1.5rem;">
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Technical Analysis:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.technical_analysis}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Cross-Functional Impacts:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.cross_functional_impacts}</p>
            </div>
          </div>
          
          <!-- Risk Analysis Section -->
          <div class="risk-analysis" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Risk Analysis for Private R1 Universities:</h3>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
              <div style="border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                  <h4 style="margin: 0; font-size: 1rem;">Research Risks</h4>
                </div>
                <div style="padding: 0.75rem;">
                  <p style="margin: 0;">${summaries.comprehensive_analysis.risk_analysis.research_risks}</p>
                </div>
              </div>
              
              <div style="border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                  <h4 style="margin: 0; font-size: 1rem;">Financial Risks</h4>
                </div>
                <div style="padding: 0.75rem;">
                  <p style="margin: 0;">${summaries.comprehensive_analysis.risk_analysis.financial_risks}</p>
                </div>
              </div>
              
              <div style="border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                  <h4 style="margin: 0; font-size: 1rem;">Compliance Risks</h4>
                </div>
                <div style="padding: 0.75rem;">
                  <p style="margin: 0;">${summaries.comprehensive_analysis.risk_analysis.compliance_risks}</p>
                </div>
              </div>
              
              <div style="border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                  <h4 style="margin: 0; font-size: 1rem;">Operational Risks</h4>
                </div>
                <div style="padding: 0.75rem;">
                  <p style="margin: 0;">${summaries.comprehensive_analysis.risk_analysis.operational_risks}</p>
                </div>
              </div>
              
              <div style="border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                  <h4 style="margin: 0; font-size: 1rem;">Strategic Risks</h4>
                </div>
                <div style="padding: 0.75rem;">
                  <p style="margin: 0;">${summaries.comprehensive_analysis.risk_analysis.strategic_risks}</p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Advocacy Opportunities -->
          <div style="margin-bottom: 1.5rem; padding: 1rem; background-color: #f0f9ff; border-radius: 0.375rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Advocacy Opportunities:</h3>
            <p>${summaries.comprehensive_analysis.advocacy_opportunities}</p>
          </div>
          
          <!-- Resource Requirements Section -->
          <div class="resources" style="margin-bottom: 1rem; background-color: #f9fafb; padding: 1rem; border-radius: 0.375rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Resource Requirements for Private R1 Implementation:</h3>
            
            <div style="display: grid; gap: 1rem;">
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
          
          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; text-align: center; font-size: 0.875rem; color: #6b7280;">
            Comprehensive analysis specifically tailored for private R1 research universities<br>
            Generated by Claude AI on ${new Date().toLocaleDateString()}
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

// Export functions for use in regenerate_r1_summaries.js
module.exports = {
  generateMultiLevelSummaries,
  saveSummaries
};

// Run the main function
main();