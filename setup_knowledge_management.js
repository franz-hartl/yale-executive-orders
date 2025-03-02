/**
 * setup_knowledge_management.js
 * 
 * Script to set up the knowledge management system.
 * This script initializes the knowledge tables in the database.
 */

const KnowledgeManager = require('./knowledge/knowledge_manager');
const Fact = require('./knowledge/fact');
const { factTypes, relationshipTypes } = require('./models/knowledge_schema');

/**
 * Main setup function
 */
async function setupKnowledgeManagement() {
  console.log('Setting up knowledge management system...');
  
  try {
    // Initialize knowledge manager
    const knowledgeManager = new KnowledgeManager();
    await knowledgeManager.initialize();
    
    console.log('Knowledge tables created successfully');
    
    // Initialize source_metadata table if it doesn't exist
    await initializeSourceMetadata(knowledgeManager);
    
    // Optional: Create some sample knowledge facts for testing
    if (process.argv.includes('--with-samples')) {
      console.log('Creating sample knowledge facts...');
      await createSampleFacts(knowledgeManager);
    }
    
    await knowledgeManager.close();
    console.log('Knowledge management system setup complete');
  } catch (error) {
    console.error('Error setting up knowledge management system:', error);
    process.exit(1);
  }
}

/**
 * Create sample knowledge facts for testing
 * @param {KnowledgeManager} knowledgeManager
 */
async function createSampleFacts(knowledgeManager) {
  try {
    // Get a source ID to use (assumes sources exist in source_metadata)
    const sourceId = await getSourceId(knowledgeManager);
    if (!sourceId) {
      console.warn('No sources found in source_metadata, skipping sample facts');
      return;
    }
    
    // Get an order ID to use (assumes orders exist)
    let orderId = await getOrderId(knowledgeManager);
    
    // See if we need to create orders
    if (!orderId) {
      console.log('No orders found, creating a sample order...');
      
      // Check if executive_orders table exists
      const tableExists = await knowledgeManager.db.getAsync(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='executive_orders'
      `);
      
      if (!tableExists) {
        // Create the table
        await knowledgeManager.db.execAsync(`
          CREATE TABLE IF NOT EXISTS executive_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            signing_date DATE,
            publication_date DATE,
            president TEXT,
            summary TEXT,
            full_text TEXT,
            url TEXT,
            impact_level TEXT,
            status TEXT DEFAULT 'Active'
          )
        `);
      }
      
      // Create a sample order
      const result = await knowledgeManager.db.runAsync(`
        INSERT INTO executive_orders (order_number, title, signing_date, president, summary)
        VALUES (?, ?, ?, ?, ?)
      `, [
        'EO 14100',
        'Sample Executive Order for Knowledge System',
        new Date().toISOString().split('T')[0],
        'Demo President',
        'This is a sample executive order created for testing the knowledge system.'
      ]);
      
      const newOrderId = result.lastID;
      console.log(`Created sample order with ID: ${newOrderId}`);
      
      // Use the new order ID
      orderId = newOrderId;
    }
    
    // Create a sample date fact
    const dateFact = new Fact({
      orderId: orderId,
      factType: factTypes.DATE,
      value: {
        date: new Date().toISOString().split('T')[0],
        dateType: 'effective',
        description: 'Order goes into effect',
        isExplicit: true
      },
      confidence: 0.9
    });
    
    dateFact.addSource({
      sourceId: sourceId,
      sourceContext: 'Section 2, paragraph 3',
      extractionMethod: 'manual'
    });
    
    await knowledgeManager.storeFact(dateFact);
    console.log(`Created sample date fact with ID: ${dateFact.id}`);
    
    // Create a sample requirement fact
    const requirementFact = new Fact({
      orderId: orderId,
      factType: factTypes.REQUIREMENT,
      value: {
        requirementType: 'compliance',
        description: 'Universities must submit a report on implementation progress',
        targetEntities: ['universities', 'research institutions'],
        deadline: '2025-06-30',
        priority: 'high'
      },
      confidence: 0.85
    });
    
    requirementFact.addSource({
      sourceId: sourceId,
      sourceContext: 'Section 5',
      extractionMethod: 'manual'
    });
    
    await knowledgeManager.storeFact(requirementFact);
    console.log(`Created sample requirement fact with ID: ${requirementFact.id}`);
    
    // Add a relationship between them
    dateFact.addRelationship({
      relatedFact: requirementFact.id,
      type: relationshipTypes.RELATES_TO,
      description: 'Requirement deadline relates to the effective date'
    });
    
    await knowledgeManager.updateFact(dateFact);
    console.log('Added relationship between facts');
    
    // Check if yale_departments table exists
    const deptTableExists = await knowledgeManager.db.getAsync(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='yale_departments'
    `);
    
    // Create a sample department if needed
    let departmentId = null;
    if (deptTableExists) {
      const dept = await knowledgeManager.db.getAsync('SELECT id FROM yale_departments LIMIT 1');
      if (dept) departmentId = dept.id;
    }
    
    // Add a Yale-specific impact assessment
    const impactId = await knowledgeManager.addYaleImpact({
      factId: requirementFact.id,
      departmentId,
      impactLevel: 'Medium',
      description: 'Yale Research Administration will need to coordinate this reporting requirement',
      analyst: 'System'
    });
    
    console.log(`Created Yale impact assessment with ID: ${impactId}`);
    
    console.log('Sample facts created successfully');
  } catch (error) {
    console.error('Error creating sample facts:', error);
  }
}

/**
 * Initialize source_metadata table if it doesn't exist
 * @param {KnowledgeManager} knowledgeManager
 */
async function initializeSourceMetadata(knowledgeManager) {
  try {
    // Check if the source_metadata table exists
    const tableExists = await knowledgeManager.db.getAsync(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='source_metadata'
    `);
    
    if (!tableExists) {
      console.log('Creating source_metadata table...');
      
      // Create the table
      await knowledgeManager.db.execAsync(`
        CREATE TABLE IF NOT EXISTS source_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_name TEXT NOT NULL,
          source_url TEXT,
          last_updated TEXT,
          fetch_frequency TEXT,
          description TEXT
        )
      `);
      
      // Add initial sources
      const sources = [
        {
          source_name: 'Federal Register',
          source_url: 'https://www.federalregister.gov/',
          description: 'The official source for executive orders and other presidential documents',
          fetch_frequency: 'daily'
        },
        {
          source_name: 'White House',
          source_url: 'https://www.whitehouse.gov/briefing-room/presidential-actions/',
          description: 'Official White House releases of executive orders and related materials',
          fetch_frequency: 'daily'
        },
        {
          source_name: 'Council on Governmental Relations (COGR)',
          source_url: 'https://www.cogr.edu/',
          description: 'Analysis of executive orders from a research university perspective',
          fetch_frequency: 'weekly'
        },
        {
          source_name: 'American Council on Education (ACE)',
          source_url: 'https://www.acenet.edu/',
          description: 'Higher education sector-wide analyses of executive orders',
          fetch_frequency: 'weekly'
        },
        {
          source_name: 'National Science Foundation (NSF)',
          source_url: 'https://www.nsf.gov/',
          description: 'Implementation guidance for research grants related to executive orders',
          fetch_frequency: 'weekly'
        },
        {
          source_name: 'National Institutes of Health (NIH)',
          source_url: 'https://www.nih.gov/',
          description: 'Policy notices for biomedical research related to executive orders',
          fetch_frequency: 'weekly'
        },
        {
          source_name: 'Yale Analysis',
          source_url: 'internal',
          description: 'Yale-specific analysis and interpretation of executive orders',
          fetch_frequency: 'as needed'
        }
      ];
      
      for (const source of sources) {
        await knowledgeManager.db.runAsync(
          'INSERT INTO source_metadata (source_name, source_url, description, fetch_frequency) VALUES (?, ?, ?, ?)',
          [source.source_name, source.source_url, source.description, source.fetch_frequency]
        );
      }
      
      console.log('Source metadata initialized successfully');
    } else {
      console.log('Source metadata table already exists');
    }
  } catch (error) {
    console.error('Error initializing source metadata:', error);
    throw error;
  }
}

/**
 * Helper to get a source ID
 * @param {KnowledgeManager} knowledgeManager
 * @returns {Promise<number|null>} First source ID or null
 */
async function getSourceId(knowledgeManager) {
  const source = await knowledgeManager.db.getAsync('SELECT id FROM source_metadata LIMIT 1');
  return source ? source.id : null;
}

/**
 * Helper to get an order ID
 * @param {KnowledgeManager} knowledgeManager
 * @returns {Promise<number|null>} First order ID or null
 */
async function getOrderId(knowledgeManager) {
  const order = await knowledgeManager.db.getAsync('SELECT id FROM executive_orders LIMIT 1');
  return order ? order.id : null;
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupKnowledgeManagement();
}

module.exports = setupKnowledgeManagement;