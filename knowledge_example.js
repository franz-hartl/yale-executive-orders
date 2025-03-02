/**
 * knowledge_example.js
 * 
 * Example script demonstrating how to use the knowledge management system.
 */

const KnowledgeManager = require('./knowledge/knowledge_manager');
const KnowledgeQueries = require('./knowledge/queries');
const Fact = require('./knowledge/fact');
const { factTypes, relationshipTypes } = require('./models/knowledge_schema');

/**
 * Main example function
 */
async function runExample() {
  console.log('Knowledge Management System Example');
  console.log('===================================');
  
  try {
    // Initialize knowledge manager and queries
    const knowledgeManager = new KnowledgeManager();
    await knowledgeManager.initialize();
    
    const queries = new KnowledgeQueries();
    await queries.initialize();
    
    // Get the first executive order as an example
    const orderId = await getExampleOrderId(knowledgeManager);
    if (!orderId) {
      console.log('No executive orders found in the database.');
      return;
    }
    
    const orderInfo = await getOrderInfo(knowledgeManager, orderId);
    console.log(`\nWorking with Executive Order: ${orderInfo.order_number} - ${orderInfo.title}`);
    
    // Get source ID for attribution
    const sourceId = await getExampleSourceId(knowledgeManager);
    if (!sourceId) {
      console.log('No sources found in the database.');
      return;
    }
    
    const sourceInfo = await getSourceInfo(knowledgeManager, sourceId);
    console.log(`Using source: ${sourceInfo.source_name}`);
    
    // Create some example knowledge facts
    console.log('\nCreating example knowledge facts...');
    
    // 1. Create a date fact
    const dateFact = new Fact({
      orderId,
      factType: factTypes.DATE,
      value: {
        date: orderInfo.signing_date,
        dateType: 'signing',
        description: 'Date the order was signed',
        isExplicit: true
      },
      confidence: 0.95
    });
    
    dateFact.addSource({
      sourceId,
      sourceContext: 'Header information',
      extractionMethod: 'manual',
      metadata: { notes: 'Example date extraction' }
    });
    
    await knowledgeManager.storeFact(dateFact);
    console.log(`Created date fact with ID: ${dateFact.id}`);
    
    // 2. Create a requirement fact
    const requirementFact = new Fact({
      orderId,
      factType: factTypes.REQUIREMENT,
      value: {
        requirementType: 'reporting',
        description: 'Annual report on implementation progress required',
        targetEntities: ['federal agencies', 'grant recipients'],
        deadline: '2025-12-31',
        priority: 'medium'
      },
      confidence: 0.85
    });
    
    requirementFact.addSource({
      sourceId,
      sourceContext: 'Section III, paragraph 2',
      extractionMethod: 'manual'
    });
    
    await knowledgeManager.storeFact(requirementFact);
    console.log(`Created requirement fact with ID: ${requirementFact.id}`);
    
    // 3. Create an impact fact
    const impactFact = new Fact({
      orderId,
      factType: factTypes.IMPACT,
      value: {
        impactType: 'operational',
        description: 'Necessitates changes to research compliance procedures',
        affectedEntities: ['universities', 'research institutions'],
        severity: 'medium',
        timeframe: 'medium-term'
      },
      confidence: 0.8
    });
    
    impactFact.addSource({
      sourceId,
      sourceContext: 'Analysis section',
      extractionMethod: 'manual'
    });
    
    await knowledgeManager.storeFact(impactFact);
    console.log(`Created impact fact with ID: ${impactFact.id}`);
    
    // Create relationships between facts
    console.log('\nCreating relationships between facts...');
    
    // Relate the requirement to the date
    requirementFact.addRelationship({
      relatedFact: dateFact.id,
      type: relationshipTypes.DEPENDS_ON,
      description: 'Requirement deadline is relative to the signing date'
    });
    
    await knowledgeManager.updateFact(requirementFact);
    
    // Relate the impact to the requirement
    impactFact.addRelationship({
      relatedFact: requirementFact.id,
      type: relationshipTypes.RELATES_TO,
      description: 'Impact is a direct result of the reporting requirement'
    });
    
    await knowledgeManager.updateFact(impactFact);
    console.log('Created relationships between facts');
    
    // Add a Yale-specific impact assessment
    console.log('\nAdding Yale-specific impact assessment...');
    
    // Get a Yale department if available
    const departmentId = await getYaleDepartmentId(knowledgeManager);
    
    const impactId = await knowledgeManager.addYaleImpact({
      factId: impactFact.id,
      departmentId,
      impactLevel: 'Medium',
      description: 'Yale will need to update research compliance procedures and provide training to research staff',
      analyst: 'Example Script'
    });
    
    console.log(`Created Yale impact assessment with ID: ${impactId}`);
    
    // Now demonstrate some queries
    console.log('\nQuerying knowledge...');
    
    // Get all dates for this order
    const dates = await queries.getImportantDates(orderId);
    console.log(`\nFound ${dates.length} important dates for this order:`);
    for (const fact of dates) {
      console.log(`- ${fact.value.dateType}: ${fact.value.date} (${fact.value.description})`);
    }
    
    // Get all requirements
    const requirements = await queries.getRequirements(orderId);
    console.log(`\nFound ${requirements.length} requirements for this order:`);
    for (const fact of requirements) {
      console.log(`- ${fact.value.requirementType}: ${fact.value.description}`);
      console.log(`  Priority: ${fact.value.priority}, Deadline: ${fact.value.deadline}`);
    }
    
    // Get Yale impacts
    const yaleImpacts = await queries.getYaleImpacts(orderId);
    console.log(`\nFound ${yaleImpacts.length} Yale-specific impacts for this order:`);
    for (const impact of yaleImpacts) {
      console.log(`- ${impact.impactLevel} impact: ${impact.description}`);
      if (impact.departmentName) {
        console.log(`  Department: ${impact.departmentName}`);
      }
    }
    
    // Get a knowledge summary
    const summary = await queries.getKnowledgeSummary(orderId);
    console.log('\nKnowledge Summary:');
    console.log(`Total facts by type: ${JSON.stringify(summary.factCounts)}`);
    console.log(`Facts by source: ${JSON.stringify(summary.sourceCounts)}`);
    console.log(`Contradictions found: ${summary.contradictionCount}`);
    
    // Clean up
    await knowledgeManager.close();
    await queries.close();
    
    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

/**
 * Helper to get an example order ID
 * @param {KnowledgeManager} knowledgeManager
 * @returns {Promise<number|null>} First order ID or null
 */
async function getExampleOrderId(knowledgeManager) {
  const order = await knowledgeManager.db.get('SELECT id FROM executive_orders LIMIT 1');
  return order ? order.id : null;
}

/**
 * Helper to get basic order info
 * @param {KnowledgeManager} knowledgeManager
 * @param {number} orderId
 * @returns {Promise<Object>} Order information
 */
async function getOrderInfo(knowledgeManager, orderId) {
  return knowledgeManager.db.get(
    'SELECT id, order_number, title, signing_date FROM executive_orders WHERE id = ?',
    [orderId]
  );
}

/**
 * Helper to get an example source ID
 * @param {KnowledgeManager} knowledgeManager
 * @returns {Promise<number|null>} First source ID or null
 */
async function getExampleSourceId(knowledgeManager) {
  const source = await knowledgeManager.db.get('SELECT id FROM source_metadata LIMIT 1');
  return source ? source.id : null;
}

/**
 * Helper to get basic source info
 * @param {KnowledgeManager} knowledgeManager
 * @param {number} sourceId
 * @returns {Promise<Object>} Source information
 */
async function getSourceInfo(knowledgeManager, sourceId) {
  return knowledgeManager.db.get(
    'SELECT id, source_name FROM source_metadata WHERE id = ?',
    [sourceId]
  );
}

/**
 * Helper to get a Yale department ID if available
 * @param {KnowledgeManager} knowledgeManager
 * @returns {Promise<number|null>} First department ID or null
 */
async function getYaleDepartmentId(knowledgeManager) {
  try {
    const dept = await knowledgeManager.db.get('SELECT id FROM yale_departments LIMIT 1');
    return dept ? dept.id : null;
  } catch (error) {
    console.log('Could not get Yale department (table may not exist)');
    return null;
  }
}

// Run the example if this script is executed directly
if (require.main === module) {
  runExample();
}

module.exports = runExample;