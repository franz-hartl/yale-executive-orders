/**
 * export_to_json.js
 * 
 * This script exports data from the SQLite database to JSON files for use in a static GitHub Pages site.
 * Enhanced version with integrated source data for Phase 5 implementation.
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

// Generate institution-specific guidance based on multiple sources
function generateInstitutionGuidance(order, sources, differentiatedImpacts) {
  const institutionTypes = Object.keys(differentiatedImpacts || {});
  const guidance = {};
  
  // If no differentiated impacts, return empty guidance
  if (institutionTypes.length === 0) return guidance;
  
  institutionTypes.forEach(instType => {
    // Initialize guidance object for this institution type
    guidance[instType] = {
      relevance_score: calculateRelevanceScore(order, instType, differentiatedImpacts),
      action_items: [],
      exemptions: [],
      source_considerations: {}
    };
    
    // Add source-specific guidance
    sources.forEach(source => {
      if (!source.specificData) return;
      
      const sourceData = source.specificData;
      const sourceAbbrev = getSourceAbbreviation(source.source_name);
      
      // Extract guidance from source data
      let sourceGuidance = [];
      
      if (sourceData.implementation_references) {
        sourceData.implementation_references.forEach(ref => {
          if (ref.institution_specific_guidance && ref.institution_specific_guidance[instType]) {
            sourceGuidance.push({
              title: ref.title || 'Implementation Reference',
              guidance: ref.institution_specific_guidance[instType],
              url: ref.url || null
            });
          }
          
          // Check for exemptions
          if (ref.exemptions && ref.exemptions.includes(instType)) {
            guidance[instType].exemptions.push({
              source: sourceAbbrev,
              description: `Exemption noted in ${ref.title || 'implementation reference'}`
            });
          }
          
          // Check for action items
          if (ref.action_items) {
            ref.action_items.forEach(item => {
              if (!item.institution_type || item.institution_type === instType) {
                guidance[instType].action_items.push({
                  title: item.title,
                  description: item.description,
                  deadline: item.deadline || null,
                  source: sourceAbbrev
                });
              }
            });
          }
        });
      }
      
      // Add this source's considerations
      if (sourceGuidance.length > 0) {
        guidance[instType].source_considerations[sourceAbbrev] = sourceGuidance;
      }
    });
    
    // De-duplicate action items
    guidance[instType].action_items = deduplicateActionItems(guidance[instType].action_items);
  });
  
  return guidance;
}

// Calculate relevance score for an institution type
function calculateRelevanceScore(order, instType, differentiatedImpacts) {
  let score = 0;
  
  // Consider impact level
  const impactLevel = order.impact_level;
  if (impactLevel === 'Critical') score += 5;
  else if (impactLevel === 'High') score += 4;
  else if (impactLevel === 'Medium') score += 3;
  else if (impactLevel === 'Low') score += 2;
  else score += 1;
  
  // Consider differentiated impacts
  const impacts = differentiatedImpacts[instType] || {};
  const impactScores = Object.values(impacts).map(i => i.score || 0);
  
  if (impactScores.length > 0) {
    const avgImpactScore = impactScores.reduce((sum, score) => sum + score, 0) / impactScores.length;
    score += avgImpactScore;
  }
  
  // Normalize to 1-10 scale
  score = Math.min(10, Math.max(1, Math.round(score)));
  
  return score;
}

// Remove duplicate action items
function deduplicateActionItems(actionItems) {
  const uniqueItems = [];
  const titleMap = new Map();
  
  actionItems.forEach(item => {
    const key = item.title.toLowerCase();
    if (!titleMap.has(key)) {
      titleMap.set(key, item);
      uniqueItems.push(item);
    } else {
      // If we have a duplicate, merge the sources
      const existing = titleMap.get(key);
      if (existing.source !== item.source) {
        existing.source = `${existing.source}, ${item.source}`;
      }
    }
  });
  
  return uniqueItems;
}

// Generate integrated source-aware impact analysis
function generateSourceAwareImpactAnalysis(order, sources, universityImpactAreas) {
  const impactAnalysis = {};
  
  // Initialize with primary university impact areas
  universityImpactAreas.forEach(area => {
    impactAnalysis[area.name] = {
      description: area.description,
      notes: area.notes || null,
      source_insights: {},
      consensus_rating: 'Neutral',
      perspectives: []
    };
  });
  
  // Add source-specific insights
  sources.forEach(source => {
    if (!source.specificData) return;
    
    const sourceData = source.specificData;
    const sourceAbbrev = getSourceAbbreviation(source.source_name);
    
    // Process impact areas from this source
    if (sourceData.implementation_references) {
      sourceData.implementation_references.forEach(ref => {
        if (ref.impact_areas) {
          Object.keys(ref.impact_areas).forEach(areaName => {
            if (!impactAnalysis[areaName]) {
              // If this is a new impact area not in our primary list, add it
              impactAnalysis[areaName] = {
                description: null,
                notes: null,
                source_insights: {},
                consensus_rating: 'Neutral',
                perspectives: []
              };
            }
            
            // Add this source's perspective
            impactAnalysis[areaName].source_insights[sourceAbbrev] = {
              impact: ref.impact_areas[areaName].impact || 'Neutral',
              description: ref.impact_areas[areaName].description || null,
              url: ref.url || null
            };
            
            // Add to perspectives list
            impactAnalysis[areaName].perspectives.push({
              source: sourceAbbrev,
              impact: ref.impact_areas[areaName].impact || 'Neutral',
              insight: ref.impact_areas[areaName].description || null
            });
          });
        }
      });
    }
  });
  
  // Calculate consensus ratings
  Object.keys(impactAnalysis).forEach(areaName => {
    const perspectives = impactAnalysis[areaName].perspectives;
    
    if (perspectives.length > 0) {
      // Calculate consensus
      const impactRatings = {
        'Positive': 0,
        'Negative': 0,
        'Neutral': 0,
        'Mixed': 0
      };
      
      perspectives.forEach(p => {
        if (impactRatings[p.impact] !== undefined) {
          impactRatings[p.impact]++;
        } else {
          impactRatings['Neutral']++;
        }
      });
      
      // Determine consensus
      let maxRating = 'Neutral';
      let maxCount = 0;
      
      Object.keys(impactRatings).forEach(rating => {
        if (impactRatings[rating] > maxCount) {
          maxCount = impactRatings[rating];
          maxRating = rating;
        }
      });
      
      impactAnalysis[areaName].consensus_rating = maxRating;
    }
  });
  
  return impactAnalysis;
}

// Generate combined analysis section from multiple sources
function generateCombinedAnalysis(order, sources) {
  // Base analysis from the order itself
  let combinedAnalysis = {
    summary: order.summary || "",
    extended_analysis: order.comprehensive_analysis || "",
    source_contributions: {},
    key_perspectives: []
  };
  
  // Add source-specific analyses
  sources.forEach(source => {
    if (!source.specificData) return;
    
    const sourceData = source.specificData;
    const sourceAbbrev = getSourceAbbreviation(source.source_name);
    
    let sourceAnalysis = null;
    let sourceURL = null;
    
    // Extract analysis from implementation references
    if (sourceData.implementation_references && sourceData.implementation_references.length > 0) {
      const mainRef = sourceData.implementation_references[0]; // Use the first reference as primary
      sourceAnalysis = mainRef.analysis || mainRef.context || null;
      sourceURL = mainRef.url || null;
    }
    
    // If we have analysis from this source, add it
    if (sourceAnalysis) {
      combinedAnalysis.source_contributions[sourceAbbrev] = {
        text: sourceAnalysis,
        url: sourceURL
      };
      
      // Add to key perspectives if substantive
      if (sourceAnalysis.length > 100) {
        combinedAnalysis.key_perspectives.push({
          source: sourceAbbrev,
          summary: sourceAnalysis.substring(0, 150) + "...",
          full_text: sourceAnalysis,
          url: sourceURL
        });
      }
    }
  });
  
  return combinedAnalysis;
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
      
      // Parse source_specific_data for each source
      const sourcesWithParsedData = sources.map(source => {
        let specificData = null;
        try {
          if (source.source_specific_data) {
            specificData = JSON.parse(source.source_specific_data);
          }
        } catch (e) {
          console.log(`Error parsing source data for order ${order.id}: ${e.message}`);
        }
        
        return {
          ...source,
          specificData
        };
      });
      
      // Format sources with normalized attribution
      const normalizedSources = normalizeSourceAttribution(sourcesWithParsedData);
      
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
      
      // Generate enhanced source-integrated data
      const institutionGuidance = generateInstitutionGuidance(order, sourcesWithParsedData, formattedImpacts);
      const sourceAwareImpactAnalysis = generateSourceAwareImpactAnalysis(order, sourcesWithParsedData, universityImpactAreas);
      const combinedAnalysis = generateCombinedAnalysis(order, sourcesWithParsedData);
      
      // Return enriched order with enhanced source integration
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
        // Enhanced source integration fields
        sources: normalizedSources,
        institution_specific_guidance: institutionGuidance,
        source_aware_impact_analysis: sourceAwareImpactAnalysis,
        integrated_analysis: combinedAnalysis
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
    
    // Enhanced external source stats
    const sourcesStats = await dbAll(`
      SELECT 
        sm.source_name as name,
        sm.source_url as url,
        COUNT(DISTINCT os.order_id) as order_count,
        MAX(os.fetch_date) as last_fetch_date
      FROM source_metadata sm
      LEFT JOIN order_sources os ON sm.id = os.source_id
      GROUP BY sm.id
      ORDER BY order_count DESC
    `);
    
    // Additional stats for source integration
    const sourceIntegrationStats = await dbAll(`
      SELECT
        COUNT(DISTINCT os.order_id) as orders_with_external_sources,
        COUNT(DISTINCT sm.id) as active_source_count,
        MAX(os.fetch_date) as latest_source_update
      FROM order_sources os
      JOIN source_metadata sm ON os.source_id = sm.id
    `);
    
    // Combine all stats
    const stats = {
      impactLevels,
      universityImpactAreas,
      categories,
      timeline,
      externalSources: sourcesStats,
      sourceIntegration: sourceIntegrationStats[0]
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
    
    // Get enhanced source information
    const sources = await dbAll(`
      SELECT 
        sm.source_name,
        sm.source_url,
        sm.description,
        sm.last_updated,
        sm.fetch_frequency,
        COUNT(DISTINCT os.order_id) as order_count,
        MAX(os.fetch_date) as last_fetch_date
      FROM source_metadata sm
      LEFT JOIN order_sources os ON sm.id = os.source_id
      GROUP BY sm.id
      ORDER BY sm.source_name
    `);
    
    const systemInfo = {
      topicName: 'Higher Education Executive Order Analysis',
      topicDescription: 'Analysis of executive orders and their impact on higher education institutions nationwide',
      orderCount: orderCount,
      version: '1.2.0', // Increment version for the enhanced JSON export
      lastUpdated: new Date().toISOString(),
      isStaticVersion: true,
      notes: 'Enhanced static export with integrated source data analysis and institution-specific guidance',
      externalSources: sources.map(source => ({
        name: source.source_name,
        abbreviation: getSourceAbbreviation(source.source_name),
        url: source.source_url,
        description: source.description,
        lastUpdated: source.last_updated,
        fetchFrequency: source.fetch_frequency,
        lastFetch: source.last_fetch_date,
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
    // Get enhanced source metadata
    const sources = await dbAll(`
      SELECT 
        sm.*,
        COUNT(DISTINCT os.order_id) as order_count,
        MAX(os.fetch_date) as last_fetch_date
      FROM source_metadata sm
      LEFT JOIN order_sources os ON sm.id = os.source_id
      GROUP BY sm.id
      ORDER BY sm.source_name
    `);
    
    // Format source metadata
    const formattedSources = sources.map(source => ({
      id: source.id,
      name: source.source_name,
      abbreviation: getSourceAbbreviation(source.source_name),
      url: source.source_url,
      description: source.description,
      last_updated: source.last_updated,
      fetch_frequency: source.fetch_frequency,
      order_count: source.order_count,
      last_fetch: source.last_fetch_date
    }));
    
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
      externalSources: formattedSources,
      institutionTypes,
      functionalAreas,
      sourceIntegrationVersion: '1.2.0',
      sourceIntegrationFeatures: [
        'Normalized Source Attribution',
        'Combined Analysis Section',
        'Institution-Specific Guidance',
        'Source-Attributed Impact Areas'
      ]
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
    
    console.log('All data successfully exported to JSON files with enhanced source integration.');
  } catch (err) {
    console.error('Error exporting data:', err);
  } finally {
    db.close();
  }
}

// Run the export
exportAll();