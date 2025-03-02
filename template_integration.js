/**
 * template_integration.js
 * 
 * Demonstrates integration between the template system, knowledge system,
 * and conflict handling system.
 */

const TemplateManager = require('./templates/template_manager');
const KnowledgeManager = require('./knowledge/knowledge_manager');
const KnowledgeQueries = require('./knowledge/queries');
const ConflictDetector = require('./resolution/conflict_detector');
const { templateSchema } = require('./models/template_schema');
const { conflictSchema } = require('./models/conflict_record');
const fs = require('fs');
const path = require('path');

/**
 * Process an executive order and generate all relevant templates
 * 
 * @param {number} orderId Executive order ID
 */
async function processOrder(orderId) {
  console.log(`Processing Executive Order ID: ${orderId}`);
  
  try {
    // Initialize components
    const knowledgeManager = new KnowledgeManager();
    await knowledgeManager.initialize();
    
    const queries = new KnowledgeQueries();
    await queries.initialize();
    
    const conflictDetector = new ConflictDetector();
    await conflictDetector.initialize();
    
    const templateManager = new TemplateManager();
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, `template_output/order_${orderId}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 1. Get basic order information
    const orderInfo = await knowledgeManager.db.getAsync(`
      SELECT * FROM executive_orders WHERE id = ?
    `, [orderId]);
    
    if (!orderInfo) {
      console.error(`Order ID ${orderId} not found`);
      return;
    }
    
    console.log(`Found order: ${orderInfo.order_number} - ${orderInfo.title}`);
    
    // 2. Get categories
    const categories = await knowledgeManager.db.allAsync(`
      SELECT c.name, c.description
      FROM categories c
      JOIN order_categories oc ON c.id = oc.category_id
      WHERE oc.order_id = ?
    `, [orderId]);
    
    // 3. Get impact areas
    const impactAreas = await knowledgeManager.db.allAsync(`
      SELECT ia.name, ia.description
      FROM impact_areas ia
      JOIN order_impact_areas oia ON ia.id = oia.impact_area_id
      WHERE oia.order_id = ?
    `, [orderId]);
    
    // 4. Get university impact areas
    const universityImpactAreas = await knowledgeManager.db.allAsync(`
      SELECT uia.name, uia.description, ouia.notes
      FROM university_impact_areas uia
      JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
      WHERE ouia.order_id = ?
    `, [orderId]);
    
    // 5. Get Yale impact areas
    const yaleImpactAreas = await knowledgeManager.db.allAsync(`
      SELECT yia.name, yia.description, oyia.yale_specific_notes, oyia.yale_impact_rating as rating
      FROM yale_impact_areas yia
      JOIN order_yale_impact_areas oyia ON yia.id = oyia.yale_impact_area_id
      WHERE oyia.order_id = ?
    `, [orderId]);
    
    // 6. Get Yale departments
    const yaleDepartments = await knowledgeManager.db.allAsync(`
      SELECT yd.name, yd.description, yd.contact_info, yim.impact_score, 
             yim.impact_description, yim.priority_level as impact_level
      FROM yale_departments yd
      JOIN yale_impact_mapping yim ON yd.id = yim.yale_department_id
      WHERE yim.order_id = ?
    `, [orderId]);
    
    // 7. Get Yale compliance actions
    const yaleComplianceActions = await knowledgeManager.db.allAsync(`
      SELECT * FROM yale_compliance_actions WHERE order_id = ?
    `, [orderId]);
    
    // 8. Get knowledge facts
    const dateFacts = await queries.getImportantDates(orderId);
    const requirementFacts = await queries.getRequirements(orderId);
    const impactFacts = await queries.getImpacts(orderId);
    
    // 9. Get conflicts
    const conflicts = await conflictDetector.getConflictsForOrder(orderId);
    
    // Map conflicts to a simpler structure
    const mappedConflicts = conflicts.map(conflict => {
      return {
        id: conflict.id,
        type: conflict.conflictType,
        severity: conflict.severity,
        status: conflict.status,
        description: conflict.resolutionNotes || `Conflict between facts #${conflict.fact1Id} and #${conflict.fact2Id}`
      };
    });
    
    // 10. Format dates and deadlines
    const deadlines = [];
    
    // Add deadlines from date facts
    for (const fact of dateFacts) {
      if (fact.value.dateType === 'deadline' || fact.value.dateType === 'due') {
        deadlines.push({
          date: fact.value.date,
          description: fact.value.description,
          requirement: ''
        });
      }
    }
    
    // Add deadlines from requirement facts
    for (const fact of requirementFacts) {
      if (fact.value.deadline) {
        deadlines.push({
          date: fact.value.deadline,
          description: fact.value.description,
          requirement: fact.value.requirementType
        });
      }
    }
    
    // Add deadlines from compliance actions
    for (const action of yaleComplianceActions) {
      if (action.deadline) {
        deadlines.push({
          date: action.deadline,
          description: action.title,
          requirement: action.description
        });
      }
    }
    
    // Sort deadlines by date
    deadlines.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 11. Format requirements
    const requirements = requirementFacts.map(fact => {
      return {
        title: fact.value.requirementType || 'Requirement',
        description: fact.value.description,
        deadline: fact.value.deadline,
        priority: fact.value.priority
      };
    });
    
    // Add compliance actions as requirements
    yaleComplianceActions.forEach(action => {
      if (!requirements.some(r => r.description === action.description)) {
        requirements.push({
          title: action.title,
          description: action.description,
          deadline: action.deadline,
          priority: action.required ? 'high' : 'medium'
        });
      }
    });
    
    // 12. Format department actions
    // Group compliance actions by department
    const departmentActions = {};
    
    yaleComplianceActions.forEach(action => {
      if (action.yale_department_id) {
        if (!departmentActions[action.yale_department_id]) {
          departmentActions[action.yale_department_id] = [];
        }
        
        departmentActions[action.yale_department_id].push({
          description: action.description || action.title,
          deadline: action.deadline
        });
      }
    });
    
    // Add actions to departments
    yaleDepartments.forEach(dept => {
      if (departmentActions[dept.id]) {
        dept.actions = departmentActions[dept.id];
      } else {
        dept.actions = [];
      }
    });
    
    // 13. Combine all data
    const combinedData = {
      ...orderInfo,
      categories: categories.map(c => c.name),
      impact_areas: impactAreas,
      university_impact_areas: universityImpactAreas,
      yale_impact_areas: yaleImpactAreas,
      yale_departments: yaleDepartments,
      yale_compliance_actions: yaleComplianceActions,
      deadlines,
      requirements,
      conflicts: mappedConflicts,
      
      // Additional derived data
      effective_date: dateFacts.find(f => f.value.dateType === 'effective')?.value.date,
      key_points: orderInfo.executive_brief ? 
        orderInfo.executive_brief.split('. ').map(s => s.trim()).filter(s => s) : 
        []
    };
    
    console.log('Data preparation complete. Rendering templates...');
    
    // 14. Render templates
    const templates = [
      {
        type: templateSchema.types.EXECUTIVE_BRIEF,
        filename: 'executive_brief.md'
      },
      {
        type: templateSchema.types.STANDARD_SUMMARY,
        filename: 'standard_summary.md'
      },
      {
        type: 'YALE_EXECUTIVE_BRIEF',
        filename: 'yale_executive_brief.md'
      },
      {
        type: 'YALE_COMPREHENSIVE',
        filename: 'yale_comprehensive.md'
      }
    ];
    
    // Generate each template
    for (const template of templates) {
      try {
        console.log(`Rendering ${template.type}...`);
        
        const rendered = templateManager.renderTemplate(
          combinedData,
          template.type
        );
        
        fs.writeFileSync(
          path.join(outputDir, template.filename),
          rendered
        );
        
        console.log(`Saved ${template.filename}`);
      } catch (error) {
        console.error(`Error rendering ${template.type}:`, error);
      }
    }
    
    // 15. Generate compliance checklist
    console.log('Generating compliance checklist...');
    const checklist = templateManager.generateComplianceChecklist(combinedData);
    
    fs.writeFileSync(
      path.join(outputDir, 'compliance_checklist.md'),
      checklist
    );
    
    console.log('Saved compliance_checklist.md');
    
    // 16. For each department with high impact, generate department-specific guidance
    console.log('Generating department-specific guidance...');
    
    const highImpactDepts = yaleDepartments.filter(
      dept => dept.impact_level === 'high'
    );
    
    for (const dept of highImpactDepts) {
      try {
        // Create department template
        const deptTemplateId = templateManager.createDepartmentTemplate(dept.name);
        
        // Prepare department-specific data
        const deptData = {
          ...combinedData,
          department_name: dept.name,
          department_impact: dept.impact_description,
          department_actions: dept.actions.map(a => 
            `- ${a.description}${a.deadline ? ` (Due: ${a.deadline})` : ''}`
          ).join('\n'),
          department_timeline: dept.actions.map(a => 
            a.deadline ? `- **${a.deadline}**: ${a.description}` : ''
          ).filter(Boolean).join('\n'),
          primary_contact: dept.contact_info || 'Department Chair',
          primary_email: 'department@yale.edu'
        };
        
        // Render department template
        const deptGuidance = templateManager.renderTemplate(
          deptData,
          deptTemplateId
        );
        
        // Save to file
        const filename = `${dept.name.toLowerCase().replace(/\s+/g, '_')}_guidance.md`;
        fs.writeFileSync(
          path.join(outputDir, filename),
          deptGuidance
        );
        
        console.log(`Saved ${filename}`);
      } catch (error) {
        console.error(`Error generating guidance for ${dept.name}:`, error);
      }
    }
    
    console.log(`All templates generated in ${outputDir}`);
    
    // Clean up
    await knowledgeManager.close();
    await queries.close();
    await conflictDetector.close();
    
  } catch (error) {
    console.error('Error processing order:', error);
  }
}

/**
 * Main function - process the first available order
 */
async function main() {
  try {
    // Connect to the database
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./executive_orders.db');
    
    // Get the first order ID
    db.get('SELECT id FROM executive_orders LIMIT 1', async (err, row) => {
      if (err) {
        console.error('Error querying database:', err);
        return;
      }
      
      if (row) {
        await processOrder(row.id);
      } else {
        console.log('No executive orders found in the database');
      }
      
      db.close();
    });
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the main function if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  processOrder
};