/**
 * setup_conflict_handling.js
 * 
 * Script to set up the conflict handling system.
 * This script initializes the conflict tables in the database.
 */

const sqlite3 = require('sqlite3').verbose();
const { conflictSchema } = require('./models/conflict_record');
const ConflictDetector = require('./resolution/conflict_detector');

/**
 * Main setup function
 */
async function setupConflictHandling() {
  console.log('Setting up conflict handling system...');
  
  try {
    // Initialize conflict detector (which will create tables)
    const conflictDetector = new ConflictDetector();
    await conflictDetector.initialize();
    
    console.log('Conflict tables created successfully');
    
    // Check for existing conflicts
    await detectExistingConflicts(conflictDetector);
    
    await conflictDetector.close();
    console.log('Conflict handling system setup complete');
  } catch (error) {
    console.error('Error setting up conflict handling system:', error);
    process.exit(1);
  }
}

/**
 * Detect conflicts for existing executive orders
 * 
 * @param {ConflictDetector} conflictDetector Initialized conflict detector
 */
async function detectExistingConflicts(conflictDetector) {
  try {
    // Find all executive orders with multiple facts
    const ordersWithFactsQuery = `
      SELECT of.order_id, COUNT(*) as fact_count
      FROM knowledge_facts of
      GROUP BY of.order_id
      HAVING COUNT(*) > 1
    `;
    
    const ordersWithFacts = await conflictDetector.db.allAsync(ordersWithFactsQuery);
    
    if (ordersWithFacts.length === 0) {
      console.log('No orders with multiple facts found. Skipping conflict detection.');
      return;
    }
    
    console.log(`Found ${ordersWithFacts.length} orders with multiple facts. Checking for conflicts...`);
    
    // Process each order
    let totalConflicts = 0;
    
    for (const order of ordersWithFacts) {
      const conflicts = await conflictDetector.detectConflicts(order.order_id);
      totalConflicts += conflicts.length;
      console.log(`Detected ${conflicts.length} conflicts for order ID ${order.order_id}`);
    }
    
    console.log(`Total conflicts detected: ${totalConflicts}`);
    
    // Count unresolved conflicts
    const unresolvedCount = await conflictDetector.db.getAsync(
      `SELECT COUNT(*) as count FROM conflict_records WHERE status = ?`,
      [conflictSchema.statusValues.UNRESOLVED]
    );
    
    console.log(`Remaining unresolved conflicts: ${unresolvedCount.count}`);
  } catch (error) {
    console.error('Error detecting existing conflicts:', error);
    throw error;
  }
}

/**
 * Helper method to create a sample conflict for testing
 * 
 * @param {ConflictDetector} conflictDetector Initialized conflict detector
 */
async function createSampleConflict(conflictDetector) {
  try {
    // Check if we have executive orders and facts
    const hasOrders = await conflictDetector.db.getAsync(
      "SELECT COUNT(*) as count FROM executive_orders"
    );
    
    const hasFacts = await conflictDetector.db.getAsync(
      "SELECT COUNT(*) as count FROM knowledge_facts"
    );
    
    if (hasOrders.count === 0 || hasFacts.count === 0) {
      console.log('No orders or facts found. Cannot create sample conflict.');
      return;
    }
    
    // Get first order ID
    const order = await conflictDetector.db.getAsync(
      "SELECT id FROM executive_orders LIMIT 1"
    );
    
    const orderId = order.id;
    
    // Check if facts exist for this order
    const existingFacts = await conflictDetector.db.getAsync(
      "SELECT COUNT(*) as count FROM knowledge_facts WHERE order_id = ?",
      [orderId]
    );
    
    if (existingFacts.count >= 2) {
      console.log(`Order ID ${orderId} already has ${existingFacts.count} facts. Using existing facts.`);
      await conflictDetector.detectConflicts(orderId);
      return;
    }
    
    // Get a source ID
    const source = await conflictDetector.db.getAsync(
      "SELECT id FROM source_metadata LIMIT 1"
    );
    
    if (!source) {
      console.log('No sources found. Cannot create sample conflict.');
      return;
    }
    
    const sourceId = source.id;
    
    // Create two conflicting facts (dates with different values)
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    // Insert first fact
    const fact1Result = await conflictDetector.db.runAsync(`
      INSERT INTO knowledge_facts (
        order_id, fact_type, fact_value, confidence
      ) VALUES (?, ?, ?, ?)
    `, [
      orderId,
      'date',
      JSON.stringify({
        date: today.toISOString().split('T')[0],
        dateType: 'effective',
        description: 'Sample effective date',
        isExplicit: true
      }),
      0.9
    ]);
    
    // Add source to first fact
    await conflictDetector.db.runAsync(`
      INSERT INTO knowledge_sources (
        fact_id, source_id, extraction_date, extraction_method
      ) VALUES (?, ?, ?, ?)
    `, [
      fact1Result.lastID,
      sourceId,
      today.toISOString(),
      'manual'
    ]);
    
    // Insert second fact (conflicting date)
    const fact2Result = await conflictDetector.db.runAsync(`
      INSERT INTO knowledge_facts (
        order_id, fact_type, fact_value, confidence
      ) VALUES (?, ?, ?, ?)
    `, [
      orderId,
      'date',
      JSON.stringify({
        date: tomorrow.toISOString().split('T')[0],
        dateType: 'effective',
        description: 'Sample effective date (different)',
        isExplicit: true
      }),
      0.8
    ]);
    
    // Add source to second fact
    await conflictDetector.db.runAsync(`
      INSERT INTO knowledge_sources (
        fact_id, source_id, extraction_date, extraction_method
      ) VALUES (?, ?, ?, ?)
    `, [
      fact2Result.lastID,
      sourceId,
      today.toISOString(),
      'manual'
    ]);
    
    console.log(`Created sample conflicting facts for order ID ${orderId}`);
    
    // Detect conflicts
    await conflictDetector.detectConflicts(orderId);
  } catch (error) {
    console.error('Error creating sample conflict:', error);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  const createSample = process.argv.includes('--with-sample');
  
  setupConflictHandling().then(() => {
    if (createSample) {
      const conflictDetector = new ConflictDetector();
      conflictDetector.initialize()
        .then(() => createSampleConflict(conflictDetector))
        .then(() => conflictDetector.close())
        .then(() => console.log('Sample conflict created successfully'));
    }
  });
}

module.exports = setupConflictHandling;