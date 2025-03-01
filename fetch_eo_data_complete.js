/**
 * fetch_eo_data_complete.js
 * 
 * Main script for fetching executive order data using the complete modular data source system,
 * including all government, higher education, and research-focused sources.
 */

require('dotenv').config();
const path = require('path');
const logger = require('./utils/logger');
const { writeJsonFile, writeCsvFile } = require('./utils/common');

// Import source registry and core sources
const sourceRegistry = require('./sources/source_registry');
const FederalRegisterSource = require('./sources/federal_register_source');
const WhiteHouseSource = require('./sources/whitehouse_source');
const LocalFileSource = require('./sources/local_file_source');
const DatabaseSource = require('./sources/database_source');

// Import higher education and research sources
const COGRSource = require('./sources/cogr_source');
const NSFSource = require('./sources/nsf_source');
const NIHSource = require('./sources/nih_source');
const ACESource = require('./sources/ace_source');

// Set up logging
logger.initLogger({
  logLevel: 'INFO',
  logFile: path.join(__dirname, 'logs', 'fetch_eo_data_complete.log')
});

const mainLogger = logger.createNamedLogger('FetchEOData');

/**
 * Main function to orchestrate the fetching process
 */
async function main() {
  try {
    mainLogger.info('Starting comprehensive executive order data fetch process');
    
    // Initialize core sources
    mainLogger.info('Initializing core data sources');
    
    // Federal Register Source
    const federalRegisterSource = new FederalRegisterSource({
      id: 'federal-register',
      requestDelay: 2000
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
    
    // Database Source
    const databaseSource = new DatabaseSource({
      id: 'database',
      dbPath: path.join(__dirname, 'executive_orders.db')
    });
    sourceRegistry.registerSource(databaseSource);
    
    // Initialize higher education and research sources
    mainLogger.info('Initializing higher education and research data sources');
    
    // COGR Source
    const cogrSource = new COGRSource({
      id: 'cogr',
      requestDelay: 2500
    });
    sourceRegistry.registerSource(cogrSource);
    
    // NSF Source
    const nsfSource = new NSFSource({
      id: 'nsf',
      requestDelay: 2500
    });
    sourceRegistry.registerSource(nsfSource);
    
    // NIH Source
    const nihSource = new NIHSource({
      id: 'nih',
      requestDelay: 2500
    });
    sourceRegistry.registerSource(nihSource);
    
    // ACE Source
    const aceSource = new ACESource({
      id: 'ace',
      requestDelay: 2500
    });
    sourceRegistry.registerSource(aceSource);
    
    // Initialize all sources
    await sourceRegistry.initializeAllSources();
    
    // Define fetch options
    const fetchOptions = {
      fromDate: '2020-01-01', // Fetch orders from this date onward
      includeFullText: true    // Include full text of orders
    };
    
    // Fetch from official sources first
    mainLogger.info('Fetching executive orders from official sources');
    
    // Create a group of official sources
    const officialSources = [federalRegisterSource, whiteHouseSource];
    
    // Fetch from official sources
    const officialResults = {
      orders: [],
      sourceResults: {}
    };
    
    for (const source of officialSources) {
      try {
        mainLogger.info(`Fetching from official source: ${source.name}`);
        const sourceOrders = await source.fetchOrders(fetchOptions);
        
        if (Array.isArray(sourceOrders) && sourceOrders.length > 0) {
          mainLogger.info(`Found ${sourceOrders.length} orders from source: ${source.name}`);
          officialResults.orders.push(...sourceOrders);
          officialResults.sourceResults[source.id] = {
            success: true,
            count: sourceOrders.length
          };
        } else {
          mainLogger.warn(`No orders found from source: ${source.name}`);
          officialResults.sourceResults[source.id] = {
            success: true,
            count: 0
          };
        }
      } catch (error) {
        mainLogger.error(`Failed to fetch from source ${source.name}: ${error.message}`);
        officialResults.sourceResults[source.id] = {
          success: false,
          error: error.message
        };
      }
    }
    
    mainLogger.info(`Fetched ${officialResults.orders.length} orders from official sources`);
    
    // Remove duplicates
    const officialOrdersUnique = sourceRegistry.removeDuplicateOrders(officialResults.orders);
    mainLogger.info(`After deduplication: ${officialOrdersUnique.length} unique official orders`);
    
    // Save official orders to database
    try {
      mainLogger.info('Saving official orders to database');
      await databaseSource.saveOrders(officialOrdersUnique, { updateExisting: true });
    } catch (dbError) {
      mainLogger.error(`Failed to save official orders to database: ${dbError.message}`);
    }
    
    // Fetch from higher education and research sources
    mainLogger.info('Fetching analyses from higher education and research sources');
    
    // Create a group of higher ed and research sources
    const researchSources = [cogrSource, nsfSource, nihSource, aceSource];
    
    // Fetch from research sources
    const researchResults = {
      orders: [],
      sourceResults: {}
    };
    
    for (const source of researchSources) {
      try {
        mainLogger.info(`Fetching from research source: ${source.name}`);
        const sourceOrders = await source.fetchOrders({
          ...fetchOptions,
          maxResults: 25 // Limit results per source
        });
        
        if (Array.isArray(sourceOrders) && sourceOrders.length > 0) {
          mainLogger.info(`Found ${sourceOrders.length} analyses from source: ${source.name}`);
          researchResults.orders.push(...sourceOrders);
          researchResults.sourceResults[source.id] = {
            success: true,
            count: sourceOrders.length
          };
        } else {
          mainLogger.warn(`No analyses found from source: ${source.name}`);
          researchResults.sourceResults[source.id] = {
            success: true,
            count: 0
          };
        }
      } catch (error) {
        mainLogger.error(`Failed to fetch from source ${source.name}: ${error.message}`);
        researchResults.sourceResults[source.id] = {
          success: false,
          error: error.message
        };
      }
    }
    
    mainLogger.info(`Fetched ${researchResults.orders.length} analyses from research sources`);
    
    // Match research analyses with official orders
    mainLogger.info('Matching research analyses with official orders');
    
    // Create a map of official orders by order number
    const officialOrdersByNumber = {};
    for (const order of officialOrdersUnique) {
      if (order.order_number) {
        officialOrdersByNumber[order.order_number] = order;
      }
    }
    
    // Enrich official orders with research analyses
    for (const analysis of researchResults.orders) {
      if (analysis.order_number && officialOrdersByNumber[analysis.order_number]) {
        const officialOrder = officialOrdersByNumber[analysis.order_number];
        
        // Merge metadata
        officialOrder.metadata = { ...officialOrder.metadata, ...analysis.metadata };
        
        // Add the source to the list of sources that have analyzed this order
        officialOrder.metadata.analyzed_by = officialOrder.metadata.analyzed_by || [];
        officialOrder.metadata.analyzed_by.push(analysis.source);
        
        // Add analysis link if available
        if (analysis.url && analysis.url !== officialOrder.url) {
          officialOrder.metadata.analysis_urls = officialOrder.metadata.analysis_urls || [];
          officialOrder.metadata.analysis_urls.push({
            source: analysis.source,
            url: analysis.url,
            title: analysis.title
          });
        }
        
        // If the official order lacks an executive brief but the analysis has one, use it
        if (!officialOrder.executive_brief && analysis.executive_brief) {
          officialOrder.executive_brief = analysis.executive_brief;
        }
        
        // If the official order lacks a comprehensive analysis but the analysis has one, use it
        if (!officialOrder.comprehensive_analysis && analysis.comprehensive_analysis) {
          officialOrder.comprehensive_analysis = analysis.comprehensive_analysis;
        }
        
        // Add university impact areas if available
        if (analysis.universityImpactAreas && Array.isArray(analysis.universityImpactAreas)) {
          officialOrder.universityImpactAreas = [
            ...(officialOrder.universityImpactAreas || []),
            ...analysis.universityImpactAreas
          ].filter((value, index, self) => self.indexOf(value) === index); // Deduplicate
        }
      }
    }
    
    // Save enriched orders to local file
    mainLogger.info('Saving enriched orders to local file');
    
    // Create backup of existing data
    await localFileSource.createBackup('pre-research-enrichment');
    
    // Save to local file source
    await localFileSource.saveOrders(Object.values(officialOrdersByNumber));
    
    // Save as CSV for easy viewing
    const csvPath = path.join(__dirname, 'data', 'executive_orders_enriched.csv');
    const csvHeaders = [
      'order_number', 'title', 'signing_date', 'publication_date',
      'president', 'url', 'impact_level', 'source'
    ];
    
    writeCsvFile(csvPath, csvHeaders, Object.values(officialOrdersByNumber));
    mainLogger.info(`Saved CSV export to ${csvPath}`);
    
    // Save JSON for web use
    const webJsonPath = path.join(__dirname, 'docs', 'data', 'executive_orders.json');
    writeJsonFile(webJsonPath, Object.values(officialOrdersByNumber));
    mainLogger.info(`Saved web JSON data to ${webJsonPath}`);
    
    // Save research sources data separately
    const researchJsonPath = path.join(__dirname, 'docs', 'data', 'research_analyses.json');
    writeJsonFile(researchJsonPath, researchResults.orders);
    mainLogger.info(`Saved research analyses data to ${researchJsonPath}`);
    
    // Save enhanced metadata about university impacts
    const universityImpactPath = path.join(__dirname, 'docs', 'data', 'university_impact_areas.json');
    
    // Extract all unique university impact areas
    const allImpactAreas = new Set();
    for (const order of Object.values(officialOrdersByNumber)) {
      if (order.universityImpactAreas && Array.isArray(order.universityImpactAreas)) {
        for (const area of order.universityImpactAreas) {
          allImpactAreas.add(area);
        }
      }
    }
    
    // Create impact areas object
    const impactAreasData = {
      areas: Array.from(allImpactAreas).sort().map(area => ({
        name: area,
        count: Object.values(officialOrdersByNumber).filter(order => 
          order.universityImpactAreas && order.universityImpactAreas.includes(area)
        ).length
      })),
      lastUpdated: new Date().toISOString()
    };
    
    writeJsonFile(universityImpactPath, impactAreasData);
    mainLogger.info(`Saved university impact areas data to ${universityImpactPath}`);
    
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