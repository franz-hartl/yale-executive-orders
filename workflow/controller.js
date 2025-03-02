/**
 * controller.js
 * 
 * Main workflow controller for the Yale Executive Orders project.
 * Manages workflow execution, state tracking, and error handling.
 */

const fs = require('fs').promises;
const path = require('path');
const { getPipeline } = require('./pipeline');
const { logWorkflowStart, logWorkflowCompletion } = require('./logging');
const config = require('../config');

/**
 * Workflow Controller class
 * Manages the execution of workflow pipelines
 */
class WorkflowController {
  /**
   * Create a new workflow controller
   * @param {Object} options - Controller options
   */
  constructor(options = {}) {
    this.options = {
      saveStateEnabled: true,
      stateFile: './workflow-state.json',
      ...options
    };
    
    this.workflowName = options.name || 'standard';
    this.pipeline = getPipeline(this.workflowName);
    this.context = { 
      startTime: new Date().toISOString(),
      config: this.filterSensitiveConfig(config)
    };
    this.state = {
      running: false,
      completed: false,
      steps: {},
      lastRun: null,
      currentStep: null,
      errors: []
    };
  }
  
  /**
   * Filter out sensitive information from config for logging
   * @param {Object} config - Full configuration object
   * @returns {Object} Filtered configuration object
   */
  filterSensitiveConfig(config) {
    // Create a shallow copy of the config
    const filtered = { ...config };
    
    // Remove API keys and sensitive information
    if (filtered.analysis && filtered.analysis.claude) {
      delete filtered.analysis.claude.apiKey;
    }
    
    return filtered;
  }
  
  /**
   * Initialize the workflow
   * @returns {Promise<void>}
   */
  async initialize() {
    // Initialize pipeline steps in the state
    for (const step of this.pipeline) {
      this.state.steps[step.name] = {
        name: step.name,
        required: step.required,
        status: 'pending',
        startTime: null,
        endTime: null,
        duration: null
      };
    }
    
    // Try to load previous state if requested
    if (this.options.loadStateEnabled) {
      await this.loadState();
    }
  }
  
  /**
   * Load workflow state from a file
   * @returns {Promise<boolean>} Whether state was successfully loaded
   */
  async loadState() {
    try {
      const data = await fs.readFile(this.options.stateFile, 'utf8');
      const savedState = JSON.parse(data);
      this.state = { ...this.state, ...savedState };
      return true;
    } catch (error) {
      // It's okay if the state file doesn't exist yet
      return false;
    }
  }
  
  /**
   * Save workflow state to a file
   * @returns {Promise<void>}
   */
  async saveState() {
    if (!this.options.saveStateEnabled) return;
    
    try {
      const stateDir = path.dirname(this.options.stateFile);
      
      // Create directory if it doesn't exist
      try {
        await fs.mkdir(stateDir, { recursive: true });
      } catch (error) {
        // Ignore if directory already exists
      }
      
      // Save state to file
      await fs.writeFile(
        this.options.stateFile,
        JSON.stringify(this.state, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save workflow state:', error);
    }
  }
  
  /**
   * Execute the workflow pipeline
   * @returns {Promise<Object>} Workflow results
   */
  async execute() {
    if (this.state.running) {
      throw new Error('Workflow is already running');
    }
    
    this.state.running = true;
    this.state.completed = false;
    this.state.errors = [];
    this.state.lastRun = new Date().toISOString();
    
    logWorkflowStart(this.workflowName, this.options);
    
    try {
      // Run each pipeline step in sequence
      for (const step of this.pipeline) {
        this.state.currentStep = step.name;
        await this.executeStep(step);
      }
      
      this.state.completed = true;
      this.state.running = false;
      
      // Calculate overall duration
      const startTime = new Date(this.context.startTime);
      const endTime = new Date();
      const duration = endTime - startTime;
      
      // Add completion information to context
      this.context.completed = true;
      this.context.success = true;
      this.context.endTime = endTime.toISOString();
      this.context.duration = duration;
      
      // Log successful completion
      logWorkflowCompletion(this.workflowName, true, {
        duration: `${Math.round(duration / 1000)}s`,
        steps: Object.keys(this.state.steps).length
      });
      
      // Save final state
      await this.saveState();
      
      return {
        success: true,
        context: this.context
      };
    } catch (error) {
      this.state.completed = false;
      this.state.running = false;
      this.state.errors.push({
        step: this.state.currentStep,
        message: error.message,
        timestamp: new Date().toISOString()
      });
      
      // Calculate duration up to error
      const startTime = new Date(this.context.startTime);
      const endTime = new Date();
      const duration = endTime - startTime;
      
      // Add error information to context
      this.context.completed = false;
      this.context.success = false;
      this.context.error = error.message;
      this.context.endTime = endTime.toISOString();
      this.context.duration = duration;
      
      // Log workflow failure
      logWorkflowCompletion(this.workflowName, false, {
        duration: `${Math.round(duration / 1000)}s`,
        error: error.message,
        step: this.state.currentStep
      });
      
      // Save error state
      await this.saveState();
      
      return {
        success: false,
        error: error.message,
        context: this.context
      };
    }
  }
  
  /**
   * Execute a single workflow step
   * @param {Object} step - Pipeline step to execute
   * @returns {Promise<void>}
   */
  async executeStep(step) {
    const stepState = this.state.steps[step.name];
    stepState.status = 'running';
    stepState.startTime = new Date().toISOString();
    
    try {
      // Execute the step
      this.context = await step.execute(this.context);
      
      // Update step state
      stepState.status = 'completed';
      stepState.endTime = new Date().toISOString();
      stepState.duration = new Date(stepState.endTime) - new Date(stepState.startTime);
      
      // Save state after each step
      await this.saveState();
    } catch (error) {
      // Update step state with error
      stepState.status = 'failed';
      stepState.endTime = new Date().toISOString();
      stepState.duration = new Date(stepState.endTime) - new Date(stepState.startTime);
      stepState.error = error.message;
      
      // Try to save state even after error
      await this.saveState();
      
      // If the step is required, propagate the error
      if (step.required) {
        throw error;
      }
    }
  }
  
  /**
   * Get the current workflow state
   * @returns {Object} Workflow state
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Get a summary of the workflow execution
   * @returns {Object} Workflow summary
   */
  getSummary() {
    // Create step summaries
    const steps = Object.entries(this.state.steps).map(([name, state]) => {
      let duration = null;
      if (state.startTime && state.endTime) {
        duration = new Date(state.endTime) - new Date(state.startTime);
      }
      
      return {
        name,
        status: state.status,
        required: state.required,
        duration: duration ? `${Math.round(duration / 1000)}s` : null
      };
    });
    
    // Calculate overall statistics
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const failedSteps = steps.filter(s => s.status === 'failed').length;
    
    return {
      name: this.workflowName,
      completed: this.state.completed,
      lastRun: this.state.lastRun,
      steps: {
        total: steps.length,
        completed: completedSteps,
        failed: failedSteps,
        pending: steps.length - completedSteps - failedSteps
      },
      stepSummaries: steps,
      errors: this.state.errors
    };
  }
}

module.exports = WorkflowController;