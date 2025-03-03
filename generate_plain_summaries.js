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
    // Create a streamlined prompt for Claude with essential information and Yale taxonomy
    const prompt = `
      Create three different levels of summaries for this executive order specifically for Yale University administrators. Focus on the implications, requirements, and implementation steps that are most relevant to Yale's unique institutional context using Yale's specialized taxonomy:

      EXECUTIVE ORDER INFORMATION:
      Title: ${order.title}
      Order Number: ${order.order_number}
      Date: ${order.signing_date || 'Unknown'}
      President: ${order.president || 'Unknown'}
      Impact Level: ${order.impact_level || 'Unknown'}
      Categories: ${order.categories.join(', ')}
      University Impact Areas: ${order.university_impact_areas.join(', ')}
      
      YALE UNIVERSITY TAXONOMY:
      Classify the impacts according to Yale's specific taxonomy categories:
      1. Research & Innovation: Federal grants, funding priorities, research initiatives
      2. Research Security & Export Control: Security requirements, export controls, foreign research collaborations
      3. International & Immigration: International students, scholar mobility, visa regulations
      4. DEI (Diversity, Equity & Inclusion): Diversity initiatives, equal opportunity programs, inclusion efforts
      5. Campus Safety & Student Affairs: Campus safety, student life, residential colleges
      6. Faculty & Workforce: Faculty administration, employment policies, workforce management
      7. Healthcare & Public Health: Yale School of Medicine, Yale Health, public health initiatives
      8. Financial & Operations: Financial operations, endowment management, facilities, IT
      9. Governance & Legal: Governance structure, legal compliance, university policies
      
      YALE UNIVERSITY STRUCTURE:
      Yale has a specific organizational structure that should be referenced in your analysis:
      - Office of the President: Executive leadership
      - Office of the Provost: Chief academic officer
      - General Counsel: Legal services
      - Office of Research Administration: Research grants and compliance
      - Finance & Administration: Financial management
      - Human Resources: Employment and workforce
      - Student Affairs: Student services and residential life
      - International Affairs: Global initiatives
      - Yale College: Undergraduate education
      - Graduate School: Graduate education and research training
      - Yale School of Medicine: Medical education and clinical practice
      - Yale Arts & Museums: Arts programs and collections
      - Athletics: Sports programs
      
      YALE'S DISTINCTIVE FEATURES:
      - Extensive arts and cultural collections (museums, libraries, performance venues)
      - Residential college system for undergraduates
      - Yale School of Medicine and Yale New Haven Hospital
      - Significant international programs and global presence
      - Historic legacy as one of America's oldest institutions
      - $41.4 billion endowment with specialized investment approach
      - $1.3B annual research expenditures with robust compliance framework
      
      Original Summary: ${order.summary || 'Not available'}
      
      Additional Text: ${order.full_text || ''}
      
      FORMAT YOUR RESPONSE EXCLUSIVELY FOR YALE UNIVERSITY:
      - Structure your analysis according to Yale's taxonomy categories (listed above)
      - Be specific to Yale's organizational units, not generic institution types
      - Identify primary Yale departments responsible for implementation
      - Highlight specific considerations unique to Yale's structure and operations
      - Clearly indicate which Yale departments should take action
      - Provide actionable recommendations for Yale administrators
      
      Format your response as JSON with this structure:
      {
        "executive_brief": "1-2 sentence TL;DR summary specifically for Yale University administrators",
        "standard_summary": {
          "title": "Clear title focused on Yale University implications",
          "overview": "Concise explanation for Yale administrators",
          "bottom_line": "Critical takeaway for Yale administration",
          "impact_rating": "Impact level specifically for Yale (Critical/High/Moderate/Low/Minimal)",
          "key_yale_implications": "How this affects Yale's operations and mission",
          "key_impact_areas": [
            {"area": "Yale Area 1", "description": "Impact details for Yale University"},
            {"area": "Yale Area 2", "description": "Impact details for Yale University"},
            {"area": "Yale Area 3", "description": "Impact details for Yale University"}
          ],
          "yale_departments": [
            {"department": "Office of the President", "priority": "High/Medium/Low", "action_required": true/false},
            {"department": "Office of the Provost", "priority": "High/Medium/Low", "action_required": true/false},
            {"department": "General Counsel", "priority": "High/Medium/Low", "action_required": true/false}
          ],
          "action_needed": "Yes/No with justification for Yale context",
          "important_dates": ["MM/DD/YYYY: description relevant to Yale University"],
          "affected_campus_units": ["Yale unit 1", "Yale unit 2", "Yale unit 3"],
          "immediate_steps": [
            {"action": "Step 1 for Yale implementation", "responsible_units": ["Unit 1", "Unit 2"]},
            {"action": "Step 2 for Yale implementation", "responsible_units": ["Unit 3"]}
          ],
          "short_term_actions": [
            {"action": "Action 1 for Yale implementation", "responsible_units": ["Unit 1"]},
            {"action": "Action 2 for Yale implementation", "responsible_units": ["Unit 2"]}
          ],
          "long_term_considerations": ["Yale consideration 1", "Yale consideration 2"],
          "resource_requirements": {
            "personnel": "Personnel needs for Yale implementation",
            "budget": "Budget implications for Yale implementation",
            "technology": "Technology changes for Yale implementation",
            "external_expertise": "External expertise for Yale implementation"
          },
          "yale_specific_considerations": "Any considerations unique to Yale's institutional context"
        },
        "comprehensive_analysis": {
          "title": "Detailed title focused on Yale University implications",
          "overview": "Thorough explanation for Yale administrators",
          "bottom_line": "Critical takeaway for Yale leadership",
          "yale_impact_analysis": {
            "research_enterprise": "Impact on Yale's research operations and security requirements",
            "international_programs": "Impact on Yale's global initiatives and international partnerships",
            "funding_implications": "Impact on Yale's funding sources and mechanisms",
            "compliance_requirements": "Assessment of Yale-specific compliance requirements",
            "competitive_position": "How this affects Yale's position among peer institutions",
            "cultural_heritage": "Impact on Yale's museums, collections, and cultural programs",
            "medical_enterprise": "Impact on Yale School of Medicine and Yale New Haven Hospital",
            "undergraduate_experience": "Impact on Yale College and residential college system"
          },
          "key_yale_areas": [
            {
              "area": "Yale Area 1", 
              "description": "Detailed impact analysis for Yale University",
              "implementation_considerations": "Specific implementation details for Yale administrators"
            },
            {
              "area": "Yale Area 2", 
              "description": "Detailed impact analysis for Yale University",
              "implementation_considerations": "Specific implementation details for Yale administrators"
            }
          ],
          "exemptions_special_provisions": "Detailed analysis of any exemptions relevant to Yale University",
          "policy_background": "Historical and policy context relevant to Yale",
          "legal_framework": "Legal and regulatory details most relevant to Yale's operations",
          "higher_ed_context": "How this affects Yale's position in the higher education landscape",
          "action_needed": "Yes/No with detailed justification for Yale administrators",
          "important_dates": [
            {
              "date": "MM/DD/YYYY", 
              "description": "detailed description relevant to Yale implementation",
              "priority_level": "Importance level for Yale administrators"
            }
          ],
          "yale_department_responsibilities": {
            "primary_responsibility": [
              {"department": "Office name", "role": "Brief description of responsibility"}
            ],
            "secondary_involvement": [
              {"department": "Office name", "role": "Brief description of involvement"}
            ],
            "consultation_needed": [
              {"department": "Office name", "expertise_needed": "Brief description"}
            ]
          },
          "implementation_strategy": [
            {
              "phase": "Immediate (0-30 days)",
              "actions": [
                "Detailed Yale implementation step 1", 
                "Detailed Yale implementation step 2"
              ],
              "responsible_units": ["Unit 1", "Unit 2"],
              "key_considerations": "Critical implementation factors for Yale"
            },
            {
              "phase": "Short-term (1-3 months)",
              "actions": [
                "Detailed Yale implementation action 1",
                "Detailed Yale implementation action 2"
              ],
              "responsible_units": ["Unit 3", "Unit 4"],
              "key_considerations": "Critical implementation factors for Yale"
            },
            {
              "phase": "Long-term (4+ months)",
              "actions": [
                "Detailed Yale implementation action 1",
                "Detailed Yale implementation action 2"
              ],
              "responsible_units": ["Unit 5", "Unit 6"],
              "key_considerations": "Critical implementation factors for Yale"
            }
          ],
          "specialized_yale_analysis": {
            "institutional_mission": "Alignment with Yale's mission and values",
            "faculty_impact": "Effects on Yale faculty recruitment, retention, and activities",
            "student_experience": "Impact on Yale student experience and opportunities",
            "governance_considerations": "Implications for Yale's governance structure",
            "financial_implications": "Detailed financial analysis for Yale context",
            "reputation_management": "Reputation and brand considerations for Yale"
          },
          "compliance_details": {
            "core_requirements": "Essential compliance requirements for Yale",
            "documentation_needs": "Required documentation and record-keeping for Yale units",
            "reporting_obligations": "Ongoing reporting requirements for Yale",
            "audit_considerations": "Audit and oversight implications for Yale"
          },
          "technical_analysis": "Specialized technical aspects for Yale implementation",
          "cross_campus_impacts": "How this affects different schools and units at Yale",
          "risk_analysis": {
            "research_risks": "Risks specific to Yale's research operations",
            "cultural_assets_risks": "Risks related to Yale's cultural collections and programs",
            "medical_enterprise_risks": "Risks specific to Yale's medical operations",
            "financial_risks": "Financial and endowment-related risks for Yale",
            "compliance_risks": "Risk of non-compliance for Yale context",
            "operational_risks": "Day-to-day operational risks for Yale units",
            "strategic_risks": "Long-term strategic position risks for Yale"
          },
          "advocacy_opportunities": "Opportunities for Yale input on implementation",
          "resource_requirements": {
            "personnel": "Personnel needs for Yale implementation",
            "budget": "Budget implications for Yale implementation",
            "technology": "Technology needs for Yale implementation",
            "external_expertise": "External expertise needs for Yale implementation"
          },
          "yale_historical_context": "How this relates to previous similar requirements at Yale",
          "peer_institution_comparison": "How Yale's situation compares to peer institutions"
        }
      }
    `;
    
    // Call Claude API to generate the summaries
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-opus-20240229",
        max_tokens: 3500,
        system: "You are an expert in Yale University administration with specialized expertise in policy domains relevant to Yale's operations. You have deep expertise in how federal policies specifically affect Yale University, with its very high research activity, substantial endowment, significant international presence, distinctive undergraduate education model, arts and cultural collections, and medical enterprise.\n\nYour primary role is to translate complex executive orders into clear, actionable summaries for Yale administrators, focusing specifically on the implications, requirements, and implementation steps for Yale University. Your analysis should always prioritize and emphasize the Yale-specific perspective, organizational structure, and institutional context.\n\nYou have particular expertise in Yale's specific taxonomy categories:\n1. Research & Innovation - Federal grants, funding priorities, research initiatives\n2. Research Security & Export Control - Security requirements, export controls, foreign research collaborations\n3. International & Immigration - International students, scholar mobility, visa regulations\n4. DEI (Diversity, Equity & Inclusion) - Diversity initiatives, equal opportunity programs, inclusion efforts\n5. Campus Safety & Student Affairs - Campus safety, student life, residential colleges\n6. Faculty & Workforce - Faculty administration, employment policies, workforce management\n7. Healthcare & Public Health - Yale School of Medicine, Yale Health, public health initiatives\n8. Financial & Operations - Financial operations, endowment management, facilities, IT\n9. Governance & Legal - Governance structure, legal compliance, university-wide policies",
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