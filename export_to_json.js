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

// Export Yale-specific impact areas
async function exportYaleImpactAreas() {
  try {
    const query = `
      SELECT y.*, u.name as related_r1_area_name 
      FROM yale_impact_areas y
      LEFT JOIN university_impact_areas u ON y.related_r1_area_id = u.id
      ORDER BY y.id
    `;
    const yaleImpactAreas = await dbAll(query);
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
    const yaleStakeholders = await dbAll('SELECT * FROM yale_stakeholders ORDER BY name');
    
    // Convert array fields from JSON string
    yaleStakeholders.forEach(stakeholder => {
      if (stakeholder.relevant_impact_areas) {
        try {
          stakeholder.relevant_impact_areas = JSON.parse(stakeholder.relevant_impact_areas);
        } catch (e) {
          stakeholder.relevant_impact_areas = [];
        }
      }
    });
    
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

// Export Yale impact mappings for executive orders
async function exportYaleOrderMappings() {
  try {
    // Yale impact mappings for executive orders
    const yaleOrderImpacts = await dbAll(`
      SELECT oia.order_id, oia.yale_impact_area_id, oia.yale_specific_notes, oia.yale_impact_rating,
             ya.name as area_name, ya.description as area_description
      FROM order_yale_impact_areas oia
      JOIN yale_impact_areas ya ON oia.yale_impact_area_id = ya.id
    `);
    
    // Group by order ID
    const yaleOrderImpactsByOrder = {};
    yaleOrderImpacts.forEach(impact => {
      if (!yaleOrderImpactsByOrder[impact.order_id]) {
        yaleOrderImpactsByOrder[impact.order_id] = [];
      }
      yaleOrderImpactsByOrder[impact.order_id].push({
        id: impact.yale_impact_area_id,
        name: impact.area_name,
        description: impact.area_description,
        specific_notes: impact.yale_specific_notes,
        impact_rating: impact.yale_impact_rating
      });
    });
    
    // Yale stakeholder mappings for executive orders
    const yaleOrderStakeholders = await dbAll(`
      SELECT os.order_id, os.yale_stakeholder_id, os.priority_level, os.action_required,
             os.stakeholder_notes, ys.name as stakeholder_name, ys.description as stakeholder_description
      FROM order_yale_stakeholders os
      JOIN yale_stakeholders ys ON os.yale_stakeholder_id = ys.id
    `);
    
    // Group by order ID
    const yaleOrderStakeholdersByOrder = {};
    yaleOrderStakeholders.forEach(stakeholder => {
      if (!yaleOrderStakeholdersByOrder[stakeholder.order_id]) {
        yaleOrderStakeholdersByOrder[stakeholder.order_id] = [];
      }
      yaleOrderStakeholdersByOrder[stakeholder.order_id].push({
        id: stakeholder.yale_stakeholder_id,
        name: stakeholder.stakeholder_name,
        description: stakeholder.stakeholder_description,
        priority: stakeholder.priority_level,
        action_required: !!stakeholder.action_required,
        notes: stakeholder.stakeholder_notes
      });
    });
    
    return {
      yaleOrderImpactsByOrder,
      yaleOrderStakeholdersByOrder
    };
  } catch (err) {
    console.error('Error exporting Yale order mappings:', err);
    // If the tables don't exist yet, this is non-fatal
    if (err.message.includes('no such table')) {
      console.log('Yale order mapping tables not available yet - skipping export');
      return {
        yaleOrderImpactsByOrder: {},
        yaleOrderStakeholdersByOrder: {}
      };
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

// Generate simplified Yale-specific guidance based on multiple sources
async function generateYaleGuidance(order, sources) {
  try {
    // Get all Yale departments
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
    const departments = await dbAll.call(db, 'SELECT * FROM yale_departments ORDER BY name');
    
    // Get all Yale impact areas with mapping to departments
    const yaleImpactAreas = await dbAll.call(
      db, 
      `SELECT * FROM yale_impact_areas WHERE id IN 
       (SELECT yale_impact_area_id FROM order_yale_impact_areas WHERE order_id = ?)`,
      [order.id]
    );
    
    // Get Yale compliance actions
    const complianceActions = await dbAll.call(
      db,
      `SELECT * FROM yale_compliance_actions WHERE order_id = ? ORDER BY deadline`,
      [order.id]
    );
    
    // Get Yale impact mapping
    const impactMapping = await dbAll.call(
      db,
      `SELECT * FROM yale_impact_mapping WHERE order_id = ? ORDER BY impact_score DESC`,
      [order.id]
    );
    
    // Create simplified source insights
    const sourceInsights = {
      key_takeaways: [],
      implementation_references: [],
      resource_links: []
    };
    
    // Process sources to extract valuable information without institution variations
    for (const source of sources) {
      if (!source.specificData) continue;
      
      const sourceData = source.specificData;
      const sourceAbbrev = getSourceAbbreviation(source.source_name);
      
      // Extract implementation references if available
      if (sourceData.implementation_references) {
        sourceData.implementation_references.forEach(ref => {
          // Add to implementation references
          sourceInsights.implementation_references.push({
            title: ref.title || `${sourceAbbrev} Implementation Reference`,
            url: ref.url || null,
            source: sourceAbbrev,
            date: ref.date || ref.deadline_date || null,
            description: ref.context || ref.description || null
          });
          
          // Add any resource links
          if (ref.url) {
            sourceInsights.resource_links.push({
              title: ref.title || `${sourceAbbrev} Resource`,
              url: ref.url,
              source: sourceAbbrev
            });
          }
          
          // Extract key takeaways
          if (ref.context || ref.description) {
            sourceInsights.key_takeaways.push({
              source: sourceAbbrev,
              content: ref.context || ref.description,
              url: ref.url || null
            });
          }
        });
      }
    }
    
    // Structure for Yale-specific guidance
    const guidance = {
      yale_university: {
        relevance_score: calculateYaleRelevanceScore(order, impactMapping),
        affected_departments: [],
        primary_departments: [],
        secondary_departments: [],
        action_items: [],
        compliance_actions: complianceActions,
        impact_areas: yaleImpactAreas,
        source_insights: sourceInsights
      }
    };
    
    // Determine affected departments based on impact mapping
    if (impactMapping.length > 0) {
      // Map department IDs to names and add to affected departments
      for (const mapping of impactMapping) {
        const dept = departments.find(d => d.id === mapping.yale_department_id);
        if (dept) {
          // Add to appropriate list based on priority
          if (mapping.priority_level === 'High' || mapping.impact_score >= 7) {
            guidance.yale_university.primary_departments.push({
              id: dept.id,
              name: dept.name,
              impact_score: mapping.impact_score,
              description: dept.description,
              impact_description: mapping.impact_description,
              action_required: mapping.action_required === 1
            });
          } else {
            guidance.yale_university.secondary_departments.push({
              id: dept.id,
              name: dept.name,
              impact_score: mapping.impact_score,
              description: dept.description,
              impact_description: mapping.impact_description,
              action_required: mapping.action_required === 1
            });
          }
          
          // Add to complete list of affected departments
          guidance.yale_university.affected_departments.push(dept.name);
        }
      }
    } else {
      // If no impact mapping exists yet, use impact areas to determine likely affected departments
      for (const area of yaleImpactAreas) {
        if (area.primary_yale_department_id) {
          const dept = departments.find(d => d.id === area.primary_yale_department_id);
          if (dept && !guidance.yale_university.affected_departments.includes(dept.name)) {
            guidance.yale_university.affected_departments.push(dept.name);
            guidance.yale_university.primary_departments.push({
              id: dept.id,
              name: dept.name,
              description: dept.description,
              impact_description: `Primary department for ${area.name}`,
              action_required: true
            });
          }
        }
      }
    }
    
    // Process compliance actions to create action items
    guidance.yale_university.action_items = complianceActions.map(action => ({
      title: action.title,
      description: action.description,
      deadline: action.deadline,
      department: departments.find(d => d.id === action.yale_department_id)?.name || 'Yale University',
      required: action.required === 1,
      resource_requirement: action.resource_requirement,
      complexity_level: action.complexity_level
    }));
    
    return guidance;
  } catch (err) {
    console.error('Error generating Yale guidance:', err);
    return { yale_university: { relevance_score: 5, affected_departments: [], action_items: [] } };
  }
}

// Calculate relevance score specifically for Yale
function calculateYaleRelevanceScore(order, impactMapping) {
  let score = 0;
  
  // Consider impact level
  const impactLevel = order.impact_level;
  if (impactLevel === 'Critical') score += 5;
  else if (impactLevel === 'High') score += 4;
  else if (impactLevel === 'Medium') score += 3;
  else if (impactLevel === 'Low') score += 2;
  else score += 1;
  
  // Consider Yale-specific impact mapping
  if (impactMapping && impactMapping.length > 0) {
    const impactScores = impactMapping.map(m => m.impact_score || 0);
    const avgImpactScore = impactScores.reduce((sum, score) => sum + score, 0) / impactScores.length;
    score += (avgImpactScore / 2); // Weight it so it doesn't overwhelm the base score
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

// Generate simplified source-aware impact analysis
function generateSourceAwareImpactAnalysis(order, sources, universityImpactAreas) {
  const impactAnalysis = {};
  
  // First initialize all university impact areas
  universityImpactAreas.forEach(area => {
    impactAnalysis[area.name] = {
      description: area.description,
      notes: area.notes || null,
      source_insights: [],
      consensus_rating: 'Neutral'
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
              // If this is a new impact area not in our list, add it
              impactAnalysis[areaName] = {
                description: null,
                notes: null,
                source_insights: [],
                consensus_rating: 'Neutral'
              };
            }
            
            // Add this source's insight
            impactAnalysis[areaName].source_insights.push({
              source: sourceAbbrev,
              name: source.source_name,
              impact: ref.impact_areas[areaName].impact || 'Neutral',
              description: ref.impact_areas[areaName].description || null,
              url: ref.url || null
            });
          });
        }
      });
    }
  });
  
  // Calculate simple consensus ratings
  Object.keys(impactAnalysis).forEach(areaName => {
    const insights = impactAnalysis[areaName].source_insights;
    
    if (insights.length > 0) {
      // Count impact ratings
      const impactCounts = { 'Positive': 0, 'Negative': 0, 'Neutral': 0, 'Mixed': 0 };
      
      insights.forEach(insight => {
        const impact = insight.impact || 'Neutral';
        impactCounts[impact] = (impactCounts[impact] || 0) + 1;
      });
      
      // Find most common rating
      let maxRating = 'Neutral';
      let maxCount = 0;
      
      Object.entries(impactCounts).forEach(([rating, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxRating = rating;
        }
      });
      
      impactAnalysis[areaName].consensus_rating = maxRating;
    }
  });
  
  return impactAnalysis;
}

// Generate simplified combined analysis section from multiple sources
function generateCombinedAnalysis(order, sources) {
  // Base analysis from the order itself
  let combinedAnalysis = {
    summary: order.summary || "",
    extended_analysis: order.comprehensive_analysis || "",
    source_insights: []
  };
  
  // Add source-specific analyses
  sources.forEach(source => {
    if (!source.specificData) return;
    
    const sourceData = source.specificData;
    const sourceAbbrev = getSourceAbbreviation(source.source_name);
    
    // Extract insights from implementation references
    if (sourceData.implementation_references && sourceData.implementation_references.length > 0) {
      sourceData.implementation_references.forEach(ref => {
        const analysis = ref.analysis || ref.context || null;
        if (analysis) {
          combinedAnalysis.source_insights.push({
            source: sourceAbbrev,
            name: source.source_name,
            title: ref.title || `${sourceAbbrev} Analysis`,
            text: analysis,
            url: ref.url || null
          });
        }
      });
    }
  });
  
  return combinedAnalysis;
}

// Export executive orders with all related data
async function exportExecutiveOrders(yaleOrderImpactsByOrder = {}, yaleOrderStakeholdersByOrder = {}) {
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
      
      // Get Yale impact areas from our mappings
      const yaleImpactAreas = yaleOrderImpactsByOrder[order.id] || [];
      
      // Get Yale stakeholders from our mappings
      const yaleStakeholders = yaleOrderStakeholdersByOrder[order.id] || [];
      
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
        SELECT impact_s.*, it.name as institution_type
        FROM impact_scoring impact_s
        JOIN institution_types it ON impact_s.institution_type_id = it.id
        WHERE impact_s.order_id = ?
        ORDER BY impact_s.composite_score DESC
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
      
      // Generate Yale-specific data
      const yaleGuidance = await generateYaleGuidance(order, sourcesWithParsedData);
      const sourceAwareImpactAnalysis = generateSourceAwareImpactAnalysis(order, sourcesWithParsedData, universityImpactAreas);
      const combinedAnalysis = generateCombinedAnalysis(order, sourcesWithParsedData);
      
      // Get timeline navigator data
      const timelineEvents = await dbAll(`
        SELECT * FROM timeline_navigator
        WHERE order_id = ?
        ORDER BY event_date
      `, [order.id]);
      
      // Get source intelligence data
      const sourceIntelligence = await dbAll(`
        SELECT * FROM source_intelligence
        WHERE order_id = ?
        ORDER BY publication_date DESC
      `, [order.id]);
      
      // Get agency guidance
      const agencyGuidance = await dbAll(`
        SELECT * FROM agency_guidance
        WHERE order_id = ?
        ORDER BY publication_date DESC
      `, [order.id]);
      
      // Get association analysis
      const associationAnalysis = await dbAll(`
        SELECT * FROM association_analysis
        WHERE order_id = ?
        ORDER BY publication_date DESC
      `, [order.id]);
      
      // Get legal analysis
      const legalAnalysis = await dbAll(`
        SELECT * FROM legal_analysis
        WHERE order_id = ?
        ORDER BY analysis_date DESC
      `, [order.id]);
      
      // Get Yale response framework
      const yaleResponseFramework = await dbAll(`
        SELECT yrf.*, yd.name as department_name
        FROM yale_response_framework yrf
        JOIN yale_departments yd ON yrf.yale_department_id = yd.id
        WHERE yrf.order_id = ?
      `, [order.id]);
      
      // Get action requirements
      const actionRequirements = await dbAll(`
        SELECT ar.*, yd.name as department_name
        FROM action_requirements ar
        LEFT JOIN yale_departments yd ON ar.yale_department_id = yd.id
        WHERE ar.order_id = ?
        ORDER BY ar.priority_level, ar.deadline
      `, [order.id]);
      
      // Get intelligence network (related orders)
      const intelligenceNetwork = await dbAll(`
        SELECT network.*, eo.order_number, eo.title
        FROM intelligence_network network
        JOIN executive_orders eo ON network.related_order_id = eo.id
        WHERE network.order_id = ?
      `, [order.id]);
      
      // Build intelligence hub specific data
      const intelligenceHub = {
        yale_alert_level: order.yale_alert_level || 'Moderate',
        core_impact: order.core_impact,
        what_changed: order.what_changed,
        yale_imperative: order.yale_imperative,
        confidence_rating: order.confidence_rating || 0.85,
        timeline_navigator: {
          signing_date: order.signing_date,
          effective_date: order.effective_date,
          implementation_deadlines: timelineEvents.filter(e => e.is_deadline),
          yale_decision_points: timelineEvents.filter(e => e.is_yale_decision_point),
          events: timelineEvents
        },
        source_intelligence: {
          federal_sources: {
            federal_register: sourceIntelligence.filter(s => s.source_type === 'Federal Register'),
            agency_guidance: agencyGuidance
          },
          analysis_interpretation: {
            university_associations: associationAnalysis,
            legal_analysis: legalAnalysis
          }
        },
        yale_response: {
          framework: yaleResponseFramework,
          action_requirements: actionRequirements,
          decision_support: {
            options: yaleResponseFramework.map(yrf => ({ 
              department: yrf.department_name,
              options: yrf.decision_options,
              strategy: yrf.implementation_strategy
            }))
          }
        },
        intelligence_network: {
          predecessor_policies: intelligenceNetwork.filter(n => n.relationship_type === 'Predecessor'),
          related_orders: intelligenceNetwork.filter(n => n.relationship_type === 'Related'),
          external_impact: intelligenceNetwork.filter(n => n.relationship_type === 'External')
        }
      };
      
      // Return enriched order with enhanced source integration and Intelligence Hub data
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
        yale_stakeholders: yaleStakeholders,
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
        // Simplified source integration
        sources: normalizedSources,
        yale_guidance: yaleGuidance,
        simplified_impact_analysis: sourceAwareImpactAnalysis,
        simplified_source_analysis: combinedAnalysis,
        // Intelligence Hub data
        intelligence_hub: intelligenceHub
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
    
    // Create a search index for faster matching
    const searchIndex = createSearchIndex(fullOrders);
    const searchIndexPath = path.join(outputDir, 'search_index.json');
    await fs.writeFile(searchIndexPath, JSON.stringify(searchIndex, null, 2));
    console.log(`Exported search index to ${searchIndexPath}`);
    
    return fullOrders;
  } catch (err) {
    console.error('Error exporting executive orders:', err);
    throw err;
  }
}

// Create a search index mapping terms to executive order IDs
function createSearchIndex(orders) {
  const termIndex = {};
  
  // Common stop words to filter out
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
  ]);
  
  // Process each order
  orders.forEach(order => {
    // Combine relevant text fields
    const textToIndex = `
      ${order.title || ''} 
      ${order.summary || ''} 
      ${(order.categories || []).join(' ')} 
      ${(order.impact_areas || []).join(' ')}
      ${(order.university_impact_areas || []).map(uia => uia.name || '').join(' ')}
    `.toLowerCase();
    
    // Extract words
    const words = textToIndex
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .split(/\s+/)              // Split on whitespace
      .filter(word => word.length > 2 && !stopWords.has(word)); // Filter out stop words and short words
    
    // Extract key phrases (bigrams)
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      if (!stopWords.has(words[i]) && !stopWords.has(words[i+1])) {
        phrases.push(`${words[i]} ${words[i+1]}`);
      }
    }
    
    // Add words to the term index
    const uniqueWords = new Set(words);
    uniqueWords.forEach(word => {
      if (!termIndex[word]) {
        termIndex[word] = [];
      }
      
      if (!termIndex[word].includes(order.id)) {
        termIndex[word].push(order.id);
      }
    });
    
    // Add phrases to the term index
    const uniquePhrases = new Set(phrases);
    uniquePhrases.forEach(phrase => {
      if (!termIndex[phrase]) {
        termIndex[phrase] = [];
      }
      
      if (!termIndex[phrase].includes(order.id)) {
        termIndex[phrase].push(order.id);
      }
    });
    
    // Add specific metadata as terms
    if (order.president) {
      const presidentTerm = `president:${order.president.toLowerCase()}`;
      if (!termIndex[presidentTerm]) {
        termIndex[presidentTerm] = [];
      }
      termIndex[presidentTerm].push(order.id);
    }
    
    if (order.impact_level) {
      const impactTerm = `impact:${order.impact_level.toLowerCase()}`;
      if (!termIndex[impactTerm]) {
        termIndex[impactTerm] = [];
      }
      termIndex[impactTerm].push(order.id);
    }
    
    // Add year-based terms
    if (order.signing_date) {
      const year = order.signing_date.substring(0, 4);
      const yearTerm = `year:${year}`;
      if (!termIndex[yearTerm]) {
        termIndex[yearTerm] = [];
      }
      termIndex[yearTerm].push(order.id);
    }
  });
  
  return termIndex;
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
    
    // Yale-specific impact area stats
    let yaleImpactAreas = [];
    try {
      yaleImpactAreas = await dbAll(`
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
    
    // Yale stakeholder stats
    let yaleStakeholders = [];
    try {
      yaleStakeholders = await dbAll(`
        SELECT ys.name, COUNT(*) as count
        FROM yale_stakeholders ys
        JOIN order_yale_stakeholders oys ON ys.id = oys.yale_stakeholder_id
        GROUP BY ys.name
        ORDER BY count DESC
      `);
    } catch (err) {
      // This is expected if we haven't populated the Yale data yet
      console.log('Yale stakeholder stats not available yet');
    }
    
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
      yaleImpactAreas,
      yaleStakeholders,
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
      topicName: 'Yale University Executive Order Analysis',
      topicDescription: 'Analysis of executive orders and their impact on Yale University',
      orderCount: orderCount,
      version: '2.0.0', // Yale-specific focus version
      lastUpdated: new Date().toISOString(),
      isStaticVersion: true,
      notes: 'Streamlined version focused exclusively on Yale University organizational structure and impact areas',
      primaryFocus: 'Yale University',
      yaleDepartments: await dbAll('SELECT * FROM yale_departments ORDER BY name'),
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
    
    // Get Yale-specific impact areas if available
    let yaleImpactAreas = [];
    try {
      yaleImpactAreas = await dbAll(`
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
      yaleStakeholders = await dbAll('SELECT * FROM yale_stakeholders ORDER BY name');
    } catch (err) {
      console.log('Yale stakeholders not available for metadata export');
    }
    
    const metadata = {
      categories,
      impactAreas,
      universityImpactAreas,
      yaleImpactAreas,
      yaleStakeholders,
      externalSources: formattedSources,
      institutionTypes,
      functionalAreas,
      applicationVersion: '2.0.0',
      primaryFocus: 'Yale University',
      featuredInstitutionTypes: ['Yale University'],
      sourceIntegrationVersion: '2.0.0',
      sourceIntegrationFeatures: [
        'Simplified Source Integration',
        'Yale Department Structure',
        'Yale-Specific Impact Areas',
        'Yale Department Mapping',
        'Yale Compliance Workflow'
      ],
      specializedFocusAreas: [
        'Research Funding & Security',
        'Advanced Research Programs', 
        'International Collaboration',
        'Endowment Management',
        'Graduate Education',
        'Arts & Cultural Heritage',
        'Medical & Clinical Operations',
        'Yale College Experience',
        'Athletics & Student Activities'
      ],
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
    await ensureOutputDir();
    
    // Export all data
    const categories = await exportCategories();
    const impactAreas = await exportImpactAreas();
    const universityImpactAreas = await exportUniversityImpactAreas();
    
    // Export Yale-specific data
    const yaleImpactAreas = await exportYaleImpactAreas();
    const yaleStakeholders = await exportYaleStakeholders();
    
    // Get Yale order mappings for enrichment
    const { yaleOrderImpactsByOrder, yaleOrderStakeholdersByOrder } = await exportYaleOrderMappings();
    
    // Update metadata to include Yale-specific information
    await exportMetadata(categories, impactAreas, universityImpactAreas);
    
    // Pass the Yale data to the executive orders export function
    await exportExecutiveOrders(yaleOrderImpactsByOrder, yaleOrderStakeholdersByOrder);
    await exportStatistics();
    await exportSystemInfo();
    
    console.log('All data successfully exported to JSON files with enhanced source integration and Yale-specific context.');
  } catch (err) {
    console.error('Error exporting data:', err);
  } finally {
    db.close();
  }
}

// Run the export
exportAll();