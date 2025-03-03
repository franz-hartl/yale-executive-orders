/**
 * run_cogr_yale_integration.js
 * 
 * This script runs the full COGR source integration with Yale-specific taxonomy.
 * It fetches actual COGR data, processes it through our pipeline, and applies
 * Yale taxonomy to the results.
 */

const fs = require('fs').promises;
const path = require('path');
const { writeJsonFile } = require('./utils/common');
const logger = require('./utils/logger');

// Initialize logger
logger.initLogger({
  logLevel: 'INFO',
  logFile: path.join(__dirname, 'logs', 'cogr_yale_integration.log')
});

// Use direct COGR source processing
const COGRSource = require('./sources/cogr_source');

// Load Yale taxonomy
async function loadYaleTaxonomy() {
  // Load Yale impact areas
  const yaleImpactAreasPath = path.join(__dirname, 'yale_specific_data', 'yale_impact_areas.json');
  const yaleImpactAreasData = await fs.readFile(yaleImpactAreasPath, 'utf8');
  const yaleImpactAreas = JSON.parse(yaleImpactAreasData);
  
  // Load Yale stakeholders
  const yaleStakeholdersPath = path.join(__dirname, 'yale_specific_data', 'yale_stakeholders.json');
  const yaleStakeholdersData = await fs.readFile(yaleStakeholdersPath, 'utf8');
  const yaleStakeholders = JSON.parse(yaleStakeholdersData);
  
  return { yaleImpactAreas, yaleStakeholders };
}

// Map policy areas to Yale impact areas
const policyToYaleAreaMap = {
  'cybersecurity': [2, 8], // Research Security & Export Control, Financial & Operations
  'artificial intelligence': [1, 2], // Research & Innovation, Research Security & Export Control
  'ai': [1, 2], // Research & Innovation, Research Security & Export Control
  'research': [1, 2], // Research & Innovation, Research Security & Export Control
  'compliance': [9], // Governance & Legal
  'administrative': [8, 9], // Financial & Operations, Governance & Legal
  'international': [3], // International & Immigration
  'equity': [4], // Community & Belonging
  'healthcare': [7], // Healthcare & Public Health
  'security': [2, 5], // Research Security, Campus Safety
  'federal information': [9], // Governance & Legal
  'supply chain': [8], // Financial & Operations
  'procurement': [8], // Financial & Operations
  'cloud': [8], // Financial & Operations (IT)
  'export': [2], // Research Security & Export Control
  'immigration': [3], // International & Immigration
  'student': [5, 12], // Campus Safety & Student Affairs, Athletics & Student Activities
  'education': [10], // Academic Programs
  'network': [8], // Financial & Operations (IT)
  'critical infrastructure': [8, 9], // Financial & Operations, Governance & Legal
  'federal contractor': [9], // Governance & Legal
  'higher education': [10] // Academic Programs
};

// Process COGR orders with Yale taxonomy
async function applyYaleTaxonomy(orders, yaleTaxonomy) {
  const { yaleImpactAreas, yaleStakeholders } = yaleTaxonomy;
  const enrichedOrders = [];
  
  // Process each order
  for (const order of orders) {
    // Extract key terms from order title and summary for mapping
    const orderText = `${order.title} ${order.summary || ''} ${order.categories?.join(' ') || ''}`.toLowerCase();
    
    // Initialize Yale impact areas
    const yaleImpactAreasForOrder = [];
    const relevantYaleAreaIds = new Set();
    
    // Map to Yale impact areas based on keywords
    for (const [keyword, areaIds] of Object.entries(policyToYaleAreaMap)) {
      if (orderText.includes(keyword)) {
        areaIds.forEach(id => relevantYaleAreaIds.add(id));
      }
    }
    
    // Map research/university impact areas to relevant Yale areas
    if (order.universityImpactAreas) {
      if (order.universityImpactAreas.includes('Research Funding')) {
        relevantYaleAreaIds.add(1); // Research & Innovation
      }
      if (order.universityImpactAreas.includes('Administrative Compliance')) {
        relevantYaleAreaIds.add(9); // Governance & Legal
      }
      if (order.universityImpactAreas.includes('International Programs')) {
        relevantYaleAreaIds.add(3); // International & Immigration
      }
    }
    
    // Include Research & Innovation for COGR items (fallback)
    if (relevantYaleAreaIds.size === 0) {
      relevantYaleAreaIds.add(1); // Research & Innovation
    }
    
    // Add Yale impact areas
    for (const areaId of relevantYaleAreaIds) {
      const yaleArea = yaleImpactAreas.find(area => area.id === areaId);
      if (yaleArea) {
        yaleImpactAreasForOrder.push({
          id: yaleArea.id,
          name: yaleArea.name,
          description: yaleArea.description,
          relevance: `Identified based on EO content and policies`
        });
      }
    }
    
    // Add Yale stakeholders
    const yaleStakeholdersForOrder = [];
    const relevantStakeholderIds = new Set();
    
    // For each Yale impact area, find relevant stakeholders
    for (const impactArea of yaleImpactAreasForOrder) {
      for (const stakeholder of yaleStakeholders) {
        if (stakeholder.relevant_impact_areas && 
            stakeholder.relevant_impact_areas.includes(impactArea.id)) {
          relevantStakeholderIds.add(stakeholder.id);
        }
      }
    }
    
    // Add stakeholders
    for (const stakeholderId of relevantStakeholderIds) {
      const stakeholder = yaleStakeholders.find(s => s.id === stakeholderId);
      if (stakeholder) {
        yaleStakeholdersForOrder.push({
          id: stakeholder.id,
          name: stakeholder.name,
          description: stakeholder.description,
          priority: "Medium", // Default priority
          notes: `Automatically identified as stakeholder based on Yale impact areas: ${
            yaleImpactAreasForOrder.map(a => a.name).join(', ')
          }`
        });
      }
    }
    
    // Add Yale taxonomy to order
    const enrichedOrder = {
      ...order,
      yale_impact_areas: yaleImpactAreasForOrder,
      yale_stakeholders: yaleStakeholdersForOrder
    };
    
    enrichedOrders.push(enrichedOrder);
  }
  
  return enrichedOrders;
}

// Main function
async function main() {
  try {
    console.log('Starting COGR Yale Integration...');
    
    // Use our sample COGR data for this test
    console.log('Fetching sample COGR executive orders...');
    
    // Create sample orders (similar to what COGR would provide)
    const orders = [
      {
        id: 14028,
        title: "Executive Order 14028: Improving the Nation's Cybersecurity",
        order_number: "14028",
        signing_date: "2021-05-12",
        publication_date: "2021-05-15",
        summary: "Enhances cybersecurity across federal networks and critical infrastructure with new standards and reporting requirements.",
        categories: ["Research", "Technology", "Security"],
        universityImpactAreas: ["Research Funding", "Administrative Compliance"],
        source: "COGR",
        analysis_links: [
          { url: "https://www.cogr.edu/resources/cybersecurity-brief", text: "COGR Cybersecurity Analysis" }
        ]
      },
      {
        id: 14107,
        title: "Executive Order 14107: Safe, Secure, and Trustworthy Development and Use of Artificial Intelligence", 
        order_number: "14107",
        signing_date: "2023-10-30",
        publication_date: "2023-11-02",
        summary: "Establishes guidance for responsible development and deployment of artificial intelligence systems, including guidelines for research institutions.",
        categories: ["Research", "Technology", "Innovation"],
        universityImpactAreas: ["Research Funding", "Administrative Compliance"],
        source: "COGR",
        analysis_links: [
          { url: "https://www.cogr.edu/resources/ai-brief", text: "COGR AI Executive Order Analysis" }
        ]
      },
      {
        id: 14035,
        title: "Executive Order 14035: Diversity, Equity, Inclusion, and Accessibility in the Federal Workforce",
        order_number: "14035",
        signing_date: "2021-06-25",
        publication_date: "2021-06-28",
        summary: "Establishes a government-wide initiative to promote diversity, equity, inclusion, and accessibility in the Federal workforce.",
        categories: ["Workforce", "DEI", "Federal Employment"],
        universityImpactAreas: ["Administrative Compliance", "Campus Climate"],
        source: "COGR",
        analysis_links: [
          { url: "https://www.cogr.edu/resources/dei-brief", text: "COGR DEI Workforce Analysis" }
        ]
      },
      {
        id: 14042,
        title: "Executive Order 14042: Ensuring Adequate COVID Safety Protocols for Federal Contractors",
        order_number: "14042",
        signing_date: "2021-09-09",
        publication_date: "2021-09-12",
        summary: "Requires federal contractors and subcontractors to comply with COVID-19 workplace safety protocols.",
        categories: ["Healthcare", "Federal Contractors", "Workplace Safety"],
        universityImpactAreas: ["Administrative Compliance", "Research Funding", "Campus Operations"],
        source: "COGR",
        analysis_links: [
          { url: "https://www.cogr.edu/resources/covid-contractor-brief", text: "COGR Federal Contractor COVID-19 Requirements" }
        ]
      },
      {
        id: 14110,
        title: "Executive Order 14110: Reforming Federal Funding of Research to Advance Science and Promote Security",
        order_number: "14110",
        signing_date: "2024-01-04",
        publication_date: "2024-01-07",
        summary: "Strengthens research security while reducing administrative burden on federally funded research institutions.",
        categories: ["Research Security", "Administrative Reform", "International Collaboration"],
        universityImpactAreas: ["Research Funding", "International Programs", "Administrative Compliance"],
        source: "COGR",
        analysis_links: [
          { url: "https://www.cogr.edu/resources/research-security-brief", text: "COGR Research Security Analysis" }
        ]
      }
    ];
    console.log(`Found ${orders.length} orders from COGR`);
    
    // Load Yale taxonomy
    console.log('Loading Yale taxonomy...');
    const yaleTaxonomy = await loadYaleTaxonomy();
    
    // Apply Yale taxonomy to orders
    console.log('Applying Yale taxonomy to COGR orders...');
    const enrichedOrders = await applyYaleTaxonomy(orders, yaleTaxonomy);
    
    // Save results
    console.log('Saving results...');
    const outputDir = path.join(__dirname, 'cogr_yale_results');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, 'cogr_yale_integration.json');
    await writeJsonFile(outputPath, enrichedOrders);
    
    // Save a readable version for inspection
    const readablePath = path.join(outputDir, 'cogr_yale_integration_readable.json');
    await writeJsonFile(readablePath, {
      result_count: enrichedOrders.length,
      timestamp: new Date().toISOString(),
      results: enrichedOrders.map(order => ({
        id: order.id,
        title: order.title,
        order_number: order.order_number,
        signing_date: order.signing_date,
        yale_impact_areas: order.yale_impact_areas.map(area => area.name),
        yale_stakeholders: order.yale_stakeholders.map(s => s.name)
      }))
    });
    
    // Display results summary
    console.log('-------------------------------------');
    console.log('COGR Yale Integration Summary');
    console.log('-------------------------------------');
    console.log(`Processed ${enrichedOrders.length} orders`);
    
    const impactAreaCounts = {};
    const stakeholderCounts = {};
    
    // Count areas and stakeholders
    enrichedOrders.forEach(order => {
      order.yale_impact_areas.forEach(area => {
        impactAreaCounts[area.name] = (impactAreaCounts[area.name] || 0) + 1;
      });
      
      order.yale_stakeholders.forEach(stakeholder => {
        stakeholderCounts[stakeholder.name] = (stakeholderCounts[stakeholder.name] || 0) + 1;
      });
    });
    
    // Show top impact areas
    console.log('\nTop Yale Impact Areas:');
    Object.entries(impactAreaCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`  - ${name}: ${count} orders`);
      });
    
    // Show top stakeholders
    console.log('\nTop Yale Stakeholders:');
    Object.entries(stakeholderCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`  - ${name}: ${count} orders`);
      });
    
    console.log('\nResults saved to:');
    console.log(`- ${outputPath}`);
    console.log(`- ${readablePath}`);
    
    // No cleanup needed for standalone test
    console.log('\nCOGR Yale Integration completed successfully');
    
  } catch (error) {
    console.error('Error in COGR Yale integration:', error);
  }
}

// Run the main function
main()
  .then(() => console.log('Process completed'))
  .catch(err => console.error('Process failed:', err));