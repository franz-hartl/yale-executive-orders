/**
 * simplified_source_integration.js
 * 
 * This script implements a simplified version of the source integration process,
 * removing unnecessary institution-type differentiation while preserving
 * core value from external sources.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

// Database file path
const dbPath = path.join(__dirname, 'executive_orders.db');

/**
 * Simplified function to normalize source attribution without institution-specific variations
 */
function normalizeSourceAttribution(sources) {
  return sources.map(source => ({
    name: source.source_name,
    abbreviation: getSourceAbbreviation(source.source_name),
    url: source.source_url,
    reference_id: source.external_reference_id,
    fetch_date: source.fetch_date,
    metadata: source.specificData || null
  }));
}

/**
 * Get abbreviation for a source name (unchanged)
 */
function getSourceAbbreviation(sourceName) {
  const abbreviations = {
    'COGR Executive Order Tracker': 'COGR',
    'NSF Implementation Pages': 'NSF',
    'NIH Policy Notices': 'NIH',
    'ACE Policy Briefs': 'ACE'
  };
  
  return abbreviations[sourceName] || sourceName.split(' ').map(word => word[0]).join('');
}

/**
 * Simplified function to generate source insights without institution-specific guidance
 */
async function generateSimplifiedSourceInsights(order, sources) {
  // Basic structure for source insights
  const insights = {
    summary: {
      title: `Source Insights for ${order.order_number}`,
      description: "Combined analysis from authoritative sources",
      source_count: sources.length,
      has_implementation_details: false
    },
    sources: [],
    key_takeaways: [],
    implementation_references: [],
    resource_links: []
  };
  
  // Process each source
  for (const source of sources) {
    if (!source.specificData) continue;
    
    const sourceData = source.specificData;
    const sourceAbbrev = getSourceAbbreviation(source.source_name);
    
    // Add basic source info
    const sourceInfo = {
      name: source.source_name,
      abbreviation: sourceAbbrev,
      url: source.source_url,
      fetch_date: source.fetch_date,
      has_detailed_implementation: false
    };
    
    // Extract implementation references if available
    if (sourceData.implementation_references && sourceData.implementation_references.length > 0) {
      sourceInfo.has_detailed_implementation = true;
      insights.has_implementation_details = true;
      
      // Process implementation references without institution differentiation
      for (const ref of sourceData.implementation_references) {
        // Add to implementation references
        insights.implementation_references.push({
          title: ref.title || `${sourceAbbrev} Implementation Reference`,
          url: ref.url || null,
          source: sourceAbbrev,
          date: ref.date || ref.deadline_date || null,
          description: ref.context || ref.description || null
        });
        
        // Add any resource links
        if (ref.url) {
          insights.resource_links.push({
            title: ref.title || `${sourceAbbrev} Resource`,
            url: ref.url,
            source: sourceAbbrev
          });
        }
        
        // Extract key takeaways from content
        if (ref.context || ref.description) {
          insights.key_takeaways.push({
            source: sourceAbbrev,
            content: ref.context || ref.description,
            url: ref.url || null
          });
        }
      }
    }
    
    insights.sources.push(sourceInfo);
  }
  
  // Deduplicate resource links and takeaways
  insights.resource_links = deduplicateByTitle(insights.resource_links);
  insights.key_takeaways = deduplicateByContent(insights.key_takeaways);
  
  return insights;
}

/**
 * Simplified function to generate combined analysis without institution differentiation
 */
function generateSimplifiedAnalysis(order, sources) {
  // Base analysis from the order itself
  let analysis = {
    summary: order.summary || "",
    extended_analysis: order.comprehensive_analysis || "",
    source_insights: [],
    key_perspectives: []
  };
  
  // Add source-specific analyses without institution focus
  sources.forEach(source => {
    if (!source.specificData) return;
    
    const sourceData = source.specificData;
    const sourceAbbrev = getSourceAbbreviation(source.source_name);
    
    let sourceAnalysis = null;
    let sourceURL = null;
    
    // Extract analysis from implementation references
    if (sourceData.implementation_references && sourceData.implementation_references.length > 0) {
      const mainRef = sourceData.implementation_references[0]; 
      sourceAnalysis = mainRef.analysis || mainRef.context || null;
      sourceURL = mainRef.url || null;
    }
    
    // If we have analysis from this source, add it
    if (sourceAnalysis) {
      analysis.source_insights.push({
        source: sourceAbbrev,
        text: sourceAnalysis,
        url: sourceURL
      });
      
      // Add to key perspectives if substantive
      if (sourceAnalysis.length > 100) {
        analysis.key_perspectives.push({
          source: sourceAbbrev,
          summary: sourceAnalysis.substring(0, 150) + "...",
          full_text: sourceAnalysis,
          url: sourceURL
        });
      }
    }
  });
  
  return analysis;
}

/**
 * Simplified function to process impact areas from multiple sources
 */
function generateSimplifiedImpactAreas(order, sources, universityImpactAreas) {
  const impactAreaMap = {};
  
  // Initialize with university impact areas
  universityImpactAreas.forEach(area => {
    impactAreaMap[area.name] = {
      name: area.name,
      description: area.description,
      source_insights: [],
      yale_relevant: false
    };
  });
  
  // Add source-specific insights for impact areas
  sources.forEach(source => {
    if (!source.specificData) return;
    
    const sourceData = source.specificData;
    const sourceAbbrev = getSourceAbbreviation(source.source_name);
    
    // Process impact areas from sources
    if (sourceData.implementation_references) {
      sourceData.implementation_references.forEach(ref => {
        if (ref.impact_areas) {
          Object.keys(ref.impact_areas).forEach(areaName => {
            // Create area if it doesn't exist
            if (!impactAreaMap[areaName]) {
              impactAreaMap[areaName] = {
                name: areaName,
                description: null,
                source_insights: [],
                yale_relevant: false
              };
            }
            
            // Add source insight
            impactAreaMap[areaName].source_insights.push({
              source: sourceAbbrev,
              impact: ref.impact_areas[areaName].impact || 'Neutral',
              description: ref.impact_areas[areaName].description || null,
              url: ref.url || null
            });
          });
        }
      });
    }
  });
  
  // Convert map to array
  return Object.values(impactAreaMap);
}

/**
 * Helper function to deduplicate items by title
 */
function deduplicateByTitle(items) {
  const uniqueItems = [];
  const seenTitles = new Set();
  
  for (const item of items) {
    const normalizedTitle = item.title.toLowerCase();
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      uniqueItems.push(item);
    }
  }
  
  return uniqueItems;
}

/**
 * Helper function to deduplicate items by content
 */
function deduplicateByContent(items) {
  const uniqueItems = [];
  const seenContent = new Set();
  
  for (const item of items) {
    // Use first 50 chars as fingerprint
    const contentFingerprint = item.content.substring(0, 50).toLowerCase();
    if (!seenContent.has(contentFingerprint)) {
      seenContent.add(contentFingerprint);
      uniqueItems.push(item);
    }
  }
  
  return uniqueItems;
}

/**
 * Main function to export orders with simplified source integration
 */
async function exportOrdersWithSimplifiedSources(outputDir) {
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
  
  // Promisify database queries
  const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };
  
  try {
    // Get all executive orders
    const orders = await dbAll(`
      SELECT eo.*
      FROM executive_orders eo
      ORDER BY signing_date DESC
    `);
    
    // For each order, get categories, impact areas, and source data
    const fullOrders = await Promise.all(orders.map(async (order) => {
      // Get categories
      const categories = await dbAll(`
        SELECT c.id, c.name
        FROM categories c
        JOIN order_categories oc ON c.id = oc.category_id
        WHERE oc.order_id = ?
      `, [order.id]);
      
      // Get impact areas
      const impactAreas = await dbAll(`
        SELECT ia.id, ia.name
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
      
      // Get Yale impact areas
      let yaleImpactAreas = [];
      try {
        yaleImpactAreas = await dbAll(`
          SELECT yia.id, yia.name, yia.description, oyia.yale_specific_notes, oyia.yale_impact_rating
          FROM yale_impact_areas yia
          JOIN order_yale_impact_areas oyia ON yia.id = oyia.yale_impact_area_id
          WHERE oyia.order_id = ?
        `, [order.id]);
      } catch (err) {
        // Yale impact areas might not exist yet - handle gracefully
      }
      
      // Get external sources data
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
      
      // Check which summary types exist
      const hasPlainSummary = order.plain_language_summary && order.plain_language_summary.trim() !== '';
      const hasExecutiveBrief = order.executive_brief && order.executive_brief.trim() !== '';
      const hasComprehensiveAnalysis = order.comprehensive_analysis && order.comprehensive_analysis.trim() !== '';
      
      // Get Yale department specific data
      let yaleDepartmentData = [];
      try {
        yaleDepartmentData = await dbAll(`
          SELECT yd.id, yd.name, yd.description, yim.impact_score, yim.priority_level,
                 yim.impact_description, yim.action_required
          FROM yale_departments yd
          JOIN yale_impact_mapping yim ON yd.id = yim.yale_department_id
          WHERE yim.order_id = ?
          ORDER BY yim.impact_score DESC
        `, [order.id]);
      } catch (err) {
        // Yale department mapping might not exist yet - handle gracefully
      }
      
      // Generate simplified source integration data
      const normalizedSources = normalizeSourceAttribution(sourcesWithParsedData);
      const simplifiedSourceInsights = await generateSimplifiedSourceInsights(order, sourcesWithParsedData);
      const simplifiedAnalysis = generateSimplifiedAnalysis(order, sourcesWithParsedData);
      const simplifiedImpactAreas = generateSimplifiedImpactAreas(order, sourcesWithParsedData, universityImpactAreas);
      
      // Return enriched order with simplified source integration
      return {
        ...order,
        categories: categories.map(c => c.name),
        impact_areas: impactAreas.map(ia => ia.name),
        university_impact_areas: universityImpactAreas.map(uia => ({
          name: uia.name,
          description: uia.description,
          notes: uia.notes
        })),
        yale_impact_areas: yaleImpactAreas,
        yale_departments: yaleDepartmentData,
        has_plain_language_summary: hasPlainSummary,
        has_executive_brief: hasExecutiveBrief,
        has_comprehensive_analysis: hasComprehensiveAnalysis,
        summary_formats_available: [
          ...(hasExecutiveBrief ? ['executive_brief'] : []),
          ...(hasPlainSummary ? ['standard'] : []),
          ...(hasComprehensiveAnalysis ? ['comprehensive'] : [])
        ],
        // Simplified source integration fields
        sources: normalizedSources,
        source_insights: simplifiedSourceInsights,
        source_analysis: simplifiedAnalysis,
        simplified_impact_areas: simplifiedImpactAreas,
        yale_relevant: yaleImpactAreas.length > 0 || yaleDepartmentData.length > 0
      };
    }));
    
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    // Write complete orders to file
    const outputPath = path.join(outputDir, 'executive_orders.json');
    await fs.writeFile(outputPath, JSON.stringify(fullOrders, null, 2));
    console.log(`Exported ${fullOrders.length} executive orders with simplified source integration to ${outputPath}`);
    
    // Also export source metadata
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
    
    const sourceOutputPath = path.join(outputDir, 'sources.json');
    await fs.writeFile(sourceOutputPath, JSON.stringify(sources, null, 2));
    console.log(`Exported source metadata to ${sourceOutputPath}`);
    
    return fullOrders;
  } catch (err) {
    console.error('Error exporting orders with simplified sources:', err);
    throw err;
  } finally {
    db.close();
  }
}

module.exports = {
  normalizeSourceAttribution,
  generateSimplifiedSourceInsights,
  generateSimplifiedAnalysis,
  generateSimplifiedImpactAreas,
  exportOrdersWithSimplifiedSources
};