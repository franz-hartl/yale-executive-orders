/**
 * fetch_eo_data.js
 * 
 * Main script for fetching executive order data using the modular data source system.
 * This demonstrates how to use multiple sources with isolation of failures.
 */

require('dotenv').config();
const path = require('path');
const logger = require('./utils/logger');
const { writeJsonFile, writeCsvFile } = require('./utils/common');

// Import source registry and sources
const sourceRegistry = require('./sources/source_registry');
const FederalRegisterSource = require('./sources/federal_register_source');
const WhiteHouseSource = require('./sources/whitehouse_source');
const LocalFileSource = require('./sources/local_file_source');

// Import Yale-specific data for enrichment
const fs = require('fs').promises;
const yaleImpactAreasPath = path.join(__dirname, 'yale_specific_data', 'yale_impact_areas.json');
const yaleStakeholdersPath = path.join(__dirname, 'yale_specific_data', 'yale_stakeholders.json');

// Set up logging
logger.initLogger({
  logLevel: 'INFO',
  logFile: path.join(__dirname, 'logs', 'fetch_eo_data.log')
});

const mainLogger = logger.createNamedLogger('FetchEOData');

/**
 * Main function to orchestrate the fetching process
 */
async function main() {
  try {
    mainLogger.info('Starting executive order data fetch process');
    
    // Initialize sources
    mainLogger.info('Initializing data sources');
    
    // Federal Register Source
    const federalRegisterSource = new FederalRegisterSource({
      id: 'federal-register',
      requestDelay: 2000 // Higher delay to prevent rate limiting
    });
    sourceRegistry.registerSource(federalRegisterSource);
    
    // White House Source
    const whiteHouseSource = new WhiteHouseSource({
      id: 'whitehouse',
      requestDelay: 3000
    });
    sourceRegistry.registerSource(whiteHouseSource);
    
    // Local File Source
    const localFileSource = new LocalFileSource({
      id: 'local-file',
      dataDir: path.join(__dirname, 'data'),
      primaryFile: 'executive_orders.json',
      backupFiles: ['executive_orders_backup.json']
    });
    sourceRegistry.registerSource(localFileSource);
    
    // Initialize all sources
    await sourceRegistry.initializeAllSources();
    
    // Define fetch options
    const fetchOptions = {
      fromDate: '2020-01-01', // Fetch orders from this date onward
      includeFullText: true    // Include full text of orders
    };
    
    // Fetch from all sources
    mainLogger.info('Fetching executive orders from all sources');
    const fetchResults = await sourceRegistry.fetchFromAllSources(fetchOptions);
    
    mainLogger.info(`Fetched ${fetchResults.orders.length} unique executive orders`);
    
    // Log results by source
    for (const [sourceId, result] of Object.entries(fetchResults.sourceResults)) {
      const source = sourceRegistry.getSource(sourceId);
      if (result.success) {
        mainLogger.info(`Source ${source.name}: Successfully fetched ${result.count} orders`);
      } else {
        mainLogger.warn(`Source ${source.name}: Failed - ${result.error}`);
      }
    }
    
    // Enrich with Yale-specific impact areas
    try {
      mainLogger.info('Enriching orders with Yale-specific impact areas');
      
      // Load Yale impact areas and stakeholders
      const yaleImpactAreasData = await fs.readFile(yaleImpactAreasPath, 'utf8');
      const yaleImpactAreas = JSON.parse(yaleImpactAreasData);
      
      const yaleStakeholdersData = await fs.readFile(yaleStakeholdersPath, 'utf8');
      const yaleStakeholders = JSON.parse(yaleStakeholdersData);
      
      // Map of general policy areas to Yale impact areas for basic mapping
      const policyToYaleAreaMap = {
        'education': [1, 10], // Research & Innovation, Academic Programs
        'immigration': [3], // International & Immigration
        'foreign policy': [2, 3], // Research Security, International & Immigration
        'healthcare': [7], // Healthcare & Public Health
        'diversity': [4], // Community & Belonging
        'finance': [8], // Financial & Operations
        'research': [1, 2], // Research & Innovation, Research Security
        'employment': [6], // Faculty & Workforce
        'student': [5, 12], // Campus Safety & Student Affairs, Athletics & Student Activities
        'safety': [5], // Campus Safety & Student Affairs
        'compliance': [9], // Governance & Legal
        'culture': [11], // Arts & Cultural Heritage
        'sports': [12], // Athletics & Student Activities
        'legal': [9], // Governance & Legal
        'technology': [1] // Research & Innovation
      };
      
      // For each order, add Yale impact areas based on policy tags
      for (const order of fetchResults.orders) {
        if (!order.yaleImpactAreas) {
          order.yaleImpactAreas = [];
          
          // Use policy tags to suggest Yale impact areas
          if (order.policyTags && Array.isArray(order.policyTags)) {
            const relevantYaleAreaIds = new Set();
            
            // Map policy tags to Yale impact areas
            for (const tag of order.policyTags) {
              // Check each policy keyword
              for (const [keyword, areaIds] of Object.entries(policyToYaleAreaMap)) {
                if (tag.toLowerCase().includes(keyword)) {
                  areaIds.forEach(id => relevantYaleAreaIds.add(id));
                }
              }
            }
            
            // Add suggested Yale impact areas
            for (const areaId of relevantYaleAreaIds) {
              const yaleArea = yaleImpactAreas.find(area => area.id === areaId);
              if (yaleArea) {
                order.yaleImpactAreas.push({
                  id: yaleArea.id,
                  name: yaleArea.name,
                  relevance: "Suggested based on policy tags"
                });
              }
            }
          }
          
          // If no Yale impact areas were found, add a default one
          if (order.yaleImpactAreas.length === 0) {
            order.yaleImpactAreas.push({
              id: 9, // Governance & Legal as fallback
              name: "Governance & Legal",
              relevance: "Default assignment pending detailed analysis"
            });
          }
        }
        
        // Add relevant Yale stakeholders based on impact areas
        if (!order.yaleStakeholders) {
          order.yaleStakeholders = [];
          
          // For each Yale impact area, find relevant stakeholders
          const relevantStakeholderIds = new Set();
          for (const impactArea of order.yaleImpactAreas) {
            for (const stakeholder of yaleStakeholders) {
              if (stakeholder.relevant_impact_areas.includes(impactArea.id)) {
                relevantStakeholderIds.add(stakeholder.id);
              }
            }
          }
          
          // Add suggested Yale stakeholders
          for (const stakeholderId of relevantStakeholderIds) {
            const stakeholder = yaleStakeholders.find(s => s.id === stakeholderId);
            if (stakeholder) {
              order.yaleStakeholders.push({
                id: stakeholder.id,
                name: stakeholder.name,
                description: stakeholder.description,
                priority: "Medium" // Default priority
              });
            }
          }
        }
      }
      
      mainLogger.info(`Added Yale-specific impact areas to ${fetchResults.orders.length} orders`);
    } catch (error) {
      mainLogger.warn(`Error enriching with Yale impact areas: ${error.message}`);
      // Continue with the process even if Yale enrichment fails
    }
    
    // Save results
    if (fetchResults.orders.length > 0) {
      // Create backup of existing data
      await localFileSource.createBackup('pre-fetch');
      
      // Save to local file source
      await localFileSource.saveOrders(fetchResults.orders);
      
      // Also save as CSV
      const csvPath = path.join(__dirname, 'data', 'executive_orders.csv');
      const csvHeaders = [
        'order_number', 'title', 'signing_date', 'publication_date', 
        'president', 'url', 'source'
      ];
      
      writeCsvFile(csvPath, csvHeaders, fetchResults.orders);
      mainLogger.info(`Saved CSV export to ${csvPath}`);
      
      // Save JSON for web use
      const webJsonPath = path.join(__dirname, 'docs', 'data', 'executive_orders.json');
      writeJsonFile(webJsonPath, fetchResults.orders);
      mainLogger.info(`Saved web JSON data to ${webJsonPath}`);
      
      mainLogger.info('Data save complete');
    } else {
      mainLogger.warn('No orders fetched, skipping save');
    }
    
    // Clean up sources
    await sourceRegistry.cleanupAllSources();
    
    mainLogger.info('Executive order data fetch process completed successfully');
  } catch (error) {
    mainLogger.error(`Error in fetch process: ${error.message}`, error);
  }
}

// Run the main function
main()
  .then(() => {
    mainLogger.info('Process completed, exiting');
  })
  .catch(error => {
    mainLogger.error(`Unhandled error: ${error.message}`, error);
    process.exit(1);
  });