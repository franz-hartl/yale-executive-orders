/**
 * export_to_json_clean.js
 * 
 * Clean version of the JSON export script that uses the new database API.
 * Exports data from the SQLite database to JSON files for use in a static GitHub Pages site.
 */

const fs = require('fs').promises;
const path = require('path');
const Database = require('./utils/database');

// Output directory
const outputDir = path.join(__dirname, 'public', 'data');

// Initialize database
const db = new Database();

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
    const categories = await db.all('SELECT * FROM categories ORDER BY name');
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
    const impactAreas = await db.all('SELECT * FROM impact_areas ORDER BY name');
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
    const universityImpactAreas = await db.all('SELECT * FROM university_impact_areas ORDER BY name');
    const outputPath = path.join(outputDir, 'university_impact_areas.json');
    await fs.writeFile(outputPath, JSON.stringify(universityImpactAreas, null, 2));
    console.log(`Exported ${universityImpactAreas.length} university impact areas to ${outputPath}`);
    return universityImpactAreas;
  } catch (err) {
    console.error('Error exporting university impact areas:', err);
    throw err;
  }
}

// Export Yale-specific impact areas
async function exportYaleImpactAreas() {
  try {
    const query = `
      SELECT y.*, u.name as related_r1_area_name 
      FROM yale_impact_areas y
      LEFT JOIN university_impact_areas u ON y.related_r1_area_id = u.id
      ORDER BY y.id
    `;
    const yaleImpactAreas = await db.all(query);
    const outputPath = path.join(outputDir, 'yale_impact_areas.json');
    await fs.writeFile(outputPath, JSON.stringify(yaleImpactAreas, null, 2));
    console.log(`Exported ${yaleImpactAreas.length} Yale-specific impact areas to ${outputPath}`);
    return yaleImpactAreas;
  } catch (err) {
    console.error('Error exporting Yale-specific impact areas:', err);
    // If the table doesn't exist yet, this is non-fatal
    if (err.message.includes('no such table')) {
      console.log('Yale impact areas table not available yet - skipping export');
      return [];
    }
    throw err;
  }
}

// Export Yale stakeholders
async function exportYaleStakeholders() {
  try {
    const yaleStakeholders = await db.all('SELECT * FROM yale_stakeholders ORDER BY name');
    const outputPath = path.join(outputDir, 'yale_stakeholders.json');
    await fs.writeFile(outputPath, JSON.stringify(yaleStakeholders, null, 2));
    console.log(`Exported ${yaleStakeholders.length} Yale stakeholders to ${outputPath}`);
    return yaleStakeholders;
  } catch (err) {
    console.error('Error exporting Yale stakeholders:', err);
    // If the table doesn't exist yet, this is non-fatal
    if (err.message.includes('no such table')) {
      console.log('Yale stakeholders table not available yet - skipping export');
      return [];
    }
    throw err;
  }
}

// Process and normalize source attribution
function normalizeSourceAttribution(sources) {
  return sources.map(source => {
    return {
      name: source.source_name,
      abbreviation: getSourceAbbreviation(source.source_name),
      url: source.source_url,
      reference_id: source.external_reference_id,
      fetch_date: source.fetch_date,
      data: source.specificData || null
    };
  });
}

// Get abbreviation for a source name
function getSourceAbbreviation(sourceName) {
  const abbreviations = {
    'COGR Executive Order Tracker': 'COGR',
    'NSF Implementation Pages': 'NSF',
    'NIH Policy Notices': 'NIH',
    'ACE Policy Briefs': 'ACE'
  };
  
  return abbreviations[sourceName] || sourceName.split(' ').map(word => word[0]).join('');
}

// Export executive orders with all related data
async function exportExecutiveOrders() {
  try {
    // Get all executive orders
    const orders = await db.all(`
      SELECT eo.*
      FROM executive_orders eo
      ORDER BY signing_date DESC
    `);
    
    // For each order, get related data
    const fullOrders = await Promise.all(orders.map(async (order) => {
      const fullOrder = await db.getOrderWithRelations(order.id);
      
      // Format the order data for export
      return {
        ...fullOrder,
        categories: fullOrder.categories.map(c => c.name),
        impact_areas: fullOrder.impact_areas.map(ia => ia.name),
        university_impact_areas: fullOrder.university_impact_areas.map(uia => ({
          name: uia.name,
          description: uia.description,
          notes: uia.notes
        })),
        has_plain_language_summary: !!fullOrder.plain_language_summary,
        has_executive_brief: !!fullOrder.executive_brief,
        has_comprehensive_analysis: !!fullOrder.comprehensive_analysis,
        summary_formats_available: [
          ...(fullOrder.executive_brief ? ['executive_brief'] : []),
          ...(fullOrder.plain_language_summary ? ['standard'] : []),
          ...(fullOrder.comprehensive_analysis ? ['comprehensive'] : [])
        ]
      };
    }));
    
    // Write complete orders to file
    const outputPath = path.join(outputDir, 'executive_orders.json');
    await fs.writeFile(outputPath, JSON.stringify(fullOrders, null, 2));
    console.log(`Exported ${fullOrders.length} executive orders to ${outputPath}`);
    
    // Write processed orders file with minimized duplication
    const processedOutputPath = path.join(outputDir, 'processed_executive_orders.json');
    const processedOrders = fullOrders.map(order => {
      const { plain_language_summary, executive_brief, comprehensive_analysis, ...minimalOrder } = order;
      return minimalOrder;
    });
    await fs.writeFile(processedOutputPath, JSON.stringify(processedOrders, null, 2));
    console.log(`Exported ${processedOrders.length} processed orders to ${processedOutputPath}`);
    
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
    
    for (const order of orders) {
      const fullOrder = await db.getOrder(order.id);
      
      // Export standard summaries
      if (fullOrder.plain_language_summary) {
        const summaryPath = path.join(summariesDir, `${order.id}.html`);
        await fs.writeFile(summaryPath, fullOrder.plain_language_summary);
      }
      
      // Export executive briefs
      if (fullOrder.executive_brief) {
        const briefPath = path.join(executiveBriefsDir, `${order.id}.html`);
        await fs.writeFile(briefPath, fullOrder.executive_brief);
      }
      
      // Export comprehensive analyses
      if (fullOrder.comprehensive_analysis) {
        const analysisPath = path.join(comprehensiveAnalysesDir, `${order.id}.html`);
        await fs.writeFile(analysisPath, fullOrder.comprehensive_analysis);
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
    const impactLevels = await db.all(`
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
    const universityImpactAreas = await db.all(`
      SELECT uia.name, COUNT(*) as count
      FROM university_impact_areas uia
      JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
      GROUP BY uia.name
      ORDER BY count DESC
    `);
    
    // Yale-specific impact area stats
    let yaleImpactAreas = [];
    try {
      yaleImpactAreas = await db.all(`
        SELECT yia.name, COUNT(*) as count
        FROM yale_impact_areas yia
        JOIN order_yale_impact_areas oyia ON yia.id = oyia.yale_impact_area_id
        GROUP BY yia.name
        ORDER BY count DESC
      `);
    } catch (err) {
      // This is expected if we haven't populated the Yale data yet
      console.log('Yale impact area stats not available yet');
    }
    
    // Category stats
    const categories = await db.all(`
      SELECT c.name, COUNT(*) as count
      FROM categories c
      JOIN order_categories oc ON c.id = oc.category_id
      GROUP BY c.name
      ORDER BY count DESC
    `);
    
    // Timeline stats
    const timeline = await db.all(`
      SELECT 
        strftime('%Y-%m', signing_date) as month,
        COUNT(*) as count
      FROM executive_orders
      WHERE signing_date IS NOT NULL
      GROUP BY month
      ORDER BY month
    `);
    
    // Combine all stats
    const stats = {
      impactLevels,
      universityImpactAreas,
      yaleImpactAreas,
      categories,
      timeline
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
    const orderCount = (await db.get('SELECT COUNT(*) as count FROM executive_orders')).count;
    
    const systemInfo = {
      topicName: 'Yale University Executive Order Analysis',
      topicDescription: 'Analysis of executive orders and their impact on Yale University',
      orderCount: orderCount,
      version: '2.0.0', // Yale-specific focus version
      lastUpdated: new Date().toISOString(),
      isStaticVersion: true,
      notes: 'Streamlined version focused exclusively on Yale University organizational structure and impact areas',
      primaryFocus: 'Yale University',
      yaleDepartments: await db.all('SELECT * FROM yale_departments ORDER BY name')
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
    // Get Yale-specific impact areas if available
    let yaleImpactAreas = [];
    try {
      yaleImpactAreas = await db.all(`
        SELECT y.*, u.name as related_r1_area_name 
        FROM yale_impact_areas y
        LEFT JOIN university_impact_areas u ON y.related_r1_area_id = u.id
        ORDER BY y.id
      `);
    } catch (err) {
      console.log('Yale impact areas not available for metadata export');
    }
    
    // Get Yale stakeholders if available
    let yaleStakeholders = [];
    try {
      yaleStakeholders = await db.all('SELECT * FROM yale_stakeholders ORDER BY name');
    } catch (err) {
      console.log('Yale stakeholders not available for metadata export');
    }
    
    const metadata = {
      categories,
      impactAreas,
      universityImpactAreas,
      yaleImpactAreas,
      yaleStakeholders,
      applicationVersion: '2.0.0',
      primaryFocus: 'Yale University',
      featuredInstitutionTypes: ['Yale University'],
      yaleSpecificFocus: true,
      yaleFocusVersion: '2.0.0'
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
    await db.connect();
    await ensureOutputDir();
    
    // Export all data
    const categories = await exportCategories();
    const impactAreas = await exportImpactAreas();
    const universityImpactAreas = await exportUniversityImpactAreas();
    
    // Export Yale-specific data
    const yaleImpactAreas = await exportYaleImpactAreas();
    const yaleStakeholders = await exportYaleStakeholders();
    
    // Update metadata to include Yale-specific information
    await exportMetadata(categories, impactAreas, universityImpactAreas);
    
    await exportExecutiveOrders();
    await exportStatistics();
    await exportSystemInfo();
    
    console.log('All data successfully exported to JSON files with Yale-specific context.');
  } catch (err) {
    console.error('Error exporting data:', err);
  } finally {
    await db.close();
  }
}

// Run the export
if (require.main === module) {
  exportAll().catch(err => {
    console.error('Export failed:', err);
    process.exit(1);
  });
}

module.exports = { exportAll };