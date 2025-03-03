/**
 * task_queue.js
 * 
 * A simple task queue system for background processing of tasks.
 * Provides functionality for adding tasks, processing them in the background,
 * and monitoring the queue status.
 */

const fs = require('fs').promises;
const path = require('path');
const { ensureDirectoryExists } = require('./common');
const logger = require('./logger');

// Create a named logger
const queueLogger = logger.createNamedLogger('TaskQueue');

// Task status constants
const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying'
};

// Queue processor states
const QUEUE_STATUS = {
  IDLE: 'idle',
  PROCESSING: 'processing',
  PAUSED: 'paused',
  ERROR: 'error'
};

/**
 * Task Queue class
 * Manages a queue of tasks for background processing
 */
class TaskQueue {
  /**
   * Create a new task queue
   * @param {Object} options Queue options
   */
  constructor(options = {}) {
    this.options = {
      name: options.name || 'default',
      concurrency: options.concurrency || 1, // Number of tasks to process concurrently
      maxRetries: options.retries || 3, // Maximum number of retries for a task
      retryDelay: options.retryDelay || 5000, // Base delay between retries in ms
      persistPath: options.persistPath || path.join(process.cwd(), 'queue_state'),
      saveInterval: options.saveInterval || 10000, // How often to save queue state in ms
      throttleDelay: options.throttleDelay || 1000, // Delay between tasks in ms
      ...options
    };

    // Initialize queue state
    this.tasks = [];
    this.processingTasks = [];
    this.completedTasks = [];
    this.failedTasks = [];
    this.queueStatus = QUEUE_STATUS.IDLE;
    this.workers = [];
    this.activeWorkers = 0;
    this.saveTimer = null;
    this.persistPath = path.join(this.options.persistPath, `${this.options.name}_queue.json`);
    
    // Ensure the persist directory exists
    ensureDirectoryExists(this.options.persistPath);
    
    // Setup automatic queue state saving
    if (this.options.saveInterval > 0) {
      this.saveTimer = setInterval(() => this.saveQueueState(), this.options.saveInterval);
    }
    
    queueLogger.info(`Task queue "${this.options.name}" initialized with concurrency ${this.options.concurrency}`);
  }
  
  /**
   * Add a task to the queue
   * @param {string} type Task type identifier
   * @param {Object} data Task data
   * @param {Object} options Task options
   * @returns {string} Task ID
   */
  addTask(type, data, options = {}) {
    const taskId = options.id || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task = {
      id: taskId,
      type,
      data,
      status: TASK_STATUS.PENDING,
      priority: options.priority || 0, // Higher number = higher priority
      added: Date.now(),
      attempts: 0,
      maxRetries: options.maxRetries !== undefined ? options.maxRetries : this.options.maxRetries,
      lastAttempt: null,
      error: null,
      result: null,
      metadata: options.metadata || {}
    };
    
    // Add to the queue in priority order
    this.tasks.push(task);
    this.tasks.sort((a, b) => b.priority - a.priority);
    
    queueLogger.info(`Task ${taskId} (${type}) added to queue "${this.options.name}"`);
    
    // Start processing if the queue is idle
    if (this.queueStatus === QUEUE_STATUS.IDLE) {
      this.processQueue();
    }
    
    return taskId;
  }
  
  /**
   * Add multiple tasks to the queue
   * @param {Array<Object>} tasks Array of task definitions
   * @returns {Array<string>} Array of task IDs
   */
  addTasks(tasks) {
    const taskIds = [];
    
    for (const task of tasks) {
      const taskId = this.addTask(task.type, task.data, task.options || {});
      taskIds.push(taskId);
    }
    
    return taskIds;
  }
  
  /**
   * Process the task queue
   */
  async processQueue() {
    if (this.queueStatus === QUEUE_STATUS.PROCESSING) {
      // Already processing
      return;
    }
    
    if (this.tasks.length === 0) {
      // No tasks to process
      this.queueStatus = QUEUE_STATUS.IDLE;
      return;
    }
    
    this.queueStatus = QUEUE_STATUS.PROCESSING;
    queueLogger.info(`Started processing queue "${this.options.name}"`);
    
    // Start worker threads based on concurrency
    const workerCount = Math.min(this.options.concurrency, this.tasks.length);
    
    for (let i = 0; i < workerCount; i++) {
      // Each worker processes tasks until the queue is empty
      this.startWorker(i);
    }
  }
  
  /**
   * Start a worker to process tasks
   * @param {number} workerId Worker identifier
   */
  async startWorker(workerId) {
    queueLogger.debug(`Worker ${workerId} started in queue "${this.options.name}"`);
    this.activeWorkers++;
    
    try {
      // Process tasks until the queue is empty
      while (this.tasks.length > 0 && this.queueStatus === QUEUE_STATUS.PROCESSING) {
        // Get the next task
        const task = this.tasks.shift();
        task.status = TASK_STATUS.PROCESSING;
        task.attempts++;
        task.lastAttempt = Date.now();
        this.processingTasks.push(task);
        
        queueLogger.debug(`Worker ${workerId} processing task ${task.id} (${task.type})`);
        
        try {
          // Execute the task
          const result = await this.executeTask(task);
          
          // Task completed successfully
          task.status = TASK_STATUS.COMPLETED;
          task.result = result;
          task.completed = Date.now();
          
          // Move from processing to completed
          this.processingTasks = this.processingTasks.filter(t => t.id !== task.id);
          this.completedTasks.push(task);
          
          queueLogger.debug(`Worker ${workerId} completed task ${task.id} (${task.type})`);
          
          // Save queue state
          this.saveQueueState();
          
          // Throttle to prevent overwhelming resources
          if (this.options.throttleDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.options.throttleDelay));
          }
        } catch (error) {
          // Task failed
          task.error = {
            message: error.message,
            stack: error.stack,
            time: Date.now()
          };
          
          // Check if we should retry
          if (task.attempts <= task.maxRetries) {
            task.status = TASK_STATUS.RETRYING;
            
            // Calculate retry delay with exponential backoff
            const retryDelay = this.options.retryDelay * Math.pow(2, task.attempts - 1);
            const jitter = Math.floor(Math.random() * 1000); // Add jitter to prevent thundering herd
            const totalDelay = retryDelay + jitter;
            
            queueLogger.warn(`Worker ${workerId} will retry task ${task.id} in ${Math.round(totalDelay/1000)}s (attempt ${task.attempts}/${task.maxRetries})`);
            
            // Move back to pending with reduced priority after delay
            setTimeout(() => {
              // Only retry if queue is still active
              if (this.queueStatus === QUEUE_STATUS.PROCESSING || this.queueStatus === QUEUE_STATUS.IDLE) {
                this.processingTasks = this.processingTasks.filter(t => t.id !== task.id);
                this.tasks.push(task);
                this.tasks.sort((a, b) => b.priority - a.priority);
                
                // Restart queue processing if idle
                if (this.queueStatus === QUEUE_STATUS.IDLE) {
                  this.processQueue();
                }
              }
            }, totalDelay);
          } else {
            // Max retries exceeded
            task.status = TASK_STATUS.FAILED;
            task.failed = Date.now();
            
            // Move from processing to failed
            this.processingTasks = this.processingTasks.filter(t => t.id !== task.id);
            this.failedTasks.push(task);
            
            queueLogger.error(`Worker ${workerId} failed task ${task.id} after ${task.attempts} attempts: ${error.message}`);
            
            // Save queue state
            this.saveQueueState();
          }
        }
      }
    } catch (error) {
      queueLogger.error(`Worker ${workerId} encountered an error: ${error.message}`, error);
    } finally {
      this.activeWorkers--;
      queueLogger.debug(`Worker ${workerId} stopped in queue "${this.options.name}"`);
      
      // If all workers are done, set queue to idle
      if (this.activeWorkers === 0) {
        this.queueStatus = QUEUE_STATUS.IDLE;
        queueLogger.info(`Queue "${this.options.name}" is now idle`);
        
        // Final save of queue state
        this.saveQueueState();
      }
    }
  }
  
  /**
   * Execute a task
   * @param {Object} task Task object
   * @returns {Promise<any>} Task result
   */
  async executeTask(task) {
    // Check if a handler is registered for this task type
    if (!this.taskHandlers || !this.taskHandlers[task.type]) {
      throw new Error(`No handler registered for task type: ${task.type}`);
    }
    
    // Execute the handler
    return await this.taskHandlers[task.type](task.data, task);
  }
  
  /**
   * Register task handlers
   * @param {Object} handlers Map of task types to handler functions
   */
  registerHandlers(handlers) {
    this.taskHandlers = { ...this.taskHandlers, ...handlers };
    const types = Object.keys(handlers);
    queueLogger.info(`Registered handlers for task types: ${types.join(', ')}`);
  }
  
  /**
   * Pause the queue
   */
  pauseQueue() {
    if (this.queueStatus === QUEUE_STATUS.PROCESSING) {
      this.queueStatus = QUEUE_STATUS.PAUSED;
      queueLogger.info(`Queue "${this.options.name}" paused`);
    }
  }
  
  /**
   * Resume a paused queue
   */
  resumeQueue() {
    if (this.queueStatus === QUEUE_STATUS.PAUSED) {
      this.queueStatus = QUEUE_STATUS.IDLE;
      queueLogger.info(`Queue "${this.options.name}" resumed`);
      this.processQueue();
    }
  }
  
  /**
   * Get queue statistics
   * @returns {Object} Queue statistics
   */
  getStats() {
    return {
      name: this.options.name,
      status: this.queueStatus,
      pendingTasks: this.tasks.length,
      processingTasks: this.processingTasks.length,
      completedTasks: this.completedTasks.length,
      failedTasks: this.failedTasks.length,
      activeWorkers: this.activeWorkers,
      totalThroughput: this.completedTasks.length + this.failedTasks.length,
      concurrency: this.options.concurrency
    };
  }
  
  /**
   * Get detailed queue information
   * @returns {Object} Detailed queue information
   */
  getQueueDetails() {
    return {
      stats: this.getStats(),
      pending: this.tasks,
      processing: this.processingTasks,
      completed: this.completedTasks.slice(-100), // Limit to last 100
      failed: this.failedTasks.slice(-100) // Limit to last 100
    };
  }
  
  /**
   * Get a task by ID
   * @param {string} taskId Task ID
   * @returns {Object|null} Task object or null if not found
   */
  getTask(taskId) {
    // Search in all task lists
    const allTasks = [
      ...this.tasks,
      ...this.processingTasks,
      ...this.completedTasks,
      ...this.failedTasks
    ];
    
    return allTasks.find(task => task.id === taskId) || null;
  }
  
  /**
   * Save the current queue state to disk
   */
  async saveQueueState() {
    try {
      // Prepare queue state
      const queueState = {
        options: this.options,
        tasks: this.tasks,
        processingTasks: this.processingTasks,
        // Only save a limited number of completed/failed tasks
        completedTasks: this.completedTasks.slice(-100),
        failedTasks: this.failedTasks.slice(-100),
        savedAt: Date.now()
      };
      
      // Save to file
      await fs.writeFile(
        this.persistPath,
        JSON.stringify(queueState, null, 2),
        'utf8'
      );
      
      queueLogger.debug(`Queue state saved for "${this.options.name}"`);
    } catch (error) {
      queueLogger.error(`Failed to save queue state: ${error.message}`, error);
    }
  }
  
  /**
   * Load queue state from disk
   * @returns {Promise<boolean>} Whether the state was loaded successfully
   */
  async loadQueueState() {
    try {
      // Check if the state file exists
      try {
        await fs.access(this.persistPath);
      } catch (error) {
        // File doesn't exist yet
        queueLogger.info(`No saved state found for queue "${this.options.name}"`);
        return false;
      }
      
      // Read the state file
      const stateData = await fs.readFile(this.persistPath, 'utf8');
      const queueState = JSON.parse(stateData);
      
      // Restore queue state
      this.tasks = queueState.tasks || [];
      this.processingTasks = queueState.processingTasks || [];
      
      // Requeue processing tasks as they were interrupted
      for (const task of this.processingTasks) {
        task.status = TASK_STATUS.PENDING;
        this.tasks.push(task);
      }
      this.processingTasks = [];
      
      // Sort by priority
      this.tasks.sort((a, b) => b.priority - a.priority);
      
      // Restore completed and failed tasks
      this.completedTasks = queueState.completedTasks || [];
      this.failedTasks = queueState.failedTasks || [];
      
      queueLogger.info(
        `Loaded queue state for "${this.options.name}" with ${this.tasks.length} pending tasks`
      );
      
      return true;
    } catch (error) {
      queueLogger.error(`Failed to load queue state: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Clear all queue tasks and reset
   */
  clearQueue() {
    this.tasks = [];
    this.processingTasks = [];
    this.completedTasks = [];
    this.failedTasks = [];
    this.queueStatus = QUEUE_STATUS.IDLE;
    
    queueLogger.info(`Queue "${this.options.name}" cleared`);
    this.saveQueueState();
  }
  
  /**
   * Clean up resources used by the queue
   */
  cleanup() {
    // Stop the save timer
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    
    // Save one last time
    this.saveQueueState();
    
    queueLogger.info(`Queue "${this.options.name}" cleaned up`);
  }
}

module.exports = {
  TaskQueue,
  TASK_STATUS,
  QUEUE_STATUS
};