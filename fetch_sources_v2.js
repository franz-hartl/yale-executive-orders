/**
 * fetch_sources_v2.js
 * 
 * Script to fetch executive order data from all configured external sources using
 * the new source data management system. This script provides a cleaner implementation
 * that ensures consistent data storage and source tracking.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('./utils/logger');
const sourceManager = require('./sources/source_manager');
const FederalRegisterAdapter = require('./sources/adapters/federal_register_adapter');
const { sleep } = require('./utils/common');

// Initialize logger
logger.initLogger({
  logLevel: process.env.LOG_LEVEL || 'INFO',
  logFile: 'server.log'
});

// Create a script-specific logger
const fetchLogger = logger.createNamedLogger('FetchSourcesV2');

/**
 * Creates and configures the Federal Register adapter
 */
async function setupFederalRegisterAdapter() {
  fetchLogger.info('Setting up Federal Register adapter');
  
  const sourceId = crypto.randomUUID();
  const adapter = new FederalRegisterAdapter({
    sourceId: sourceId,
    requestDelay: 2000, // Increase delay to be nice to the Federal Register API
    maxRetries: 3,
    isPrimary: true, // Federal Register is the primary source for EOs
    priority: 1
  });
  
  await adapter.initialize();
  return adapter;
}

/**
 * Fetches data from the Federal Register API
 * @param {FederalRegisterAdapter} adapter Federal Register adapter
 * @returns {Promise<Object>} Fetch results
 */
async function fetchFromFederalRegister(adapter) {
  fetchLogger.info('Fetching from Federal Register');
  
  try {
    // Fetch options
    const fetchOptions = {
      fromDate: process.env.FR_FROM_DATE || '2024-01-01', // Default to recent EOs
      includeFullText: true,
      maxPages: process.env.FR_MAX_PAGES ? parseInt(process.env.FR_MAX_PAGES) : 0
    };
    
    // For testing, limit pages
    if (process.env.NODE_ENV === 'test') {
      fetchOptions.maxPages = 1;
    }
    
    // Fetch the orders
    fetchLogger.info(`Fetching with options: ${JSON.stringify(fetchOptions)}`);
    const orders = await adapter.fetchData(fetchOptions);
    fetchLogger.info(`Fetched ${orders.length} orders from Federal Register`);
    
    // Store fetched data
    fetchLogger.info('Storing fetched data');
    const { contentIds, errors } = await adapter.processAndStoreItems(orders, {
      contentType: 'executive_order',
      storeOriginal: false, // Don't store the original JSON to save space
      generateContentId: true
    });
    
    fetchLogger.info(`Successfully stored ${contentIds.length} orders`);
    
    if (errors.length > 0) {
      fetchLogger.warn(`Encountered ${errors.length} errors while storing data`);
      for (const error of errors) {
        fetchLogger.warn(`Error processing item ${error.item?.document_number || 'unknown'}: ${error.error}`);
      }
    }
    
    return {
      success: true,
      ordersCount: orders.length,
      storedCount: contentIds.length,
      errorCount: errors.length,
      contentIds: contentIds
    };
  } catch (error) {
    fetchLogger.error(`Error fetching from Federal Register: ${error.message}`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function to fetch from all external sources
 */
async function fetchFromAllSources() {
  fetchLogger.info('Starting fetch from all external sources');
  
  try {
    // Initialize the source manager
    await sourceManager.initialize();
    
    // Set up our adapters
    const federalRegisterAdapter = await setupFederalRegisterAdapter();
    
    // Fetch from Federal Register
    const federalRegisterResults = await fetchFromFederalRegister(federalRegisterAdapter);
    
    // Get a list of all registered sources
    const sources = await sourceManager.getAllSources(true);
    fetchLogger.info(`Registered sources: ${sources.map(s => s.name).join(', ')}`);
    
    // Clean up
    await sourceManager.close();
    
    // Return results
    fetchLogger.info('Fetch from all external sources completed successfully');
    return {
      success: true,
      federalRegister: federalRegisterResults,
      // Add other source results here as they are implemented
      totalSources: sources.length
    };
  } catch (error) {
    fetchLogger.error(`Error in fetch from all sources: ${error.message}`, error);
    
    // Clean up
    try {
      await sourceManager.close();
    } catch (closeError) {
      fetchLogger.error(`Error closing source manager: ${closeError.message}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Utility function to convert stored content to the old database format
 * This helps integrate with existing functionality while transitioning to the new system
 */
async function convertToLegacyFormat(contentIds) {
  fetchLogger.info(`Converting ${contentIds.length} items to legacy format`);
  
  try {
    // Initialize the source manager if needed
    if (!sourceManager.isInitialized) {
      await sourceManager.initialize();
    }
    
    const legacyItems = [];
    
    for (const contentId of contentIds) {
      const content = await sourceManager.getSourceContent(contentId);
      
      if (!content) {
        fetchLogger.warn(`Content not found for ID: ${contentId}`);
        continue;
      }
      
      const data = content.content;
      
      // Convert to legacy format
      legacyItems.push({
        order_number: data.order_number,
        document_number: data.document_number,
        title: data.title,
        signing_date: data.signing_date,
        publication_date: data.publication_date,
        president: data.president,
        summary: data.summary,
        full_text: data.full_text,
        url: data.url,
        source_specific_data: {
          source_id: content.sourceId,
          source_name: content.sourceName,
          metadata: data.metadata,
          fetch_date: content.fetchDate
        }
      });
    }
    
    fetchLogger.info(`Converted ${legacyItems.length} items to legacy format`);
    return legacyItems;
  } catch (error) {
    fetchLogger.error(`Error converting to legacy format: ${error.message}`, error);
    return [];
  }
}

// If this script is run directly, execute the fetch function
if (require.main === module) {
  fetchFromAllSources()
    .then(result => {
      console.log('Fetch result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = {
    fetchFromAllSources,
    fetchFromFederalRegister,
    convertToLegacyFormat
  };
}