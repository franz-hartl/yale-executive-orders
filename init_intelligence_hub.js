/**
 * init_intelligence_hub.js
 * 
 * Utility script to initialize the Executive Order Intelligence Hub with sample data.
 * This creates demonstration data for the new Intelligence Hub features.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'executive_orders.db');

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

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

// Update executive orders with Intelligence Hub fields
async function updateExecutiveOrderFields() {
  try {
    console.log('Updating executive orders with Intelligence Hub fields...');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number, title FROM executive_orders LIMIT 10');
    
    for (const order of orders) {
      // Generate random Yale alert level
      const alertLevels = ['Critical', 'High', 'Moderate', 'Low'];
      const randomAlertLevel = alertLevels[Math.floor(Math.random() * alertLevels.length)];
      
      // Generate sample core impact
      const coreImpact = `This executive order directly impacts Yale's ${
        Math.random() > 0.5 ? 'research operations' : 'administrative processes'
      } by requiring enhanced ${
        Math.random() > 0.5 ? 'compliance measures' : 'reporting procedures'
      }.`;
      
      // Generate sample Yale imperative
      const yaleImperative = `${
        Math.random() > 0.5 ? 'Complete assessment' : 'Update policies'
      } by ${new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]}`;
      
      // Generate sample what changed text
      const whatChanged = `
• New reporting requirements for foreign research collaborations
• Increased security protocols for sensitive research data
• Modified compliance timeline with extended deadlines
      `.trim();
      
      // Update the executive order
      await dbRun(`
        UPDATE executive_orders
        SET yale_alert_level = ?,
            effective_date = date(signing_date, '+30 days'),
            implementation_phase = ?,
            core_impact = ?,
            yale_imperative = ?,
            what_changed = ?,
            confidence_rating = ?
        WHERE id = ?
      `, [
        randomAlertLevel,
        Math.random() > 0.5 ? 'Implementation' : 'Initial Assessment',
        coreImpact,
        yaleImperative,
        whatChanged,
        (0.75 + Math.random() * 0.2).toFixed(2),
        order.id
      ]);
      
      console.log(`Updated executive order ${order.order_number}: ${order.title}`);
    }
    
    console.log('Executive orders updated successfully with Intelligence Hub fields');
  } catch (err) {
    console.error('Error updating executive orders:', err);
  }
}

// Add timeline navigator events
async function addTimelineEvents() {
  try {
    console.log('Adding timeline navigator events...');
    
    // Clear existing timeline events for demo
    await dbRun('DELETE FROM timeline_navigator');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number, signing_date FROM executive_orders LIMIT 5');
    
    for (const order of orders) {
      // Skip if no signing date
      if (!order.signing_date) continue;
      
      const signingDate = new Date(order.signing_date);
      
      // Add signing event
      await dbRun(`
        INSERT INTO timeline_navigator (
          order_id, event_type, event_date, event_description, 
          is_deadline, is_yale_decision_point, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        'Signing',
        order.signing_date,
        'Executive Order signed by the President',
        0, 0, 'Completed'
      ]);
      
      // Add effective date (30 days after signing)
      const effectiveDate = new Date(signingDate);
      effectiveDate.setDate(effectiveDate.getDate() + 30);
      await dbRun(`
        INSERT INTO timeline_navigator (
          order_id, event_type, event_date, event_description, 
          is_deadline, is_yale_decision_point, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        'Effective',
        effectiveDate.toISOString().split('T')[0],
        'Executive Order takes effect',
        0, 0, 'Completed'
      ]);
      
      // Add implementation deadline (90 days after signing)
      const implementationDate = new Date(signingDate);
      implementationDate.setDate(implementationDate.getDate() + 90);
      await dbRun(`
        INSERT INTO timeline_navigator (
          order_id, event_type, event_date, event_description, 
          is_deadline, is_yale_decision_point, status, yale_department_id, importance_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        'Implementation Deadline',
        implementationDate.toISOString().split('T')[0],
        'Institutions must complete initial compliance steps',
        1, 0, 'Pending',
        3, // General Counsel
        'High'
      ]);
      
      // Add Yale decision point (60 days after signing)
      const decisionDate = new Date(signingDate);
      decisionDate.setDate(decisionDate.getDate() + 60);
      await dbRun(`
        INSERT INTO timeline_navigator (
          order_id, event_type, event_date, event_description, 
          is_deadline, is_yale_decision_point, status, yale_department_id, importance_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        'Yale Decision Point',
        decisionDate.toISOString().split('T')[0],
        'Yale must determine compliance approach',
        0, 1, 'Pending',
        1, // Office of the President
        'Critical'
      ]);
      
      // Add final compliance deadline (180 days after signing)
      const finalComplianceDate = new Date(signingDate);
      finalComplianceDate.setDate(finalComplianceDate.getDate() + 180);
      await dbRun(`
        INSERT INTO timeline_navigator (
          order_id, event_type, event_date, event_description, 
          is_deadline, is_yale_decision_point, status, yale_department_id, importance_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        'Final Compliance Deadline',
        finalComplianceDate.toISOString().split('T')[0],
        'Full compliance with all EO requirements',
        1, 0, 'Not Started',
        4, // Office of Research Administration
        'High'
      ]);
      
      console.log(`Added timeline events for executive order ${order.order_number}`);
    }
    
    console.log('Timeline navigator events added successfully');
  } catch (err) {
    console.error('Error adding timeline events:', err);
  }
}

// Add source intelligence data
async function addSourceIntelligence() {
  try {
    console.log('Adding source intelligence data...');
    
    // Clear existing source intelligence for demo
    await dbRun('DELETE FROM source_intelligence');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number, title FROM executive_orders LIMIT 5');
    
    for (const order of orders) {
      // Add Federal Register entry
      await dbRun(`
        INSERT INTO source_intelligence (
          order_id, source_type, source_name, publication_date,
          title, content, url, key_provisions, specific_requirements
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        'Federal Register',
        'Federal Register',
        new Date().toISOString().split('T')[0],
        `Federal Register: ${order.title}`,
        `The President of the United States issued Executive Order ${order.order_number} establishing new requirements for federal agencies and their stakeholders.`,
        `https://www.federalregister.gov/documents/${order.order_number}`,
        `• Section 1: Establishes new security protocols
• Section 2: Creates reporting requirements
• Section 3: Sets implementation timelines`,
        `• Educational institutions must comply with Section 4 requirements
• Research security measures in Section 5 apply to all federal grantees
• Reporting obligations commence within 90 days of effective date`
      ]);
      
      console.log(`Added Federal Register source for EO ${order.order_number}`);
    }
    
    console.log('Source intelligence data added successfully');
  } catch (err) {
    console.error('Error adding source intelligence:', err);
  }
}

// Add agency guidance
async function addAgencyGuidance() {
  try {
    console.log('Adding agency guidance data...');
    
    // Clear existing agency guidance for demo
    await dbRun('DELETE FROM agency_guidance');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number FROM executive_orders LIMIT 3');
    
    // Sample agencies
    const agencies = [
      {
        name: 'NSF',
        title: 'Guidance on Implementing EO Requirements',
        summary: 'The National Science Foundation provides guidance on implementing the new executive order requirements for research grants and cooperative agreements.',
        url: 'https://www.nsf.gov/guidance',
        grant_impact: 'All NSF grants will require enhanced research security protocols and additional certifications.',
        compliance_guidance: 'Grantees must update security protocols by the compliance deadline and submit certification of compliance.',
        research_implications: 'Research involving international collaborators will need additional documentation and security reviews.',
        key_deadlines: 'Certification of compliance due within 180 days of EO effective date.',
        changed_procedures: 'New proposal submission requirements include additional security documentation.'
      },
      {
        name: 'NIH',
        title: 'NIH Implementation Strategy for Executive Order',
        summary: 'The National Institutes of Health outlines its implementation strategy for complying with the executive order\'s research security provisions.',
        url: 'https://www.nih.gov/implementation-guidance',
        grant_impact: 'NIH grants now require enhanced disclosure of all international research relationships.',
        compliance_guidance: 'Institutions must update their conflict of interest policies and security protocols.',
        research_implications: 'Clinical trials may face additional security reviews if they involve international sites.',
        key_deadlines: 'Updated disclosure forms due with next progress report after the EO effective date.',
        changed_procedures: 'New research security committee review process implemented for certain grants.'
      }
    ];
    
    for (const order of orders) {
      // Add guidance for each agency
      for (const agency of agencies) {
        const publicationDate = new Date();
        publicationDate.setDate(publicationDate.getDate() - Math.floor(Math.random() * 30));
        
        await dbRun(`
          INSERT INTO agency_guidance (
            order_id, agency_name, publication_date, title, summary, url,
            grant_impact, compliance_guidance, research_implications, key_deadlines, changed_procedures
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          order.id,
          agency.name,
          publicationDate.toISOString().split('T')[0],
          agency.title,
          agency.summary,
          agency.url,
          agency.grant_impact,
          agency.compliance_guidance,
          agency.research_implications,
          agency.key_deadlines,
          agency.changed_procedures
        ]);
      }
      
      console.log(`Added agency guidance for EO ${order.order_number}`);
    }
    
    console.log('Agency guidance data added successfully');
  } catch (err) {
    console.error('Error adding agency guidance:', err);
  }
}

// Add association analysis
async function addAssociationAnalysis() {
  try {
    console.log('Adding association analysis data...');
    
    // Clear existing association analysis for demo
    await dbRun('DELETE FROM association_analysis');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number FROM executive_orders LIMIT 3');
    
    // Sample associations
    const associations = [
      {
        name: 'COGR',
        title: 'COGR Analysis of Research Security Executive Order',
        summary: 'The Council on Governmental Relations provides analysis of the executive order\'s impact on research institutions.',
        url: 'https://www.cogr.edu/analysis',
        institution_perspective: 'Research institutions face significant administrative burden in implementing the security requirements, particularly for international collaborations.',
        sector_guidance: 'COGR recommends institutions immediately review their research security policies and establish implementation committees.',
        recommended_actions: '• Inventory all international research collaborations\n• Update security protocols and training\n• Engage with federal sponsors for clarification\n• Develop compliance certification process'
      },
      {
        name: 'ACE',
        title: 'American Council on Education Response to Executive Order',
        summary: 'ACE evaluates the impact of the executive order on higher education institutions and provides sector-wide guidance.',
        url: 'https://www.acenet.edu/response',
        institution_perspective: 'The executive order creates both compliance challenges and opportunities for institutions to strengthen their security posture.',
        sector_guidance: 'ACE recommends a collaborative approach with emphasis on balancing security requirements with the open nature of academic research.',
        recommended_actions: '• Coordinate response through central administration\n• Develop institutional position on key provisions\n• Engage with congressional representatives\n• Share best practices through institutional networks'
      }
    ];
    
    for (const order of orders) {
      // Add analysis for each association
      for (const association of associations) {
        const publicationDate = new Date();
        publicationDate.setDate(publicationDate.getDate() - Math.floor(Math.random() * 20));
        
        await dbRun(`
          INSERT INTO association_analysis (
            order_id, association_name, publication_date, title, summary, url,
            institution_perspective, sector_guidance, recommended_actions
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          order.id,
          association.name,
          publicationDate.toISOString().split('T')[0],
          association.title,
          association.summary,
          association.url,
          association.institution_perspective,
          association.sector_guidance,
          association.recommended_actions
        ]);
      }
      
      console.log(`Added association analysis for EO ${order.order_number}`);
    }
    
    console.log('Association analysis data added successfully');
  } catch (err) {
    console.error('Error adding association analysis:', err);
  }
}

// Add legal analysis
async function addLegalAnalysis() {
  try {
    console.log('Adding legal analysis data...');
    
    // Clear existing legal analysis for demo
    await dbRun('DELETE FROM legal_analysis');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number FROM executive_orders LIMIT 3');
    
    for (const order of orders) {
      // Add legal analysis
      const analysisDate = new Date();
      analysisDate.setDate(analysisDate.getDate() - Math.floor(Math.random() * 15));
      
      await dbRun(`
        INSERT INTO legal_analysis (
          order_id, source, analysis_date, challenge_status,
          enforcement_prediction, precedent_references, legal_implications,
          yale_specific_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order.id,
        'Yale General Counsel',
        analysisDate.toISOString().split('T')[0],
        Math.random() > 0.7 ? 'Challenged in Court' : 'No Current Challenges',
        'Enforcement likely to begin after the initial 90-day implementation period, with focus on documentation compliance first.',
        'Similar to EO 13556 (2010) regarding classified information, but with broader scope for research institutions.',
        'Compliance requirements can be met through policy updates and procedural changes. Primary concerns are around the vague definition of "sensitive research" in Section 4.',
        'Yale should focus on inventorying international research collaborations and implementing the required documentation processes.'
      ]);
      
      console.log(`Added legal analysis for EO ${order.order_number}`);
    }
    
    console.log('Legal analysis data added successfully');
  } catch (err) {
    console.error('Error adding legal analysis:', err);
  }
}

// Add Yale response framework data
async function addYaleResponseFramework() {
  try {
    console.log('Adding Yale response framework data...');
    
    // Clear existing Yale response framework for demo
    await dbRun('DELETE FROM yale_response_framework');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number FROM executive_orders LIMIT 3');
    
    // Get Yale departments
    const departments = await dbAll('SELECT id, name FROM yale_departments');
    
    // If no departments exist, skip this step
    if (departments.length === 0) {
      console.log('No Yale departments found. Skipping Yale response framework.');
      return;
    }
    
    // Sample department-specific responses
    const departmentResponses = [
      {
        department_id: 4, // Office of Research Administration
        impact_intensity: 8,
        resource_requirements: 'High - requires additional staff time and potential system updates',
        coordination_needs: 'Coordination with General Counsel, IT, and academic departments required',
        decision_options: `Option 1: Centralized compliance approach managed by Research Administration
Option 2: Distributed model with departmental compliance officers
Option 3: Hybrid approach with central oversight and departmental implementation`,
        implementation_strategy: 'Recommend hybrid approach with central policy development and distributed implementation support'
      },
      {
        department_id: 3, // General Counsel
        impact_intensity: 7,
        resource_requirements: 'Moderate - legal review and policy development',
        coordination_needs: 'Coordination with Research Administration and Provost\'s Office',
        decision_options: `Option 1: Comprehensive policy revision
Option 2: Targeted updates to existing policies
Option 3: Interim guidance with phased implementation`,
        implementation_strategy: 'Recommend targeted updates to existing policies with clear guidance documents'
      },
      {
        department_id: 15, // Office of Sponsored Projects
        impact_intensity: 9,
        resource_requirements: 'High - training, documentation, and process updates',
        coordination_needs: 'Coordination with Research Administration and departmental research administrators',
        decision_options: `Option 1: Immediate implementation of all requirements
Option 2: Phased approach prioritizing critical elements
Option 3: Wait for agency guidance before implementation`,
        implementation_strategy: 'Recommend phased approach with priority on security protocols and disclosure requirements'
      },
      {
        department_id: 8, // International Affairs
        impact_intensity: 8,
        resource_requirements: 'Moderate - review of international agreements and partnerships',
        coordination_needs: 'Coordination with Research Administration and academic departments',
        decision_options: `Option 1: Review all international agreements
Option 2: Focus on high-risk countries only
Option 3: Delegate review to departments with central guidance`,
        implementation_strategy: 'Recommend comprehensive review of all agreements with prioritization based on risk assessment'
      }
    ];
    
    for (const order of orders) {
      // Add response framework for each affected department
      for (const response of departmentResponses) {
        await dbRun(`
          INSERT INTO yale_response_framework (
            order_id, yale_department_id, impact_intensity, resource_requirements,
            coordination_needs, decision_options, implementation_strategy
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          order.id,
          response.department_id,
          response.impact_intensity,
          response.resource_requirements,
          response.coordination_needs,
          response.decision_options,
          response.implementation_strategy
        ]);
      }
      
      console.log(`Added Yale response framework for EO ${order.order_number}`);
    }
    
    console.log('Yale response framework data added successfully');
  } catch (err) {
    console.error('Error adding Yale response framework:', err);
  }
}

// Add action requirements
async function addActionRequirements() {
  try {
    console.log('Adding action requirements data...');
    
    // Clear existing action requirements for demo
    await dbRun('DELETE FROM action_requirements');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number, signing_date FROM executive_orders LIMIT 3');
    
    // Get Yale departments
    const departments = await dbAll('SELECT id, name FROM yale_departments');
    
    // If no departments exist, skip this step
    if (departments.length === 0) {
      console.log('No Yale departments found. Skipping action requirements.');
      return;
    }
    
    // Sample action requirements
    const sampleActions = [
      {
        title: 'Update Research Security Policy',
        description: 'Revise university research security policy to incorporate new federal requirements.',
        priority_level: 'Critical',
        department_id: 4, // Office of Research Administration
        deadline_days: 60,
        status: 'In Progress',
        resource_impact: 'Moderate',
        completion_criteria: 'Revised policy approved by Provost and communicated to research community'
      },
      {
        title: 'Implement Enhanced Disclosure Process',
        description: 'Create new disclosure forms and process for international research collaborations.',
        priority_level: 'Critical',
        department_id: 15, // Office of Sponsored Projects
        deadline_days: 90,
        status: 'Not Started',
        resource_impact: 'High',
        completion_criteria: 'New forms created, process documented, and training provided to research administrators'
      },
      {
        title: 'Review International Agreements',
        description: 'Review existing international research agreements for compliance with new requirements.',
        priority_level: 'High',
        department_id: 8, // International Affairs
        deadline_days: 120,
        status: 'Not Started',
        resource_impact: 'High',
        completion_criteria: 'All agreements reviewed, issues identified, and remediation plan developed'
      },
      {
        title: 'Update Compliance Training',
        description: 'Develop and implement training on new research security requirements.',
        priority_level: 'High',
        department_id: 14, // Office of Research Integrity and Compliance
        deadline_days: 100,
        status: 'Not Started',
        resource_impact: 'Moderate',
        completion_criteria: 'Training developed, tested, and made available to research community'
      },
      {
        title: 'Establish Monitoring Process',
        description: 'Create ongoing monitoring process for research security compliance.',
        priority_level: 'Recommended',
        department_id: 4, // Office of Research Administration
        deadline_days: 150,
        status: 'Not Started',
        resource_impact: 'Moderate',
        completion_criteria: 'Monitoring process documented and implemented'
      }
    ];
    
    for (const order of orders) {
      // Skip if no signing date
      if (!order.signing_date) continue;
      
      const signingDate = new Date(order.signing_date);
      
      // Add action requirements
      for (const action of sampleActions) {
        const deadlineDate = new Date(signingDate);
        deadlineDate.setDate(deadlineDate.getDate() + action.deadline_days);
        
        await dbRun(`
          INSERT INTO action_requirements (
            order_id, title, description, priority_level, yale_department_id,
            deadline, status, resource_impact, completion_criteria
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          order.id,
          action.title,
          action.description,
          action.priority_level,
          action.department_id,
          deadlineDate.toISOString().split('T')[0],
          action.status,
          action.resource_impact,
          action.completion_criteria
        ]);
      }
      
      console.log(`Added action requirements for EO ${order.order_number}`);
    }
    
    console.log('Action requirements data added successfully');
  } catch (err) {
    console.error('Error adding action requirements:', err);
  }
}

// Add intelligence network (related orders)
async function addIntelligenceNetwork() {
  try {
    console.log('Adding intelligence network data...');
    
    // Clear existing intelligence network for demo
    await dbRun('DELETE FROM intelligence_network');
    
    // Get all executive orders
    const orders = await dbAll('SELECT id, order_number, title FROM executive_orders ORDER BY signing_date DESC LIMIT 10');
    
    // Need at least 5 orders to create meaningful relationships
    if (orders.length < 5) {
      console.log('Not enough executive orders for intelligence network. Skipping.');
      return;
    }
    
    // Create relationships between orders
    for (let i = 0; i < 3; i++) {
      const currentOrder = orders[i];
      
      // Create predecessor relationship with an older order
      const predecessorIndex = i + 3;
      if (predecessorIndex < orders.length) {
        const predecessorOrder = orders[predecessorIndex];
        
        await dbRun(`
          INSERT INTO intelligence_network (
            order_id, related_order_id, relationship_type, relationship_strength,
            description, yale_implications
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          currentOrder.id,
          predecessorOrder.id,
          'Predecessor',
          0.8,
          `EO ${predecessorOrder.order_number} established the foundation for the requirements expanded in this order.`,
          'Yale\'s existing compliance framework for the predecessor order can be extended to cover new requirements.'
        ]);
      }
      
      // Create related relationship with another recent order
      const relatedIndex = (i + 1) % 3;
      const relatedOrder = orders[relatedIndex];
      
      await dbRun(`
        INSERT INTO intelligence_network (
          order_id, related_order_id, relationship_type, relationship_strength,
          description, yale_implications
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        currentOrder.id,
        relatedOrder.id,
        'Related',
        0.6,
        `This order contains complementary provisions related to EO ${relatedOrder.order_number}.`,
        'Compliance efforts should be coordinated between both orders to ensure consistency.'
      ]);
      
      // Create external impact relationship
      if (i < orders.length - 5) {
        const externalOrder = orders[i + 5];
        
        await dbRun(`
          INSERT INTO intelligence_network (
            order_id, related_order_id, relationship_type, relationship_strength,
            description, yale_implications
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          currentOrder.id,
          externalOrder.id,
          'External',
          0.4,
          `This order has implications for Yale's external relationships affected by EO ${externalOrder.order_number}.`,
          'Review external partnerships and agreements that may be affected by both orders.'
        ]);
      }
      
      console.log(`Added intelligence network for EO ${currentOrder.order_number}`);
    }
    
    console.log('Intelligence network data added successfully');
  } catch (err) {
    console.error('Error adding intelligence network:', err);
  }
}

// Main function to run all initialization tasks
async function initializeIntelligenceHub() {
  try {
    console.log('Starting Intelligence Hub initialization...');
    
    // Run all initialization tasks
    await updateExecutiveOrderFields();
    await addTimelineEvents();
    await addSourceIntelligence();
    await addAgencyGuidance();
    await addAssociationAnalysis();
    await addLegalAnalysis();
    await addYaleResponseFramework();
    await addActionRequirements();
    await addIntelligenceNetwork();
    
    console.log('Intelligence Hub initialization completed successfully!');
  } catch (err) {
    console.error('Error initializing Intelligence Hub:', err);
  } finally {
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

// Run the initialization
initializeIntelligenceHub();