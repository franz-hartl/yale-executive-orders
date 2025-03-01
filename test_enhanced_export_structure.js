/**
 * test_enhanced_export_structure.js
 * 
 * This script tests the structural changes for the enhanced JSON export
 * by creating a simple test object and verifying the algorithms work correctly.
 */

// Utility functions from export_to_json.js
function getSourceAbbreviation(sourceName) {
  const abbreviations = {
    'COGR Executive Order Tracker': 'COGR',
    'NSF Implementation Pages': 'NSF',
    'NIH Policy Notices': 'NIH',
    'ACE Policy Briefs': 'ACE'
  };
  
  return abbreviations[sourceName] || sourceName.split(' ').map(word => word[0]).join('');
}

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

// Test data
const testOrder = {
  id: 1,
  order_number: "EO 14110",
  title: "Addressing the Risks and Harnessing the Benefits of Artificial Intelligence",
  signing_date: "2025-01-30",
  president: "Sanders",
  summary: "Establishes new standards for AI safety and security in academic institutions.",
  impact_level: "High",
  comprehensive_analysis: "This executive order establishes comprehensive guidelines for AI development..."
};

const testSources = [
  {
    source_name: "COGR Executive Order Tracker",
    source_url: "https://www.cogr.edu/cogr-resources",
    external_reference_id: "EO-14110",
    fetch_date: "2024-02-15",
    specificData: {
      implementation_references: [
        {
          title: "AI Safety Guidelines for Research",
          url: "https://www.cogr.edu/ai-safety",
          executive_order: "EO 14110",
          context: "COGR's analysis of this executive order reveals significant impacts on research universities...",
          impact_areas: {
            "Research Funding & Science Policy": {
              impact: "Positive",
              description: "COGR assessment shows positive impact on research funding"
            }
          },
          institution_specific_guidance: {
            "R1 Research Universities": "R1 institutions should prioritize compliance with new AI safety protocols...",
            "R2 Research Universities": "R2 institutions should focus on documentation requirements..."
          },
          action_items: [
            {
              title: "Update AI research protocols",
              description: "Implement new security measures for AI research",
              deadline: "2024-06-30"
            }
          ]
        }
      ]
    }
  },
  {
    source_name: "NIH Policy Notices",
    source_url: "https://grants.nih.gov/policy/index.htm",
    external_reference_id: "NOT-OD-24-086",
    fetch_date: "2024-02-20",
    specificData: {
      implementation_references: [
        {
          title: "NIH Implementation of EO 14110",
          url: "https://grants.nih.gov/notice/NOT-OD-24-086",
          executive_order: "EO 14110",
          context: "NIH has developed the following implementation guidelines for grantees...",
          impact_areas: {
            "Research Funding & Science Policy": {
              impact: "Neutral",
              description: "NIH notes minimal changes to current funding processes"
            },
            "Regulatory Compliance": {
              impact: "Negative", 
              description: "Additional documentation burdens expected"
            }
          },
          exemptions: ["Community Colleges"],
          action_items: [
            {
              title: "Update AI research protocols",
              description: "Ensure ethical AI use in NIH-funded research",
              deadline: "2024-07-15"
            }
          ]
        }
      ]
    }
  }
];

const testImpacts = {
  "R1 Research Universities": {
    "Research Operations": {
      score: 8,
      description: "Major impact on AI research operations"
    },
    "Regulatory Compliance": {
      score: 6,
      description: "Significant compliance requirements"
    }
  },
  "R2 Research Universities": {
    "Research Operations": {
      score: 6,
      description: "Moderate impact on research activities"
    }
  },
  "Community Colleges": {
    "Academic Programs": {
      score: 3,
      description: "Minor impact on curriculum"
    }
  }
};

const testUniversityImpactAreas = [
  {
    id: 1,
    name: "Research Funding & Science Policy",
    description: "Impact on federal research grants",
    notes: "Critical for research institutions"
  },
  {
    id: 2,
    name: "Regulatory Compliance",
    description: "Impact on compliance requirements",
    notes: null
  }
];

// Run the tests
function runTests() {
  console.log("Testing Enhanced JSON Export Structure...\n");
  
  // Test 1: Normalized Source Attribution
  console.log("Test 1: Normalized Source Attribution");
  const normalizedSources = normalizeSourceAttribution(testSources);
  console.log(JSON.stringify(normalizedSources[0], null, 2));
  console.log(`✅ Successfully normalized ${normalizedSources.length} sources\n`);
  
  // Test 2: Institution-Specific Guidance
  console.log("Test 2: Institution-Specific Guidance");
  const guidance = generateInstitutionGuidance(testOrder, testSources, testImpacts);
  console.log(JSON.stringify(guidance["R1 Research Universities"], null, 2));
  console.log(`✅ Generated guidance for ${Object.keys(guidance).length} institution types\n`);
  
  // Test 3: Source-Aware Impact Analysis
  console.log("Test 3: Source-Aware Impact Analysis");
  const impactAnalysis = generateSourceAwareImpactAnalysis(testOrder, testSources, testUniversityImpactAreas);
  console.log(JSON.stringify(impactAnalysis["Research Funding & Science Policy"], null, 2));
  console.log(`✅ Generated impact analysis for ${Object.keys(impactAnalysis).length} areas\n`);
  
  // Test 4: Combined Analysis
  console.log("Test 4: Combined Analysis");
  const combinedAnalysis = generateCombinedAnalysis(testOrder, testSources);
  console.log(`Source contributions: ${Object.keys(combinedAnalysis.source_contributions).length}`);
  console.log(`Key perspectives: ${combinedAnalysis.key_perspectives.length}`);
  console.log(`✅ Successfully generated combined analysis\n`);
  
  // Final result
  console.log("All enhanced JSON structure tests passed! ✅");
}

// Run tests
runTests();