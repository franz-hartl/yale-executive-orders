/**
 * test_yale_cogr_integration.js
 * 
 * This script tests the integration of Yale taxonomy with sample COGR executive order data.
 * It simulates the process of mapping executive orders to Yale-specific impact areas and stakeholders.
 */

const fs = require('fs').promises;
const path = require('path');
const { writeJsonFile } = require('./utils/common');

// Import Yale-specific taxonomy for testing
const yaleImpactAreasPath = path.join(__dirname, 'yale_specific_data', 'yale_impact_areas.json');
const yaleStakeholdersPath = path.join(__dirname, 'yale_specific_data', 'yale_stakeholders.json');

// Map of general policy areas to Yale impact areas for testing
const policyToYaleAreaMap = {
  'cybersecurity': [2, 8], // Research Security & Export Control, Financial & Operations
  'artificial intelligence': [1, 2], // Research & Innovation, Research Security & Export Control
  'research': [1, 2], // Research & Innovation, Research Security & Export Control
  'compliance': [9], // Governance & Legal
  'administrative': [8, 9], // Financial & Operations, Governance & Legal
  'international': [3], // International & Immigration
  'equity': [4], // Community & Belonging
  'healthcare': [7] // Healthcare & Public Health
};

// Sample COGR executive orders for testing
const sampleOrders = [
  {
    id: 1001,
    title: "Executive Order 14028: Improving the Nation's Cybersecurity",
    order_number: "14028",
    signing_date: "2023-05-12",
    publication_date: "2023-05-15",
    summary: "Enhances cybersecurity across federal networks and critical infrastructure with new standards and reporting requirements.",
    categories: ["Research", "Technology", "Security"],
    universityImpactAreas: ["Research Funding", "Administrative Compliance"]
  },
  {
    id: 1002,
    title: "Executive Order 14107: Artificial Intelligence Executive Order",
    order_number: "14107",
    signing_date: "2023-10-30",
    publication_date: "2023-11-02",
    summary: "Establishes guidance for responsible development and deployment of artificial intelligence systems across sectors.",
    categories: ["Research", "Technology", "Innovation"],
    universityImpactAreas: ["Research Funding", "Administrative Compliance"]
  }
];

/**
 * Processes sample COGR data and assigns Yale taxonomy
 */
async function processCOGRDataWithYaleTaxonomy() {
  try {
    console.log('Testing Yale integration with sample COGR data...');
    
    // Load Yale impact areas
    console.log('Loading Yale taxonomy data...');
    const yaleImpactAreasData = await fs.readFile(yaleImpactAreasPath, 'utf8');
    const yaleImpactAreas = JSON.parse(yaleImpactAreasData);
    
    // Load Yale stakeholders
    const yaleStakeholdersData = await fs.readFile(yaleStakeholdersPath, 'utf8');
    const yaleStakeholders = JSON.parse(yaleStakeholdersData);
    
    // Process each order with Yale taxonomy
    console.log('Applying Yale taxonomy to sample COGR orders...');
    const enrichedOrders = [];
    
    for (const order of sampleOrders) {
      // Extract key terms from order title and summary for mapping
      const orderText = `${order.title} ${order.summary || ''}`.toLowerCase();
      
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
      }
      
      // Always include Research & Innovation for COGR items (fallback)
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
            relevance: `Identified based on EO content: ${orderText.substring(0, 50)}...`
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
    
    // Save results to test output file
    console.log('Generating test output...');
    const outputDir = path.join(__dirname, 'test_output');
    await fs.mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, 'yale_cogr_integration_test.json');
    await writeJsonFile(outputPath, enrichedOrders);
    
    console.log(`Test completed successfully. Results saved to ${outputPath}`);
    console.log('-------------------------------------');
    console.log('Yale Taxonomy Integration Summary:');
    console.log('-------------------------------------');
    
    for (const order of enrichedOrders) {
      console.log(`Order: ${order.title}`);
      console.log('Yale Impact Areas:');
      order.yale_impact_areas.forEach(area => {
        console.log(`  - ${area.name}`);
      });
      
      console.log('Yale Stakeholders:');
      order.yale_stakeholders.forEach(stakeholder => {
        console.log(`  - ${stakeholder.name} (Priority: ${stakeholder.priority})`);
      });
      console.log('-------------------------------------');
    }
    
    return enrichedOrders;
  } catch (error) {
    console.error('Error in Yale COGR integration test:', error);
    throw error;
  }
}

// Run the test
processCOGRDataWithYaleTaxonomy()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err));