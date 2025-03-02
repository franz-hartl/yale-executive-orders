/**
 * conflict_template_example.js
 * 
 * Example script demonstrating how to use the conflict renderer.
 */

const ConflictRenderer = require('./templates/renderers/conflict_renderer');
const ConflictDetector = require('./resolution/conflict_detector');
const KnowledgeManager = require('./knowledge/knowledge_manager');
const { conflictSchema } = require('./models/conflict_record');
const fs = require('fs');
const path = require('path');

/**
 * Sample conflict data
 */
const sampleConflicts = [
  {
    id: 1,
    conflictType: 'date',
    severity: conflictSchema.severityLevels.HIGH,
    status: conflictSchema.statusValues.UNRESOLVED,
    description: 'Conflicting information about effective date',
    fact1: {
      source: 'Federal Register',
      value: 'March 1, 2025'
    },
    fact2: {
      source: 'White House Announcement',
      value: 'February 15, 2025'
    },
    actions: [
      'Review official Federal Register publication',
      'Contact Office of Research Administration for guidance'
    ]
  },
  {
    id: 2,
    conflictType: 'requirement',
    severity: conflictSchema.severityLevels.MEDIUM,
    status: conflictSchema.statusValues.RESOLVED_MANUAL,
    description: 'Conflicting compliance requirements for research institutions',
    fact1: {
      source: 'Federal Register',
      value: 'All institutions must submit certification by June 30, 2025'
    },
    fact2: {
      source: 'NSF Guidance',
      value: 'Only institutions with active AI grants must submit certification'
    },
    resolutionStrategy: conflictSchema.resolutionStrategies.SOURCE_PRIORITY,
    resolutionDate: '2025-02-20T10:15:00Z',
    resolutionBy: 'Jane Smith',
    resolutionNotes: 'Federal Register takes precedence as the authoritative source'
  },
  {
    id: 3,
    conflictType: 'impact',
    severity: conflictSchema.severityLevels.LOW,
    status: conflictSchema.statusValues.RESOLVED_AUTO,
    description: 'Differing assessments of impact severity',
    fact1: {
      source: 'ACE Analysis',
      value: 'Medium impact on research universities'
    },
    fact2: {
      source: 'COGR Guidance',
      value: 'High impact on research universities with AI programs'
    },
    resolutionStrategy: conflictSchema.resolutionStrategies.NEWEST_SOURCE,
    resolutionDate: '2025-02-18T14:30:00Z',
    resolutionBy: 'system',
    resolutionNotes: 'Selected COGR guidance as it was published more recently and is more specific'
  },
  {
    id: 4,
    conflictType: 'requirement',
    severity: conflictSchema.severityLevels.HIGH,
    status: conflictSchema.statusValues.FLAGGED,
    description: 'Ambiguity in certification requirements for university AI systems',
    fact1: {
      source: 'Federal Register',
      value: 'Systems capable of generating synthetic content must be certified'
    },
    fact2: {
      source: 'Department of Education',
      value: 'Educational AI tools used solely for teaching purposes are exempt from certification'
    },
    resolutionNotes: 'Requires legal interpretation - flagged for General Counsel review'
  }
];

/**
 * Main example function
 */
async function runExample() {
  console.log('Conflict Renderer Example');
  console.log('========================');
  
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'template_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    
    // 1. Use sample conflict data
    console.log('\nGenerating conflict report from sample data...');
    
    const conflictRenderer = new ConflictRenderer();
    
    const sampleReport = conflictRenderer.generateConflictSummary({
      order_number: '14110',
      title: 'Addressing the Risks and Harnessing the Benefits of Artificial Intelligence',
      conflicts: sampleConflicts
    });
    
    fs.writeFileSync(
      path.join(outputDir, 'sample_conflict_report.md'),
      sampleReport
    );
    
    console.log('Saved to template_output/sample_conflict_report.md');
    
    // 2. Try to use actual conflict data from the database
    console.log('\nAttempting to generate report from database conflicts...');
    
    try {
      // Initialize conflict detector and knowledge manager
      const conflictDetector = new ConflictDetector();
      await conflictDetector.initialize();
      
      const knowledgeManager = new KnowledgeManager();
      await knowledgeManager.initialize();
      
      // Get the first order ID
      const order = await knowledgeManager.db.getAsync('SELECT id, order_number, title FROM executive_orders LIMIT 1');
      
      if (order) {
        console.log(`Found order: ${order.order_number} - ${order.title}`);
        
        // Get conflicts for this order
        const conflicts = await conflictDetector.getConflictsForOrder(order.id);
        
        console.log(`Found ${conflicts.length} conflicts in the database`);
        
        // If we have no conflicts, create some sample ones
        if (conflicts.length === 0) {
          console.log('No conflicts found in database. Creating sample conflicts...');
          
          // Get facts to create conflicts between
          const facts = await knowledgeManager.db.allAsync(`
            SELECT id, fact_type 
            FROM knowledge_facts 
            WHERE order_id = ?
            LIMIT 10
          `, [order.id]);
          
          if (facts.length >= 2) {
            console.log(`Found ${facts.length} facts. Creating sample conflict...`);
            
            // Create a conflict record
            await conflictDetector.db.runAsync(`
              INSERT INTO conflict_records (
                order_id, conflict_type, conflict_severity, fact1_id, fact2_id,
                detection_date, status, resolution_notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              order.id,
              facts[0].fact_type,
              conflictSchema.severityLevels.MEDIUM,
              facts[0].id,
              facts[1].id,
              new Date().toISOString(),
              conflictSchema.statusValues.UNRESOLVED,
              'Sample conflict created for demonstration'
            ]);
            
            console.log('Created sample conflict');
            
            // Get the updated conflicts
            const updatedConflicts = await conflictDetector.getConflictsForOrder(order.id);
            
            // Enhance conflicts with fact information
            const enhancedConflicts = [];
            for (const conflict of updatedConflicts) {
              const fact1 = await knowledgeManager.getFactById(conflict.fact1Id);
              const fact2 = await knowledgeManager.getFactById(conflict.fact2Id);
              
              // Get sources for facts
              const sources1 = fact1.sources.length > 0 ? 
                await knowledgeManager.db.allAsync(`
                  SELECT sm.source_name
                  FROM source_metadata sm
                  JOIN knowledge_sources ks ON sm.id = ks.source_id
                  WHERE ks.fact_id = ?
                `, [fact1.id]) : [];
              
              const sources2 = fact2.sources.length > 0 ? 
                await knowledgeManager.db.allAsync(`
                  SELECT sm.source_name
                  FROM source_metadata sm
                  JOIN knowledge_sources ks ON sm.id = ks.source_id
                  WHERE ks.fact_id = ?
                `, [fact2.id]) : [];
              
              enhancedConflicts.push({
                ...conflict,
                fact1: {
                  source: sources1.length > 0 ? sources1[0].source_name : 'Unknown',
                  value: JSON.stringify(fact1.value)
                },
                fact2: {
                  source: sources2.length > 0 ? sources2[0].source_name : 'Unknown',
                  value: JSON.stringify(fact2.value)
                }
              });
            }
            
            // Generate conflict report
            const dbConflictReport = conflictRenderer.generateConflictSummary({
              order_number: order.order_number,
              title: order.title,
              conflicts: enhancedConflicts
            });
            
            fs.writeFileSync(
              path.join(outputDir, 'database_conflict_report.md'),
              dbConflictReport
            );
            
            console.log('Saved to template_output/database_conflict_report.md');
          } else {
            console.log('Not enough facts found to create sample conflicts');
          }
        } else {
          // Enhance conflicts with fact information
          const enhancedConflicts = [];
          for (const conflict of conflicts) {
            try {
              const fact1 = await knowledgeManager.getFactById(conflict.fact1Id);
              const fact2 = await knowledgeManager.getFactById(conflict.fact2Id);
              
              if (!fact1 || !fact2) {
                console.log(`Warning: Could not find facts for conflict #${conflict.id}`);
                continue;
              }
              
              // Get sources for facts
              const sources1 = fact1.sources.length > 0 ? 
                await knowledgeManager.db.allAsync(`
                  SELECT sm.source_name
                  FROM source_metadata sm
                  JOIN knowledge_sources ks ON sm.id = ks.source_id
                  WHERE ks.fact_id = ?
                `, [fact1.id]) : [];
              
              const sources2 = fact2.sources.length > 0 ? 
                await knowledgeManager.db.allAsync(`
                  SELECT sm.source_name
                  FROM source_metadata sm
                  JOIN knowledge_sources ks ON sm.id = ks.source_id
                  WHERE ks.fact_id = ?
                `, [fact2.id]) : [];
              
              enhancedConflicts.push({
                ...conflict,
                fact1: {
                  source: sources1.length > 0 ? sources1[0].source_name : 'Unknown',
                  value: JSON.stringify(fact1.value)
                },
                fact2: {
                  source: sources2.length > 0 ? sources2[0].source_name : 'Unknown',
                  value: JSON.stringify(fact2.value)
                }
              });
            } catch (error) {
              console.error(`Error enhancing conflict #${conflict.id}:`, error);
            }
          }
          
          // Generate conflict report
          const dbConflictReport = conflictRenderer.generateConflictSummary({
            order_number: order.order_number,
            title: order.title,
            conflicts: enhancedConflicts
          });
          
          fs.writeFileSync(
            path.join(outputDir, 'database_conflict_report.md'),
            dbConflictReport
          );
          
          console.log('Saved to template_output/database_conflict_report.md');
        }
      } else {
        console.log('No orders found in the database');
      }
      
      // Close connections
      await conflictDetector.close();
      await knowledgeManager.close();
      
    } catch (error) {
      console.error('Error working with database conflicts:', error);
      console.log('Falling back to sample conflict report');
    }
    
    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example if this script is executed directly
if (require.main === module) {
  runExample();
}

module.exports = runExample;