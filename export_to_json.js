/**
 * export_to_json.js
 * 
 * This script exports data from the SQLite database to JSON files for use in a static GitHub Pages site.
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'executive_orders.db');
const outputDir = path.join(__dirname, 'public', 'data');

// Connect to database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Promisify database queries
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error('Error creating output directory:', err);
      throw err;
    }
  }
}

// Export categories
async function exportCategories() {
  try {
    const categories = await dbAll('SELECT * FROM categories ORDER BY name');
    const outputPath = path.join(outputDir, 'categories.json');
    await fs.writeFile(outputPath, JSON.stringify(categories, null, 2));
    console.log(`Exported ${categories.length} categories to ${outputPath}`);
    return categories;
  } catch (err) {
    console.error('Error exporting categories:', err);
    throw err;
  }
}

// Export impact areas
async function exportImpactAreas() {
  try {
    const impactAreas = await dbAll('SELECT * FROM impact_areas ORDER BY name');
    const outputPath = path.join(outputDir, 'impact_areas.json');
    await fs.writeFile(outputPath, JSON.stringify(impactAreas, null, 2));
    console.log(`Exported ${impactAreas.length} impact areas to ${outputPath}`);
    return impactAreas;
  } catch (err) {
    console.error('Error exporting impact areas:', err);
    throw err;
  }
}

// Export university impact areas
async function exportUniversityImpactAreas() {
  try {
    const universityImpactAreas = await dbAll('SELECT * FROM university_impact_areas ORDER BY name');
    const outputPath = path.join(outputDir, 'university_impact_areas.json');
    await fs.writeFile(outputPath, JSON.stringify(universityImpactAreas, null, 2));
    console.log(`Exported ${universityImpactAreas.length} university impact areas to ${outputPath}`);
    return universityImpactAreas;
  } catch (err) {
    console.error('Error exporting university impact areas:', err);
    throw err;
  }
}

// Export executive orders with all related data
async function exportExecutiveOrders() {
  try {
    // Get all executive orders
    const orders = await dbAll(`
      SELECT eo.*
      FROM executive_orders eo
      ORDER BY signing_date DESC
    `);
    
    // For each order, get categories, impact areas, and university impact areas
    const fullOrders = await Promise.all(orders.map(async (order) => {
      // Get categories
      const categories = await dbAll(`
        SELECT c.id, c.name, c.description
        FROM categories c
        JOIN order_categories oc ON c.id = oc.category_id
        WHERE oc.order_id = ?
      `, [order.id]);
      
      // Get impact areas
      const impactAreas = await dbAll(`
        SELECT ia.id, ia.name, ia.description
        FROM impact_areas ia
        JOIN order_impact_areas oia ON ia.id = oia.impact_area_id
        WHERE oia.order_id = ?
      `, [order.id]);
      
      // Get university impact areas
      const universityImpactAreas = await dbAll(`
        SELECT uia.id, uia.name, uia.description, ouia.notes
        FROM university_impact_areas uia
        JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
        WHERE ouia.order_id = ?
      `, [order.id]);
      
      // Get compliance actions if any
      const complianceActions = await dbAll(`
        SELECT *
        FROM compliance_actions
        WHERE order_id = ?
        ORDER BY deadline ASC
      `, [order.id]);
      
      // Get external sources data if any
      const sources = await dbAll(`
        SELECT sm.source_name, sm.source_url, os.external_reference_id, 
               os.source_specific_data, os.fetch_date
        FROM order_sources os
        JOIN source_metadata sm ON os.source_id = sm.id
        WHERE os.order_id = ?
      `, [order.id]);
      
      // Format sources data for export
      const formattedSources = sources.map(source => {
        let specificData = null;
        try {
          if (source.source_specific_data) {
            specificData = JSON.parse(source.source_specific_data);
          }
        } catch (e) {
          console.log(`Error parsing source data for order ${order.id}: ${e.message}`);
        }
        
        return {
          name: source.source_name,
          url: source.source_url,
          reference_id: source.external_reference_id,
          fetch_date: source.fetch_date,
          data: specificData
        };
      });
      
      // Check which summary types exist
      let hasPlainSummary = false;
      let hasExecutiveBrief = false;
      let hasComprehensiveAnalysis = false;
      
      try {
        if (order.plain_language_summary && order.plain_language_summary.trim() !== '') {
          hasPlainSummary = true;
        }
        if (order.executive_brief && order.executive_brief.trim() !== '') {
          hasExecutiveBrief = true;
        }
        if (order.comprehensive_analysis && order.comprehensive_analysis.trim() !== '') {
          hasComprehensiveAnalysis = true;
        }
      } catch (e) {
        console.log(`Error checking summaries for order ${order.id}: ${e.message}`);
      }
      
      // Get differentiated impacts by institution type
      const differentiatedImpacts = await dbAll(`
        SELECT di.*, it.name as institution_type, fa.name as functional_area
        FROM differentiated_impacts di
        JOIN institution_types it ON di.institution_type_id = it.id
        JOIN functional_areas fa ON di.functional_area_id = fa.id
        WHERE di.order_id = ?
        ORDER BY it.name, fa.name
      `, [order.id]);
      
      // Format differentiated impacts for export
      const formattedImpacts = {};
      differentiatedImpacts.forEach(impact => {
        if (!formattedImpacts[impact.institution_type]) {
          formattedImpacts[impact.institution_type] = {};
        }
        
        formattedImpacts[impact.institution_type][impact.functional_area] = {
          score: impact.impact_score,
          description: impact.impact_description,
          compliance_requirements: impact.compliance_requirements,
          resource_implications: impact.resource_implications
        };
      });
      
      // Get compliance timelines
      const complianceTimelines = await dbAll(`
        SELECT ct.*, it.name as institution_type
        FROM compliance_timelines ct
        JOIN institution_types it ON ct.institution_type_id = it.id
        WHERE ct.order_id = ?
        ORDER BY ct.deadline_date, it.name
      `, [order.id]);
      
      // Format compliance timelines for export
      const formattedTimelines = {};
      complianceTimelines.forEach(timeline => {
        const instType = timeline.institution_type;
        if (!formattedTimelines[instType]) {
          formattedTimelines[instType] = [];
        }
        
        formattedTimelines[instType].push({
          deadline: timeline.deadline_date,
          requirement: timeline.requirement,
          optional: timeline.optional === 1,
          notes: timeline.notes
        });
      });
      
      // Get impact scoring
      const impactScoring = await dbAll(`
        SELECT is.*, it.name as institution_type
        FROM impact_scoring is
        JOIN institution_types it ON is.institution_type_id = it.id
        WHERE is.order_id = ?
        ORDER BY is.composite_score DESC
      `, [order.id]);
      
      // Format impact scoring for export
      const formattedScoring = impactScoring.map(score => {
        let modifiers = null;
        try {
          if (score.modifying_factors) {
            modifiers = JSON.parse(score.modifying_factors);
          }
        } catch (e) {
          console.log(`Error parsing modifying factors for order ${order.id}: ${e.message}`);
        }
        
        return {
          institution_type: score.institution_type,
          composite_score: score.composite_score,
          impact_level: score.composite_score >= 4.5 ? 'Critical' : 
                       (score.composite_score >= 3.5 ? 'High' : 
                       (score.composite_score >= 2.5 ? 'Moderate' : 
                       (score.composite_score >= 1.5 ? 'Low' : 'Minimal'))),
          urgency_score: score.urgency_score,
          urgency_rating: score.urgency_score >= 5 ? 'Immediate' : 
                         (score.urgency_score >= 3 ? 'Near-term' : 
                         (score.urgency_score >= 1 ? 'Medium-term' : 'Long-term')),
          resource_intensity_score: score.resource_intensity_score,
          resource_intensity_rating: score.resource_intensity_score >= 7 ? 'High' : 
                                    (score.resource_intensity_score >= 4 ? 'Moderate' : 'Low'),
          calculation_notes: score.calculation_notes,
          modifying_factors: modifiers
        };
      });
      
      // Get implementation resources
      const implementationResources = await dbAll(`
        SELECT ir.*, it.name as institution_type, fa.name as functional_area
        FROM implementation_resources ir
        LEFT JOIN institution_types it ON ir.institution_type_id = it.id
        LEFT JOIN functional_areas fa ON ir.functional_area_id = fa.id
        WHERE ir.order_id = ?
        ORDER BY ir.resource_type, ir.title
      `, [order.id]);
      
      // Return enriched order
      return {
        ...order,
        categories: categories.map(c => c.name),
        impact_areas: impactAreas.map(ia => ia.name),
        university_impact_areas: universityImpactAreas.map(uia => ({
          name: uia.name,
          description: uia.description,
          notes: uia.notes
        })),
        differentiated_impacts: formattedImpacts,
        compliance_timelines: formattedTimelines,
        impact_scoring: formattedScoring,
        implementation_resources: implementationResources,
        compliance_actions: complianceActions,
        has_plain_language_summary: hasPlainSummary,
        has_executive_brief: hasExecutiveBrief,
        has_comprehensive_analysis: hasComprehensiveAnalysis,
        summary_formats_available: [
          ...(hasExecutiveBrief ? ['executive_brief'] : []),
          ...(hasPlainSummary ? ['standard'] : []),
          ...(hasComprehensiveAnalysis ? ['comprehensive'] : [])
        ],
        sources: formattedSources
      };
    }));
    
    // Write complete orders to file
    const outputPath = path.join(outputDir, 'executive_orders.json');
    await fs.writeFile(outputPath, JSON.stringify(fullOrders, null, 2));
    console.log(`Exported ${fullOrders.length} executive orders to ${outputPath}`);
    
    // Also save individual orders for direct access
    const individualDir = path.join(outputDir, 'orders');
    await fs.mkdir(individualDir, { recursive: true });
    
    for (const order of fullOrders) {
      const orderPath = path.join(individualDir, `${order.id}.json`);
      await fs.writeFile(orderPath, JSON.stringify(order, null, 2));
    }
    console.log(`Exported ${fullOrders.length} individual order files to ${individualDir}`);
    
    // Export all summary types separately if they exist
    const summariesDir = path.join(outputDir, 'summaries');
    const executiveBriefsDir = path.join(outputDir, 'executive_briefs');
    const comprehensiveAnalysesDir = path.join(outputDir, 'comprehensive_analyses');
    
    await fs.mkdir(summariesDir, { recursive: true });
    await fs.mkdir(executiveBriefsDir, { recursive: true });
    await fs.mkdir(comprehensiveAnalysesDir, { recursive: true });
    
    for (const order of fullOrders) {
      // Export standard summaries
      if (order.has_plain_language_summary) {
        const summaryPath = path.join(summariesDir, `${order.id}.html`);
        await fs.writeFile(summaryPath, order.plain_language_summary || '');
      }
      
      // Export executive briefs
      if (order.has_executive_brief) {
        const briefPath = path.join(executiveBriefsDir, `${order.id}.html`);
        await fs.writeFile(briefPath, order.executive_brief || '');
      }
      
      // Export comprehensive analyses
      if (order.has_comprehensive_analysis) {
        const analysisPath = path.join(comprehensiveAnalysesDir, `${order.id}.html`);
        await fs.writeFile(analysisPath, order.comprehensive_analysis || '');
      }
    }
    
    console.log(`Exported standard summaries to ${summariesDir}`);
    console.log(`Exported executive briefs to ${executiveBriefsDir}`);
    console.log(`Exported comprehensive analyses to ${comprehensiveAnalysesDir}`);
    
    return fullOrders;
  } catch (err) {
    console.error('Error exporting executive orders:', err);
    throw err;
  }
}

// Export statistics
async function exportStatistics() {
  try {
    // Impact level stats
    const impactLevels = await dbAll(`
      SELECT impact_level, COUNT(*) as count
      FROM executive_orders
      GROUP BY impact_level
      ORDER BY 
        CASE 
          WHEN impact_level = 'Critical' THEN 1
          WHEN impact_level = 'High' THEN 2
          WHEN impact_level = 'Medium' THEN 3
          WHEN impact_level = 'Low' THEN 4
          ELSE 5
        END
    `);
    
    // University impact area stats
    const universityImpactAreas = await dbAll(`
      SELECT uia.name, COUNT(*) as count
      FROM university_impact_areas uia
      JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
      GROUP BY uia.name
      ORDER BY count DESC
    `);
    
    // Category stats
    const categories = await dbAll(`
      SELECT c.name, COUNT(*) as count
      FROM categories c
      JOIN order_categories oc ON c.id = oc.category_id
      GROUP BY c.name
      ORDER BY count DESC
    `);
    
    // Timeline stats
    const timeline = await dbAll(`
      SELECT 
        strftime('%Y-%m', signing_date) as month,
        COUNT(*) as count
      FROM executive_orders
      WHERE signing_date IS NOT NULL
      GROUP BY month
      ORDER BY month
    `);
    
    // External source stats
    const sourcesStats = await dbAll(`
      SELECT 
        sm.source_name as name,
        COUNT(DISTINCT os.order_id) as order_count
      FROM source_metadata sm
      LEFT JOIN order_sources os ON sm.id = os.source_id
      GROUP BY sm.id
      ORDER BY order_count DESC
    `);
    
    // Combine all stats
    const stats = {
      impactLevels,
      universityImpactAreas,
      categories,
      timeline,
      externalSources: sourcesStats
    };
    
    // Write to file
    const outputPath = path.join(outputDir, 'statistics.json');
    await fs.writeFile(outputPath, JSON.stringify(stats, null, 2));
    console.log(`Exported statistics to ${outputPath}`);
    
    return stats;
  } catch (err) {
    console.error('Error exporting statistics:', err);
    throw err;
  }
}

// Create system info file
async function exportSystemInfo() {
  try {
    const orderCount = (await dbAll('SELECT COUNT(*) as count FROM executive_orders'))[0].count;
    
    // Get source information
    const sources = await dbAll(`
      SELECT 
        sm.source_name,
        sm.source_url,
        sm.description,
        sm.last_updated,
        COUNT(DISTINCT os.order_id) as order_count
      FROM source_metadata sm
      LEFT JOIN order_sources os ON sm.id = os.source_id
      GROUP BY sm.id
      ORDER BY sm.source_name
    `);
    
    const systemInfo = {
      topicName: 'Higher Education Executive Order Analysis',
      topicDescription: 'Analysis of executive orders and their impact on higher education institutions nationwide',
      orderCount: orderCount,
      version: '1.1.0',
      lastUpdated: new Date().toISOString(),
      isStaticVersion: true,
      notes: 'This is a static version of the Higher Education Executive Order Analysis system, deployed on GitHub Pages',
      externalSources: sources.map(source => ({
        name: source.source_name,
        url: source.source_url,
        description: source.description,
        lastUpdated: source.last_updated,
        orderCount: source.order_count
      }))
    };
    
    const outputPath = path.join(outputDir, 'system_info.json');
    await fs.writeFile(outputPath, JSON.stringify(systemInfo, null, 2));
    console.log(`Exported system info to ${outputPath}`);
    
    return systemInfo;
  } catch (err) {
    console.error('Error exporting system info:', err);
    throw err;
  }
}

// Export metadata (categories, impact areas, etc.) as a single file
async function exportMetadata(categories, impactAreas, universityImpactAreas) {
  try {
    // Get source metadata
    const sources = await dbAll(`
      SELECT * FROM source_metadata ORDER BY source_name
    `);
    
    // Get institution types
    const institutionTypes = await dbAll(`
      SELECT * FROM institution_types ORDER BY name
    `);
    
    // Get functional areas
    const functionalAreas = await dbAll(`
      SELECT * FROM functional_areas ORDER BY name
    `);
    
    const metadata = {
      categories,
      impactAreas,
      universityImpactAreas,
      externalSources: sources,
      institutionTypes,
      functionalAreas
    };
    
    const outputPath = path.join(outputDir, 'metadata.json');
    await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
    console.log(`Exported combined metadata to ${outputPath}`);
    
    return metadata;
  } catch (err) {
    console.error('Error exporting metadata:', err);
    throw err;
  }
}

// Main export function
async function exportAll() {
  try {
    await ensureOutputDir();
    
    // Export all data
    const categories = await exportCategories();
    const impactAreas = await exportImpactAreas();
    const universityImpactAreas = await exportUniversityImpactAreas();
    await exportMetadata(categories, impactAreas, universityImpactAreas);
    
    await exportExecutiveOrders();
    await exportStatistics();
    await exportSystemInfo();
    
    console.log('All data successfully exported to JSON files.');
  } catch (err) {
    console.error('Error exporting data:', err);
  } finally {
    db.close();
  }
}

// Run the export
exportAll();