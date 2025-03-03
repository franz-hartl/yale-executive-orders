/**
 * pipeline.js
 * 
 * Defines the workflow pipeline for the Yale Executive Orders project.
 * Each pipeline step is a modular unit that can be configured and executed
 * within the workflow controller.
 */

const fs = require('fs').promises;
const path = require('path');
const { createStepLogger } = require('./logging');
const config = require('../config');

/**
 * Base class for all pipeline steps
 * Each step defines its own execution logic and error handling
 */
class PipelineStep {
  /**
   * Create a new pipeline step
   * @param {string} name - Step name
   * @param {Object} options - Step options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = { ...options };
    this.logger = createStepLogger(name);
    this.required = options.required !== false;
    this.retry = options.retry || 0;
    this.retryDelay = options.retryDelay || config.workflow.retryDelay;
  }
  
  /**
   * Execute the pipeline step
   * @param {Object} context - Pipeline context data
   * @returns {Promise<Object>} Updated pipeline context
   */
  async execute(context) {
    throw new Error('Pipeline steps must implement execute()');
  }
  
  /**
   * Get the step status for reporting
   * @returns {Object} Step status object
   */
  getStatus() {
    return {
      name: this.name,
      required: this.required,
      completed: false
    };
  }
  
  /**
   * Sleep for a specified number of milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Fetch data from external sources
 */
class FetchStep extends PipelineStep {
  constructor(options = {}) {
    super('fetch', options);
  }
  
  async execute(context) {
    try {
      this.logger.info('Starting external data fetch');
      
      // Determine which source files to use based on configuration
      const sourcesToFetch = [];
      
      // Add enabled sources to the fetch list
      if (config.sources.federalRegister.enabled) {
        sourcesToFetch.push('federalRegister');
      }
      
      if (config.sources.cogr.enabled) {
        sourcesToFetch.push('cogr');
      }
      
      if (config.sources.nsf.enabled) {
        sourcesToFetch.push('nsf');
      }
      
      if (config.sources.nih.enabled) {
        sourcesToFetch.push('nih');
      }
      
      if (config.sources.ace.enabled) {
        sourcesToFetch.push('ace');
      }
      
      this.logger.info(`Will fetch from sources: ${sourcesToFetch.join(', ')}`);
      
      // Execute the fetch process using the appropriate scripts
      // This is a simplified version - in reality, we would call the actual fetch scripts
      const fetchResults = {
        federalRegister: { success: true, count: 0 },
        cogr: { success: true, count: 0 },
        nsf: { success: true, count: 0 },
        nih: { success: true, count: 0 },
        ace: { success: true, count: 0 }
      };
      
      for (const source of sourcesToFetch) {
        try {
          this.logger.info(`Fetching from ${source}`);
          
          // Example of how we would call the actual fetch scripts
          /* 
          const script = require(`../fetch_${source.toLowerCase()}_orders.js`);
          const result = await script.fetch();
          fetchResults[source] = result;
          */
          
          // For now, just simulate the fetch
          await this.sleep(500); // Simulate API call time
          fetchResults[source].count = Math.floor(Math.random() * 5); // Simulate 0-4 new orders
          
          this.logger.info(`Fetched ${fetchResults[source].count} orders from ${source}`);
        } catch (error) {
          this.logger.error(`Error fetching from ${source}`, error);
          fetchResults[source].success = false;
          fetchResults[source].error = error.message;
        }
      }
      
      // Update context with fetch results
      return {
        ...context,
        fetchResults,
        fetchedSources: sourcesToFetch,
        fetchTimestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Fetch step failed', error);
      throw error;
    }
  }
}

/**
 * Process and store fetched data in the database
 */
class ProcessStep extends PipelineStep {
  constructor(options = {}) {
    super('process', options);
  }
  
  async execute(context) {
    try {
      this.logger.info('Starting data processing');
      
      // Count total fetched orders
      const totalFetchedOrders = Object.values(context.fetchResults || {})
        .reduce((total, source) => total + (source.count || 0), 0);
      
      this.logger.info(`Processing ${totalFetchedOrders} fetched orders`);
      
      // In reality, we would call the database setup script
      /* 
      const Database = require('../utils/database');
      const db = new Database();
      await db.connect();
      await db.createTables();
      await db.initializeReferenceData();
      */
      
      // Simulate database operations
      await this.sleep(1000); // Simulate database processing time
      
      // Update context with processing results
      return {
        ...context,
        processResults: {
          success: true,
          totalProcessed: totalFetchedOrders,
          newOrders: totalFetchedOrders,
          updatedOrders: 0
        },
        processTimestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Process step failed', error);
      throw error;
    }
  }
}

/**
 * Analyze executive orders and generate summaries
 */
class AnalyzeStep extends PipelineStep {
  constructor(options = {}) {
    super('analyze', options);
  }
  
  async execute(context) {
    try {
      this.logger.info('Starting analysis generation');
      
      // Determine whether to use queued processing based on order count
      const newOrders = context.processResults?.newOrders || 0;
      this.logger.info(`Generating analysis for ${newOrders} new orders`);
      
      // Use the task queue system for larger batches, direct processing for smaller ones
      if (newOrders > 5) {
        this.logger.info(`Using task queue for ${newOrders} orders`);
        return await this.executeWithTaskQueue(context);
      } else {
        this.logger.info(`Using direct processing for ${newOrders} orders`);
        return await this.executeDirectly(context);
      }
    } catch (error) {
      this.logger.error('Analysis step failed', error);
      throw error;
    }
  }
  
  /**
   * Execute analysis using the task queue system
   * @param {Object} context Pipeline context
   * @returns {Object} Updated context
   */
  async executeWithTaskQueue(context) {
    // Load the queue manager
    const queueManager = require('../utils/queue_manager');
    await queueManager.initialize();
    
    // Get orders from the database that need analysis
    const db = require('../utils/db').getDbConnection();
    const ordersToAnalyze = await db.all(`
      SELECT id, order_number, title, signing_date, publication_date, president, full_text
      FROM executive_orders 
      WHERE impact_level IS NULL OR impact_level = ''
      ORDER BY signing_date DESC
    `);
    
    this.logger.info(`Found ${ordersToAnalyze.length} orders to analyze in the database`);
    
    if (ordersToAnalyze.length === 0) {
      return {
        ...context,
        analysisResults: {
          success: true,
          ordersAnalyzed: 0,
          summaryTypes: config.analysis.summaryTypes,
          tokensUsed: 0
        },
        analysisTimestamp: new Date().toISOString()
      };
    }
    
    // Queue the orders in batches of 10
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < ordersToAnalyze.length; i += batchSize) {
      batches.push(ordersToAnalyze.slice(i, i + batchSize));
    }
    
    this.logger.info(`Split into ${batches.length} batches of up to ${batchSize} orders each`);
    
    // Create a unique batch ID for this analysis run
    const analysisRunId = `pipeline_${Date.now()}`;
    
    // Queue each batch
    let totalTasksQueued = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchId = `${analysisRunId}_${i}`;
      
      const taskIds = queueManager.queueBatchAnalysis(batch, {
        batchId,
        priority: batches.length - i // Higher priority for earlier batches
      });
      
      totalTasksQueued += taskIds.length;
      this.logger.info(`Queued batch ${i+1} with ${taskIds.length} tasks`);
      
      // Short delay between batches to prevent potential contention
      if (i < batches.length - 1) {
        await this.sleep(500);
      }
    }
    
    this.logger.info(`Successfully queued ${totalTasksQueued} orders for analysis`);
    
    // The tasks will be processed in the background, so we don't wait for them to complete
    // Instead, we return the context with information about the queued tasks
    
    return {
      ...context,
      analysisResults: {
        success: true,
        ordersAnalyzed: 0, // We don't know yet how many will succeed
        ordersQueued: totalTasksQueued,
        queuedAnalysisRunId: analysisRunId,
        summaryTypes: config.analysis.summaryTypes,
        backgroundProcessing: true
      },
      analysisTimestamp: new Date().toISOString()
    };
  }
  
  /**
   * Execute analysis directly without task queue
   * @param {Object} context Pipeline context
   * @returns {Object} Updated context
   */
  async executeDirectly(context) {
    // Load analysis utilities
    const { generateAnalysisWithClaude } = require('../utils/analysis');
    
    // Get orders from the database that need analysis
    const db = require('../utils/db').getDbConnection();
    const ordersToAnalyze = await db.all(`
      SELECT id, order_number, title, signing_date, publication_date, president, full_text
      FROM executive_orders 
      WHERE impact_level IS NULL OR impact_level = ''
      ORDER BY signing_date DESC
      LIMIT 5
    `);
    
    this.logger.info(`Found ${ordersToAnalyze.length} orders to analyze directly`);
    
    if (ordersToAnalyze.length === 0) {
      return {
        ...context,
        analysisResults: {
          success: true,
          ordersAnalyzed: 0,
          summaryTypes: config.analysis.summaryTypes,
          tokensUsed: 0
        },
        analysisTimestamp: new Date().toISOString()
      };
    }
    
    // Process each order directly
    let successCount = 0;
    let totalTokens = 0;
    
    for (const order of ordersToAnalyze) {
      try {
        this.logger.info(`Analyzing order ${order.order_number} - ${order.title}`);
        
        // Generate analysis
        const analysis = await generateAnalysisWithClaude(order);
        
        // Update order in database (would use a real implementation)
        // await updateOrderWithAnalysis(db, order.id, analysis);
        
        successCount++;
        totalTokens += 12500; // Approximate token usage
        
        this.logger.info(`Successfully analyzed order ${order.order_number}`);
      } catch (error) {
        this.logger.error(`Error analyzing order ${order.order_number}: ${error.message}`, error);
      }
    }
    
    return {
      ...context,
      analysisResults: {
        success: true,
        ordersAnalyzed: successCount,
        summaryTypes: config.analysis.summaryTypes,
        tokensUsed: totalTokens,
        backgroundProcessing: false
      },
      analysisTimestamp: new Date().toISOString()
    };
  }
}

/**
 * Export data to JSON files for the static website
 */
class ExportStep extends PipelineStep {
  constructor(options = {}) {
    super('export', options);
  }
  
  async execute(context) {
    try {
      this.logger.info('Starting data export');
      
      // In reality, we would call the export_to_json.js script
      /* 
      const exportToJson = require('../export_to_json');
      const result = await exportToJson.exportAll();
      */
      
      // Simulate export process
      this.logger.info(`Exporting data to ${config.export.paths.jsonOutput}`);
      
      // Simulate file operations
      await this.sleep(500);
      
      const exportedFiles = [];
      
      // Log each file we would export
      for (const file of config.export.files) {
        this.logger.debug(`Would export: ${file}`);
        exportedFiles.push(file);
      }
      
      // Update context with export results
      return {
        ...context,
        exportResults: {
          success: true,
          exportedFiles,
          outputPath: config.export.paths.jsonOutput
        },
        exportTimestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Export step failed', error);
      throw error;
    }
  }
}

/**
 * Optional deploy step to copy files to the GitHub Pages directory
 */
class DeployStep extends PipelineStep {
  constructor(options = {}) {
    super('deploy', { required: false, ...options });
  }
  
  async execute(context) {
    try {
      this.logger.info('Starting deployment to docs folder');
      
      // In reality, we would copy files from public/data to docs/data
      this.logger.info(`Copying data from ${config.export.paths.jsonOutput} to ${config.export.paths.siteOutput}`);
      
      // Simulate file operations
      await this.sleep(500);
      
      // Update context with deploy results
      return {
        ...context,
        deployResults: {
          success: true,
          deployedFiles: context.exportResults?.exportedFiles || [],
          deployPath: config.export.paths.siteOutput
        },
        deployTimestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Deploy step failed', error);
      throw error;
    }
  }
}

/**
 * Pipeline definition with standard steps
 */
const standardPipeline = [
  new FetchStep(),
  new ProcessStep(),
  new AnalyzeStep(),
  new ExportStep(),
  new DeployStep({ required: false })
];

/**
 * Minimal pipeline with only essential steps
 */
const minimalPipeline = [
  new FetchStep(),
  new ProcessStep(),
  new ExportStep()
];

/**
 * Get pipeline steps based on configuration or name
 * @param {string} pipelineName - Name of the predefined pipeline
 * @returns {Array} Pipeline steps
 */
function getPipeline(pipelineName = 'standard') {
  switch (pipelineName.toLowerCase()) {
    case 'minimal':
      return minimalPipeline;
    case 'standard':
    default:
      return standardPipeline;
  }
}

module.exports = {
  PipelineStep,
  FetchStep,
  ProcessStep,
  AnalyzeStep,
  ExportStep,
  DeployStep,
  getPipeline
};