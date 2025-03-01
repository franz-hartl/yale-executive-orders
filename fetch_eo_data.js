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