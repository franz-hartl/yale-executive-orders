/**
 * setup_source_management.js
 * 
 * Script to set up the source data management system and initialize the database tables.
 * This script should be run before using the source management system for the first time.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');
const sourceManager = require('./sources/source_manager');

// Initialize logger
logger.initLogger({
  logLevel: process.env.LOG_LEVEL || 'INFO',
  logFile: 'server.log'
});

// Create a script-specific logger
const setupLogger = logger.createNamedLogger('SourceManagementSetup');

/**
 * Set up the source data management system
 */
async function setupSourceManagement() {
  setupLogger.info('Setting up source data management system');
  
  try {
    // Initialize the source manager
    await sourceManager.initialize();
    
    // Create directories for source content
    const contentStoragePath = path.join(process.cwd(), 'data', 'source_content');
    fs.mkdirSync(contentStoragePath, { recursive: true });
    
    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups', 'sources');
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Register predefined sources
    const sourceTypes = [
      {
        type: 'federal_register',
        config: {
          name: 'Federal Register',
          description: 'Official Federal Register API for executive orders',
          baseUrl: 'https://www.federalregister.gov/api/v1',
          fetchFrequencyHours: 24,
          isPrimary: true,
          priority: 1
        }
      },
      {
        type: 'cogr',
        config: {
          name: 'COGR Executive Order Tracker',
          description: 'The Council on Governmental Relations (COGR) maintains a tracker of executive orders relevant to research institutions',
          baseUrl: 'https://www.cogr.edu',
          fetchFrequencyHours: 24 * 7, // Weekly
          priority: 2
        }
      },
      {
        type: 'nsf',
        config: {
          name: 'NSF Implementation Pages',
          description: 'National Science Foundation pages detailing how executive orders are being implemented in grant procedures',
          baseUrl: 'https://www.nsf.gov',
          fetchFrequencyHours: 24 * 3, // Every 3 days
          priority: 3
        }
      },
      {
        type: 'nih',
        config: {
          name: 'NIH Policy Notices',
          description: 'National Institutes of Health policy notices related to executive orders',
          baseUrl: 'https://grants.nih.gov',
          fetchFrequencyHours: 24 * 3, // Every 3 days
          priority: 3
        }
      },
      {
        type: 'ace',
        config: {
          name: 'ACE Policy Briefs',
          description: 'American Council on Education policy briefs and analysis of executive orders',
          baseUrl: 'https://www.acenet.edu',
          fetchFrequencyHours: 24 * 7, // Weekly
          priority: 4
        }
      }
    ];
    
    // Register each source type
    for (const sourceType of sourceTypes) {
      try {
        const sourceId = await sourceManager.registerSource(sourceType.type, sourceType.config);
        setupLogger.info(`Registered source: ${sourceType.config.name} (${sourceId})`);
      } catch (sourceError) {
        setupLogger.warn(`Error registering source ${sourceType.type}: ${sourceError.message}`);
      }
    }
    
    // Get all registered sources
    const sources = await sourceManager.getAllSources(true);
    setupLogger.info(`Successfully registered ${sources.length} sources`);
    
    // Clean up
    await sourceManager.close();
    
    setupLogger.info('Source data management system setup complete');
    return {
      success: true,
      sourcesRegistered: sources.length
    };
  } catch (error) {
    setupLogger.error(`Error setting up source management: ${error.message}`, error);
    
    // Clean up
    try {
      await sourceManager.close();
    } catch (closeError) {
      setupLogger.error(`Error closing source manager: ${closeError.message}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// If this script is run directly, execute the setup function
if (require.main === module) {
  setupSourceManagement()
    .then(result => {
      console.log('Setup result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
} else {
  // Export for use in other modules
  module.exports = setupSourceManagement;
}