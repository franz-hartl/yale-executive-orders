/**
 * queue_manager.js
 * 
 * Manages task queues for the Yale Executive Orders project.
 * Provides a central access point for queue operations and task handlers.
 */

const path = require('path');
const { TaskQueue } = require('./task_queue');
const { generateAnalysisWithClaude } = require('./analysis');
const { getDbConnection } = require('./db');
const logger = require('./logger');

// Create a named logger
const queueManagerLogger = logger.createJobLogger('QueueManager');

// Define queue types
const QUEUE_TYPES = {
  ANALYSIS: 'analysis',
  EXTRACTION: 'extraction',
  EXPORT: 'export'
};

// Define task types
const TASK_TYPES = {
  // Analysis tasks
  ANALYZE_ORDER: 'analyze_order',
  SUMMARIZE_ORDER: 'summarize_order',
  CATEGORIZE_ORDER: 'categorize_order',
  
  // Extraction tasks
  EXTRACT_DATES: 'extract_dates',
  EXTRACT_REQUIREMENTS: 'extract_requirements',
  EXTRACT_IMPACTS: 'extract_impacts',
  
  // Export tasks
  EXPORT_ORDER: 'export_order',
  EXPORT_COLLECTION: 'export_collection'
};

/**
 * Queue Manager class
 * Central manager for all task queues in the application
 */
class QueueManager {
  /**
   * Create a new queue manager
   */
  constructor() {
    this.queues = new Map();
    this.initialized = false;
    
    // Base configuration for all queues
    this.queueConfig = {
      persistPath: path.join(process.cwd(), 'queue_state'),
      saveInterval: 10000 // 10 seconds
    };
    
    queueManagerLogger.info('Queue Manager initialized');
  }
  
  /**
   * Initialize all queues
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    // Create analysis queue with appropriate concurrency and throttling
    const analysisQueue = new TaskQueue({
      name: QUEUE_TYPES.ANALYSIS,
      concurrency: 2, // Process 2 analysis tasks concurrently
      throttleDelay: 3000, // 3 second delay between tasks to avoid API rate limits
      retryDelay: 10000, // 10 second base delay for retries
      maxRetries: 3, // Retry failed tasks up to 3 times
      ...this.queueConfig
    });
    
    // Create extraction queue
    const extractionQueue = new TaskQueue({
      name: QUEUE_TYPES.EXTRACTION, 
      concurrency: 4, // Higher concurrency for extraction tasks
      throttleDelay: 500, // Lower delay between tasks
      ...this.queueConfig
    });
    
    // Create export queue
    const exportQueue = new TaskQueue({
      name: QUEUE_TYPES.EXPORT,
      concurrency: 5, // Higher concurrency for export tasks
      throttleDelay: 100, // Minimal delay for file operations
      ...this.queueConfig
    });
    
    // Register queues
    this.registerQueue(QUEUE_TYPES.ANALYSIS, analysisQueue);
    this.registerQueue(QUEUE_TYPES.EXTRACTION, extractionQueue);
    this.registerQueue(QUEUE_TYPES.EXPORT, exportQueue);
    
    // Register task handlers for each queue
    await this.registerTaskHandlers();
    
    // Load saved queue state
    await this.loadQueueStates();
    
    this.initialized = true;
    queueManagerLogger.info('All queues initialized and ready');
  }
  
  /**
   * Register a queue
   * @param {string} queueType Queue type identifier
   * @param {TaskQueue} queue TaskQueue instance
   */
  registerQueue(queueType, queue) {
    this.queues.set(queueType, queue);
    queueManagerLogger.info(`Registered queue: ${queueType}`);
  }
  
  /**
   * Get a queue by type
   * @param {string} queueType Queue type identifier
   * @returns {TaskQueue} TaskQueue instance
   */
  getQueue(queueType) {
    const queue = this.queues.get(queueType);
    if (!queue) {
      throw new Error(`Queue not found: ${queueType}`);
    }
    return queue;
  }
  
  /**
   * Register task handlers for each queue
   */
  async registerTaskHandlers() {
    // Register analysis task handlers
    const analysisQueue = this.getQueue(QUEUE_TYPES.ANALYSIS);
    analysisQueue.registerHandlers({
      [TASK_TYPES.ANALYZE_ORDER]: this.handleAnalyzeOrder.bind(this),
      [TASK_TYPES.SUMMARIZE_ORDER]: this.handleSummarizeOrder.bind(this),
      [TASK_TYPES.CATEGORIZE_ORDER]: this.handleCategorizeOrder.bind(this)
    });
    
    // Register extraction task handlers
    const extractionQueue = this.getQueue(QUEUE_TYPES.EXTRACTION);
    extractionQueue.registerHandlers({
      [TASK_TYPES.EXTRACT_DATES]: this.handleExtractDates.bind(this),
      [TASK_TYPES.EXTRACT_REQUIREMENTS]: this.handleExtractRequirements.bind(this),
      [TASK_TYPES.EXTRACT_IMPACTS]: this.handleExtractImpacts.bind(this)
    });
    
    // Register export task handlers
    const exportQueue = this.getQueue(QUEUE_TYPES.EXPORT);
    exportQueue.registerHandlers({
      [TASK_TYPES.EXPORT_ORDER]: this.handleExportOrder.bind(this),
      [TASK_TYPES.EXPORT_COLLECTION]: this.handleExportCollection.bind(this)
    });
  }
  
  /**
   * Load saved queue states
   */
  async loadQueueStates() {
    for (const [queueType, queue] of this.queues.entries()) {
      const success = await queue.loadQueueState();
      if (success) {
        queueManagerLogger.info(`Loaded saved state for queue: ${queueType}`);
        
        // Start processing if there are pending tasks
        if (queue.tasks.length > 0) {
          queue.processQueue();
        }
      }
    }
  }
  
  /**
   * Save all queue states
   */
  async saveQueueStates() {
    for (const [queueType, queue] of this.queues.entries()) {
      await queue.saveQueueState();
    }
    queueManagerLogger.info('Saved all queue states');
  }
  
  /**
   * Clean up all queues
   */
  cleanup() {
    for (const [queueType, queue] of this.queues.entries()) {
      queue.cleanup();
    }
    queueManagerLogger.info('All queues cleaned up');
  }
  
  /**
   * Add an order analysis task to the queue
   * @param {Object} order Executive order to analyze
   * @param {Object} options Task options
   * @returns {string} Task ID
   */
  queueOrderAnalysis(order, options = {}) {
    if (!this.initialized) {
      throw new Error('Queue manager not initialized');
    }
    
    const analysisQueue = this.getQueue(QUEUE_TYPES.ANALYSIS);
    
    return analysisQueue.addTask(TASK_TYPES.ANALYZE_ORDER, {
      orderId: order.id,
      orderNumber: order.order_number,
      title: order.title,
      fullText: order.full_text,
      signingDate: order.signing_date,
      president: order.president
    }, options);
  }
  
  /**
   * Queue multiple orders for analysis
   * @param {Array<Object>} orders Array of executive orders to analyze
   * @param {Object} options Task options
   * @returns {Array<string>} Array of task IDs
   */
  queueBatchAnalysis(orders, options = {}) {
    if (!this.initialized) {
      throw new Error('Queue manager not initialized');
    }
    
    const tasks = orders.map(order => ({
      type: TASK_TYPES.ANALYZE_ORDER,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        title: order.title,
        fullText: order.full_text,
        signingDate: order.signing_date,
        president: order.president
      },
      options: {
        ...options,
        // Set metadata for tracking
        metadata: {
          batchId: options.batchId || `batch_${Date.now()}`,
          batchSize: orders.length
        }
      }
    }));
    
    const analysisQueue = this.getQueue(QUEUE_TYPES.ANALYSIS);
    const taskIds = analysisQueue.addTasks(tasks);
    
    queueManagerLogger.info(`Queued ${taskIds.length} orders for analysis in batch`);
    return taskIds;
  }
  
  /**
   * Get statistics for all queues
   * @returns {Object} Queue statistics
   */
  getQueueStats() {
    const stats = {};
    
    for (const [queueType, queue] of this.queues.entries()) {
      stats[queueType] = queue.getStats();
    }
    
    return stats;
  }
  
  // ============================================================================
  // Task handlers
  // ============================================================================
  
  /**
   * Handle analyze order task
   * @param {Object} data Task data
   * @param {Object} task Task object
   * @returns {Promise<Object>} Analysis results
   */
  async handleAnalyzeOrder(data, task) {
    const db = getDbConnection();
    
    try {
      queueManagerLogger.info(`Analyzing order ${data.orderNumber} - ${data.title}`);
      
      // Create an order object with the necessary fields
      const order = {
        id: data.orderId,
        order_number: data.orderNumber,
        title: data.title,
        full_text: data.fullText,
        signing_date: data.signingDate,
        president: data.president
      };
      
      // Generate analysis
      const analysis = await generateAnalysisWithClaude(order);
      
      // Update order in database (would be implemented here)
      // await updateOrderWithAnalysis(db, order.id, analysis);
      
      queueManagerLogger.info(`Successfully analyzed order ${data.orderNumber}`);
      
      // Return the analysis as the task result
      return {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        analysis
      };
    } catch (error) {
      queueManagerLogger.error(`Error analyzing order ${data.orderNumber}: ${error.message}`, error);
      throw error; // Rethrow to be handled by the task queue
    }
  }
  
  /**
   * Handle summarize order task
   * @param {Object} data Task data
   * @param {Object} task Task object
   * @returns {Promise<Object>} Summary results
   */
  async handleSummarizeOrder(data, task) {
    try {
      queueManagerLogger.info(`Summarizing order ${data.orderNumber} - ${data.title}`);
      
      // Summarize order (placeholder implementation)
      const summary = "Placeholder summary - would use AI or template-based summary";
      
      queueManagerLogger.info(`Successfully summarized order ${data.orderNumber}`);
      
      return {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        summary
      };
    } catch (error) {
      queueManagerLogger.error(`Error summarizing order ${data.orderNumber}: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle categorize order task
   * @param {Object} data Task data
   * @param {Object} task Task object
   * @returns {Promise<Object>} Categorization results
   */
  async handleCategorizeOrder(data, task) {
    try {
      queueManagerLogger.info(`Categorizing order ${data.orderNumber} - ${data.title}`);
      
      // Categorize order (placeholder implementation)
      const categories = ['placeholder', 'categories'];
      
      queueManagerLogger.info(`Successfully categorized order ${data.orderNumber}`);
      
      return {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        categories
      };
    } catch (error) {
      queueManagerLogger.error(`Error categorizing order ${data.orderNumber}: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle extract dates task
   * @param {Object} data Task data
   * @param {Object} task Task object
   * @returns {Promise<Object>} Extraction results
   */
  async handleExtractDates(data, task) {
    try {
      queueManagerLogger.info(`Extracting dates from order ${data.orderNumber}`);
      
      // Extract dates (placeholder implementation)
      const dates = ['2023-01-01', '2023-12-31'];
      
      return {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        dates
      };
    } catch (error) {
      queueManagerLogger.error(`Error extracting dates: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle extract requirements task
   * @param {Object} data Task data
   * @param {Object} task Task object
   * @returns {Promise<Object>} Extraction results
   */
  async handleExtractRequirements(data, task) {
    try {
      queueManagerLogger.info(`Extracting requirements from order ${data.orderNumber}`);
      
      // Extract requirements (placeholder implementation)
      const requirements = ['requirement 1', 'requirement 2'];
      
      return {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        requirements
      };
    } catch (error) {
      queueManagerLogger.error(`Error extracting requirements: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle extract impacts task
   * @param {Object} data Task data
   * @param {Object} task Task object
   * @returns {Promise<Object>} Extraction results
   */
  async handleExtractImpacts(data, task) {
    try {
      queueManagerLogger.info(`Extracting impacts from order ${data.orderNumber}`);
      
      // Extract impacts (placeholder implementation)
      const impacts = ['impact 1', 'impact 2'];
      
      return {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        impacts
      };
    } catch (error) {
      queueManagerLogger.error(`Error extracting impacts: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle export order task
   * @param {Object} data Task data
   * @param {Object} task Task object
   * @returns {Promise<Object>} Export results
   */
  async handleExportOrder(data, task) {
    try {
      queueManagerLogger.info(`Exporting order ${data.orderNumber}`);
      
      // Export order (placeholder implementation)
      const exportPath = `./public/data/orders/${data.orderNumber}.json`;
      
      return {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        exportPath
      };
    } catch (error) {
      queueManagerLogger.error(`Error exporting order: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle export collection task
   * @param {Object} data Task data
   * @param {Object} task Task object
   * @returns {Promise<Object>} Export results
   */
  async handleExportCollection(data, task) {
    try {
      queueManagerLogger.info(`Exporting collection: ${data.collectionName}`);
      
      // Export collection (placeholder implementation)
      const exportPath = `./public/data/${data.collectionName}.json`;
      
      return {
        collectionName: data.collectionName,
        exportPath
      };
    } catch (error) {
      queueManagerLogger.error(`Error exporting collection: ${error.message}`, error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const queueManager = new QueueManager();
module.exports = queueManager;