/**
 * conflict_handling_example.js
 * 
 * Example script demonstrating how to use the conflict handling system.
 */

const ConflictDetector = require('./resolution/conflict_detector');
const KnowledgeManager = require('./knowledge/knowledge_manager');
const { ConflictRecord, conflictSchema } = require('./models/conflict_record');
const { SOURCE_PRIORITIES } = require('./resolution/resolution_strategies');

/**
 * Main example function
 */
async function runExample() {
  console.log('Conflict Handling System Example');
  console.log('=================================');
  
  try {
    // Initialize knowledge manager and conflict detector
    const knowledgeManager = new KnowledgeManager();
    await knowledgeManager.initialize();
    
    const conflictDetector = new ConflictDetector();
    await conflictDetector.initialize();
    
    // Get the first order to work with
    const orderId = await getExampleOrderId(knowledgeManager);
    if (!orderId) {
      console.log('No executive orders found in the database.');
      return;
    }
    
    const orderInfo = await getOrderInfo(knowledgeManager, orderId);
    console.log(`\nWorking with Executive Order: ${orderInfo.order_number} - ${orderInfo.title}`);
    
    // 1. Create conflicting facts
    console.log('\nCreating conflicting facts...');
    const { fact1Id, fact2Id } = await createConflictingFacts(knowledgeManager, orderId);
    console.log(`Created conflicting facts with IDs: ${fact1Id} and ${fact2Id}`);
    
    // 2. Detect conflicts
    console.log('\nDetecting conflicts...');
    const conflicts = await conflictDetector.detectConflicts(orderId);
    console.log(`Detected ${conflicts.length} conflicts`);
    
    if (conflicts.length === 0) {
      console.log('No conflicts detected. Exiting example.');
      await knowledgeManager.close();
      await conflictDetector.close();
      return;
    }
    
    // 3. Show conflict details
    console.log('\nConflict details:');
    for (const conflict of conflicts) {
      console.log(`  ID: ${conflict.id}`);
      console.log(`  Type: ${conflict.conflictType}`);
      console.log(`  Severity: ${conflict.severity}`);
      console.log(`  Status: ${conflict.status}`);
      console.log(`  Detected: ${conflict.detectionDate}`);
      console.log(`  Facts: ${conflict.fact1Id} vs ${conflict.fact2Id}`);
      console.log('---');
    }
    
    // 4. Get conflict facts
    console.log('\nFetching details for conflicting facts...');
    const conflict = conflicts[0];
    
    const fact1 = await knowledgeManager.getFactById(conflict.fact1Id);
    const fact2 = await knowledgeManager.getFactById(conflict.fact2Id);
    
    console.log('\nFact 1:');
    console.log(`  Type: ${fact1.factType}`);
    console.log(`  Value: ${JSON.stringify(fact1.value, null, 2)}`);
    console.log(`  Confidence: ${fact1.confidence}`);
    console.log(`  Sources: ${fact1.sources.length}`);
    
    console.log('\nFact 2:');
    console.log(`  Type: ${fact2.factType}`);
    console.log(`  Value: ${JSON.stringify(fact2.value, null, 2)}`);
    console.log(`  Confidence: ${fact2.confidence}`);
    console.log(`  Sources: ${fact2.sources.length}`);
    
    // 5. Manually resolve a conflict
    console.log('\nManually resolving conflict...');
    const resolution = await conflictDetector.resolveConflict(conflict.id, {
      selectedFactId: fact1.id, // Select fact 1 as the correct one
      notes: 'Manually selected during example run',
      by: 'example script'
    });
    
    console.log(`Conflict resolved with status: ${resolution.status}`);
    console.log(`Resolution strategy: ${resolution.resolutionStrategy}`);
    console.log(`Resolved by: ${resolution.resolutionBy}`);
    console.log(`Resolution notes: ${resolution.resolutionNotes}`);
    
    // 6. Get all resolved conflicts
    console.log('\nListing all resolved conflicts:');
    const resolvedConflicts = await conflictDetector.getConflictsForOrder(
      orderId, 
      conflictSchema.statusValues.RESOLVED_MANUAL
    );
    
    console.log(`Found ${resolvedConflicts.length} resolved conflicts`);
    
    // 7. Show source priorities used for conflict resolution
    console.log('\nSource priorities used for conflict resolution:');
    for (const [source, priority] of Object.entries(SOURCE_PRIORITIES)) {
      if (source !== 'default') {
        console.log(`  ${source}: ${priority}`);
      }
    }
    
    // Clean up
    await knowledgeManager.close();
    await conflictDetector.close();
    
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
  const order = await knowledgeManager.db.getAsync('SELECT id FROM executive_orders LIMIT 1');
  return order ? order.id : null;
}

/**
 * Helper to get basic order info
 * @param {KnowledgeManager} knowledgeManager
 * @param {number} orderId
 * @returns {Promise<Object>} Order information
 */
async function getOrderInfo(knowledgeManager, orderId) {
  return knowledgeManager.db.getAsync(
    'SELECT id, order_number, title, signing_date FROM executive_orders WHERE id = ?',
    [orderId]
  );
}

/**
 * Create conflicting facts for demonstration
 * @param {KnowledgeManager} knowledgeManager
 * @param {number} orderId
 * @returns {Promise<Object>} The IDs of the created facts
 */
async function createConflictingFacts(knowledgeManager, orderId) {
  // Get a source ID
  const source1 = await knowledgeManager.db.getAsync(
    "SELECT id FROM source_metadata WHERE source_name = 'Federal Register' LIMIT 1"
  );
  
  const source2 = await knowledgeManager.db.getAsync(
    "SELECT id FROM source_metadata WHERE source_name != 'Federal Register' LIMIT 1"
  );
  
  const sourceId1 = source1 ? source1.id : 1;
  const sourceId2 = source2 ? source2.id : 2;
  
  // Create a date fact
  const fact1Result = await knowledgeManager.db.runAsync(`
    INSERT INTO knowledge_facts (
      order_id, fact_type, fact_value, confidence
    ) VALUES (?, ?, ?, ?)
  `, [
    orderId,
    'date',
    JSON.stringify({
      date: '2025-04-01',
      dateType: 'effective',
      description: 'Order becomes effective',
      isExplicit: true
    }),
    0.9
  ]);
  
  // Add source to fact1
  await knowledgeManager.db.runAsync(`
    INSERT INTO knowledge_sources (
      fact_id, source_id, extraction_date, extraction_method
    ) VALUES (?, ?, ?, ?)
  `, [
    fact1Result.lastID,
    sourceId1,
    new Date().toISOString(),
    'manual'
  ]);
  
  // Create a conflicting date fact
  const fact2Result = await knowledgeManager.db.runAsync(`
    INSERT INTO knowledge_facts (
      order_id, fact_type, fact_value, confidence
    ) VALUES (?, ?, ?, ?)
  `, [
    orderId,
    'date',
    JSON.stringify({
      date: '2025-05-01',
      dateType: 'effective',
      description: 'Order becomes effective',
      isExplicit: true
    }),
    0.85
  ]);
  
  // Add source to fact2
  await knowledgeManager.db.runAsync(`
    INSERT INTO knowledge_sources (
      fact_id, source_id, extraction_date, extraction_method
    ) VALUES (?, ?, ?, ?)
  `, [
    fact2Result.lastID,
    sourceId2,
    new Date().toISOString(),
    'manual'
  ]);
  
  return {
    fact1Id: fact1Result.lastID,
    fact2Id: fact2Result.lastID
  };
}

// Run the example if this script is executed directly
if (require.main === module) {
  runExample();
}

module.exports = runExample;