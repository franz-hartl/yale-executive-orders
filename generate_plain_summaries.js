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
      Create three different levels of summaries for this executive order for higher education administrators, focusing on differentiated impact by institution type:

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
      
      Format your response as JSON with this structure:
      {
        "executive_brief": "1-2 sentence TL;DR summary with institution variation note if applicable",
        "standard_summary": {
          "title": "Clear title",
          "overview": "Concise explanation",
          "bottom_line": "Critical takeaway",
          "impact_matrix": {
            "r1_universities": "Impact assessment",
            "r2_universities": "Impact assessment",
            "masters_universities": "Impact assessment",
            "baccalaureate_colleges": "Impact assessment",
            "community_colleges": "Impact assessment",
            "specialized_institutions": "Impact assessment"
          },
          "key_functional_areas": [
            {"area": "Area 1", "description": "Impact details"},
            {"area": "Area 2", "description": "Impact details"},
            {"area": "Area 3", "description": "Impact details"}
          ],
          "action_needed": "Yes/No with justification and exemption notes",
          "important_dates": ["MM/DD/YYYY: description with variation notes"],
          "affected_departments": ["Department 1", "Department 2", "Department 3"],
          "immediate_steps": [
            {"action": "Step 1", "variations": "Institution-specific notes"},
            {"action": "Step 2", "variations": "Institution-specific notes"}
          ],
          "short_term_actions": [
            {"action": "Action 1", "variations": "Institution-specific notes"},
            {"action": "Action 2", "variations": "Institution-specific notes"}
          ],
          "long_term_considerations": ["Consideration 1", "Consideration 2"],
          "resource_requirements": {
            "personnel": "Personnel needs with variation notes",
            "budget": "Budget implications with variation notes",
            "technology": "Technology changes with variation notes",
            "external_expertise": "External expertise with variation notes"
          }
        },
        "comprehensive_analysis": {
          "title": "Detailed title",
          "overview": "Thorough explanation",
          "bottom_line": "Critical takeaway with nuance",
          "institution_impact_matrix": {
            "r1_universities": {
              "overall_impact": "Impact level (1-5) with explanation",
              "key_affected_areas": ["Area 1", "Area 2", "Area 3"],
              "relative_burden": "Assessment of relative implementation burden"
            },
            "r2_universities": {
              "overall_impact": "Impact level (1-5) with explanation",
              "key_affected_areas": ["Area 1", "Area 2"],
              "relative_burden": "Assessment of relative implementation burden"
            },
            "masters_universities": {
              "overall_impact": "Impact level (1-5) with explanation",
              "key_affected_areas": ["Area 1", "Area 2"],
              "relative_burden": "Assessment of relative implementation burden"
            },
            "baccalaureate_colleges": {
              "overall_impact": "Impact level (1-5) with explanation",
              "key_affected_areas": ["Area 1", "Area 2"],
              "relative_burden": "Assessment of relative implementation burden"
            },
            "community_colleges": {
              "overall_impact": "Impact level (1-5) with explanation",
              "key_affected_areas": ["Area 1", "Area 2"],
              "relative_burden": "Assessment of relative implementation burden"
            },
            "specialized_institutions": {
              "overall_impact": "Impact level (1-5) with explanation",
              "key_affected_areas": ["Area 1", "Area 2"],
              "relative_burden": "Assessment of relative implementation burden"
            }
          },
          "functional_area_impacts": [
            {
              "area": "Area 1", 
              "description": "Detailed impact analysis",
              "institution_variations": "How impact varies by institution type"
            },
            {
              "area": "Area 2", 
              "description": "Detailed impact analysis",
              "institution_variations": "How impact varies by institution type"
            }
          ],
          "exemptions_special_provisions": "Detailed analysis of any exemptions or special provisions",
          "policy_background": "Historical and policy context",
          "legal_framework": "Legal and regulatory details",
          "industry_context": "Higher education sector context",
          "action_needed": "Yes/No with detailed justification and exemption notes",
          "important_dates": [
            {
              "date": "MM/DD/YYYY", 
              "description": "detailed description",
              "institution_variations": "Timeline variations by institution type"
            }
          ],
          "affected_departments": ["Department 1", "Department 2", "Department 3"],
          "immediate_steps": [
            {
              "action": "Detailed step 1", 
              "r1_focus": "R1-specific guidance",
              "small_institution_focus": "Small institution guidance"
            },
            {
              "action": "Detailed step 2", 
              "r1_focus": "R1-specific guidance",
              "small_institution_focus": "Small institution guidance"
            }
          ],
          "short_term_actions": [
            {
              "action": "Detailed action 1",
              "institution_variations": "Action variations by institution type"
            },
            {
              "action": "Detailed action 2",
              "institution_variations": "Action variations by institution type"
            }
          ],
          "long_term_considerations": ["Detailed consideration 1", "Detailed consideration 2"],
          "compliance_details": {
            "general_requirements": "Universal compliance requirements",
            "r1_requirements": "R1-specific requirements",
            "small_institution_requirements": "Small institution requirements"
          },
          "technical_analysis": "Specialized technical aspects",
          "cross_functional_impacts": "How this affects different areas",
          "risk_analysis": {
            "general_risks": "Universal compliance risks",
            "r1_specific_risks": "Risks specific to research universities",
            "small_institution_risks": "Risks specific to smaller institutions"
          },
          "competitive_implications": "Advantages/disadvantages for different institution types",
          "long_term_vision": "Future higher education landscape impact",
          "advocacy_opportunities": "Input opportunities on implementation",
          "resource_requirements": {
            "personnel": {
              "large_institutions": "Personnel needs for large institutions",
              "medium_institutions": "Personnel needs for medium institutions",
              "small_institutions": "Personnel needs for small institutions"
            },
            "budget": {
              "large_institutions": "Budget implications for large institutions",
              "medium_institutions": "Budget implications for medium institutions",
              "small_institutions": "Budget implications for small institutions"
            },
            "technology": {
              "large_institutions": "Technology needs for large institutions",
              "medium_institutions": "Technology needs for medium institutions",
              "small_institutions": "Technology needs for small institutions"
            },
            "external_expertise": {
              "large_institutions": "External expertise for large institutions",
              "medium_institutions": "External expertise for medium institutions",
              "small_institutions": "External expertise for small institutions"
            }
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
        system: "You are an expert in higher education administration with specialized expertise in policy domains relevant to colleges and universities of all types. You have deep expertise in institutional differentiation and understand how federal policies affect various institutions differently based on their type, size, mission, resources, and other characteristics.
        
Your primary role is to translate complex executive orders into clear, actionable summaries for higher education administrators while explicitly addressing how impacts, requirements, and implementation steps vary across different institutional contexts. You recognize that the higher education sector is diverse - from large R1 research universities with medical schools to small community colleges with workforce development missions.

You have particular expertise in:
1. Research Funding & Science Policy - Understanding how research requirements scale with institution size and research volume
2. Diversity, Equity & Inclusion - Analyzing impacts across institutions with different student demographics and missions
3. Immigration & International Programs - Evaluating how international engagement level affects policy impacts
4. Labor & Employment - Assessing workforce implications with sensitivity to institution size and staffing models
5. Regulatory Compliance - Identifying threshold-based requirements and exemptions based on institution type",
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
          
          <!-- Institution-Specific Impacts Section -->
          <div class="impacts" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Institution-Specific Impacts:</h3>
            
            <!-- Impact Matrix Table -->
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Impact by Institution Type:</h4>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                  <thead>
                    <tr style="background-color: #f3f4f6; text-align: left;">
                      <th style="padding: 0.5rem; border: 1px solid #e5e7eb;">Institution Type</th>
                      <th style="padding: 0.5rem; border: 1px solid #e5e7eb;">Impact Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb; font-weight: 500;">R1 Research Universities</td>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${summaries.standard_summary.impact_matrix.r1_universities}</td>
                    </tr>
                    <tr>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb; font-weight: 500;">R2 Research Universities</td>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${summaries.standard_summary.impact_matrix.r2_universities}</td>
                    </tr>
                    <tr>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb; font-weight: 500;">Master's Universities</td>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${summaries.standard_summary.impact_matrix.masters_universities}</td>
                    </tr>
                    <tr>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb; font-weight: 500;">Baccalaureate Colleges</td>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${summaries.standard_summary.impact_matrix.baccalaureate_colleges}</td>
                    </tr>
                    <tr>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb; font-weight: 500;">Community Colleges</td>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${summaries.standard_summary.impact_matrix.community_colleges}</td>
                    </tr>
                    <tr>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb; font-weight: 500;">Specialized Institutions</td>
                      <td style="padding: 0.5rem; border: 1px solid #e5e7eb;">${summaries.standard_summary.impact_matrix.specialized_institutions}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
          
          <!-- Differentiated Action Plan Section -->
          <div class="action-plan" style="margin-bottom: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Differentiated Action Plan:</h3>
            
            <p style="font-weight: 500; margin-bottom: 1rem; ${summaries.standard_summary.action_needed.startsWith('Yes') ? 'color: #b91c1c;' : 'color: #047857;'}">
              <strong>Action Required:</strong> ${summaries.standard_summary.action_needed}
            </p>
            
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Immediate Steps (0-30 days):</h4>
              ${summaries.standard_summary.immediate_steps.map(step => `
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                  <p style="margin-bottom: 0.25rem;"><strong>${step.action}</strong></p>
                  <p style="margin: 0; font-size: 0.875rem; color: #4b5563; font-style: italic;">${step.variations}</p>
                </div>
              `).join('')}
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Short-term Actions (1-3 months):</h4>
              ${summaries.standard_summary.short_term_actions.map(action => `
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                  <p style="margin-bottom: 0.25rem;"><strong>${action.action}</strong></p>
                  <p style="margin: 0; font-size: 0.875rem; color: #4b5563; font-style: italic;">${action.variations}</p>
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
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Resource Requirements by Institution Type:</h3>
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
          
          <!-- Institution Impact Matrix Section -->
          <div class="impact-matrix" style="margin-bottom: 2rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 1rem;">Institution Type Impact Matrix</h3>
            
            <!-- R1 Research Universities -->
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">R1 Research Universities</h4>
              </div>
              <div style="padding: 1rem;">
                <p><strong>Overall Impact:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.r1_universities.overall_impact}</p>
                <p><strong>Key Affected Areas:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.r1_universities.key_affected_areas.join(', ')}</p>
                <p><strong>Relative Burden:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.r1_universities.relative_burden}</p>
              </div>
            </div>
            
            <!-- R2 Research Universities -->
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">R2 Research Universities</h4>
              </div>
              <div style="padding: 1rem;">
                <p><strong>Overall Impact:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.r2_universities.overall_impact}</p>
                <p><strong>Key Affected Areas:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.r2_universities.key_affected_areas.join(', ')}</p>
                <p><strong>Relative Burden:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.r2_universities.relative_burden}</p>
              </div>
            </div>
            
            <!-- Master's Universities -->
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Master's Universities</h4>
              </div>
              <div style="padding: 1rem;">
                <p><strong>Overall Impact:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.masters_universities.overall_impact}</p>
                <p><strong>Key Affected Areas:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.masters_universities.key_affected_areas.join(', ')}</p>
                <p><strong>Relative Burden:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.masters_universities.relative_burden}</p>
              </div>
            </div>
            
            <!-- Baccalaureate Colleges -->
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Baccalaureate Colleges</h4>
              </div>
              <div style="padding: 1rem;">
                <p><strong>Overall Impact:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.baccalaureate_colleges.overall_impact}</p>
                <p><strong>Key Affected Areas:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.baccalaureate_colleges.key_affected_areas.join(', ')}</p>
                <p><strong>Relative Burden:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.baccalaureate_colleges.relative_burden}</p>
              </div>
            </div>
            
            <!-- Community Colleges -->
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Community Colleges</h4>
              </div>
              <div style="padding: 1rem;">
                <p><strong>Overall Impact:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.community_colleges.overall_impact}</p>
                <p><strong>Key Affected Areas:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.community_colleges.key_affected_areas.join(', ')}</p>
                <p><strong>Relative Burden:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.community_colleges.relative_burden}</p>
              </div>
            </div>
            
            <!-- Specialized Institutions -->
            <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
              <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <h4 style="margin: 0; font-size: 1.1rem;">Specialized Institutions</h4>
              </div>
              <div style="padding: 1rem;">
                <p><strong>Overall Impact:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.specialized_institutions.overall_impact}</p>
                <p><strong>Key Affected Areas:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.specialized_institutions.key_affected_areas.join(', ')}</p>
                <p><strong>Relative Burden:</strong> ${summaries.comprehensive_analysis.institution_impact_matrix.specialized_institutions.relative_burden}</p>
              </div>
            </div>
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
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Exemptions & Special Provisions:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.exemptions_special_provisions}</p>
            </div>
          </div>
          
          <!-- Functional Area Impacts Section -->
          <div class="impacts" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Functional Area Impacts:</h3>
            <div style="margin-bottom: 1rem;">
              ${summaries.comprehensive_analysis.functional_area_impacts.map(impact => `
                <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                  <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                    <h4 style="margin: 0; font-size: 1.1rem;">${impact.area}</h4>
                  </div>
                  <div style="padding: 1rem;">
                    <p style="margin-bottom: 0.75rem;">${impact.description}</p>
                    <p style="margin: 0; font-style: italic; color: #4b5563;"><strong>Institution Variations:</strong> ${impact.institution_variations}</p>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <!-- Important Dates with Variations -->
            ${Array.isArray(summaries.comprehensive_analysis.important_dates) && summaries.comprehensive_analysis.important_dates.length > 0 ? `
              <div style="margin-bottom: 1.5rem;">
                <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Important Dates with Institution Variations:</h4>
                ${summaries.comprehensive_analysis.important_dates.map(date => `
                  <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                    <p style="margin-bottom: 0.25rem;"><strong>${date.date}:</strong> ${date.description}</p>
                    <p style="margin: 0; font-size: 0.875rem; color: #4b5563; font-style: italic;"><strong>Institution Variations:</strong> ${date.institution_variations}</p>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Affected Departments:</h4>
              <p>${summaries.comprehensive_analysis.affected_departments.join(', ')}</p>
            </div>
          </div>
          
          <!-- Implementation Specifics -->
          <div class="implementation" style="margin-bottom: 1.5rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Differentiated Implementation Details:</h3>
            
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Compliance Requirements by Institution Type:</h4>
              <div style="padding: 1rem; background-color: #f9fafb; border-radius: 0.375rem; margin-bottom: 0.75rem;">
                <p style="margin-bottom: 0.5rem;"><strong>General Requirements:</strong> ${summaries.comprehensive_analysis.compliance_details.general_requirements}</p>
                <p style="margin-bottom: 0.5rem;"><strong>R1-Specific Requirements:</strong> ${summaries.comprehensive_analysis.compliance_details.r1_requirements}</p>
                <p style="margin-bottom: 0rem;"><strong>Small Institution Requirements:</strong> ${summaries.comprehensive_analysis.compliance_details.small_institution_requirements}</p>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Technical Analysis:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.technical_analysis}</p>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Cross-Functional Impacts:</h4>
              <p style="margin-bottom: 1rem;">${summaries.comprehensive_analysis.cross_functional_impacts}</p>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Risk Analysis by Institution Type:</h4>
              <div style="padding: 1rem; background-color: #f9fafb; border-radius: 0.375rem; margin-bottom: 0.75rem;">
                <p style="margin-bottom: 0.5rem;"><strong>General Risks:</strong> ${summaries.comprehensive_analysis.risk_analysis.general_risks}</p>
                <p style="margin-bottom: 0.5rem;"><strong>R1-Specific Risks:</strong> ${summaries.comprehensive_analysis.risk_analysis.r1_specific_risks}</p>
                <p style="margin-bottom: 0rem;"><strong>Small Institution Risks:</strong> ${summaries.comprehensive_analysis.risk_analysis.small_institution_risks}</p>
              </div>
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
          
          <!-- Differentiated Action Plan Section -->
          <div class="action-plan" style="margin-bottom: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Institution-Specific Action Plan:</h3>
            
            <p style="font-weight: 500; margin-bottom: 1rem; ${summaries.comprehensive_analysis.action_needed.startsWith('Yes') ? 'color: #b91c1c;' : 'color: #047857;'}">
              <strong>Action Required:</strong> ${summaries.comprehensive_analysis.action_needed}
            </p>
            
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Immediate Steps (0-30 days):</h4>
              ${summaries.comprehensive_analysis.immediate_steps.map(step => `
                <div style="margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.375rem; overflow: hidden;">
                  <div style="background-color: #f3f4f6; padding: 0.75rem; border-bottom: 1px solid #e5e7eb;">
                    <h5 style="margin: 0; font-size: 1rem;">${step.action}</h5>
                  </div>
                  <div style="padding: 1rem;">
                    <p style="margin-bottom: 0.5rem;"><strong>For R1 Institutions:</strong> ${step.r1_focus}</p>
                    <p style="margin: 0;"><strong>For Small Institutions:</strong> ${step.small_institution_focus}</p>
                  </div>
                </div>
              `).join('')}
            </div>
            
            <div style="margin-bottom: 1.5rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.75rem;">Short-term Actions (1-3 months):</h4>
              ${summaries.comprehensive_analysis.short_term_actions.map(action => `
                <div style="margin-bottom: 0.75rem; padding: 0.75rem; background-color: #f9fafb; border-radius: 0.375rem;">
                  <p style="margin-bottom: 0.25rem;"><strong>${action.action}</strong></p>
                  <p style="margin: 0; font-size: 0.875rem; color: #4b5563; font-style: italic;"><strong>Institution Variations:</strong> ${action.institution_variations}</p>
                </div>
              `).join('')}
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
            <h3 style="color: #2563eb; font-size: 1.25rem; margin-bottom: 0.75rem;">Resource Requirements by Institution Size:</h3>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Personnel:</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.75rem;">
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Large Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.personnel.large_institutions}</p>
                </div>
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Medium Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.personnel.medium_institutions}</p>
                </div>
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Small Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.personnel.small_institutions}</p>
                </div>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Budget:</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.75rem;">
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Large Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.budget.large_institutions}</p>
                </div>
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Medium Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.budget.medium_institutions}</p>
                </div>
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Small Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.budget.small_institutions}</p>
                </div>
              </div>
            </div>
            
            <div style="margin-bottom: 1rem;">
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">Technology:</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.75rem;">
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Large Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.technology.large_institutions}</p>
                </div>
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Medium Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.technology.medium_institutions}</p>
                </div>
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Small Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.technology.small_institutions}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h4 style="font-size: 1rem; margin-bottom: 0.5rem;">External Expertise:</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.75rem;">
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Large Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.external_expertise.large_institutions}</p>
                </div>
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Medium Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.external_expertise.medium_institutions}</p>
                </div>
                <div style="padding: 0.75rem; background-color: white; border-radius: 0.375rem; border: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 0.25rem 0; font-weight: 500;">Small Institutions:</p>
                  <p style="margin: 0;">${summaries.comprehensive_analysis.resource_requirements.external_expertise.small_institutions}</p>
                </div>
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