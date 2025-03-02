/**
 * logging.js
 * 
 * Enhanced logging functionality for the Yale Executive Orders workflow.
 * Builds on the base logger to add workflow-specific logging features.
 */

const path = require('path');
const fs = require('fs');
const baseLogger = require('../utils/logger');
const config = require('../config');

// Create a log directory if it doesn't exist
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Initialize the base logger with our configuration
baseLogger.initLogger({
  logLevel: config.logging.level.toUpperCase(),
  logFile: config.logging.file
});

/**
 * Format a workflow event for logging
 * @param {string} step - The workflow step name
 * @param {string} event - The event description
 * @param {Object} data - Additional data to log (optional)
 * @returns {string} Formatted log message
 */
function formatWorkflowEvent(step, event, data = null) {
  let message = `[Workflow:${step}] ${event}`;
  
  // Add data details if provided and configuration is set to detailed
  if (data && config.logging.format === 'detailed') {
    // Format object data for better readability
    if (typeof data === 'object') {
      // Extract key info without logging entire objects
      const summary = Object.entries(data)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => {
          // Truncate long values
          if (typeof value === 'string' && value.length > 100) {
            return `${key}: "${value.substring(0, 97)}..."`;
          }
          // Handle nested objects
          if (typeof value === 'object' && value !== null) {
            return `${key}: [Object]`;
          }
          return `${key}: ${value}`;
        })
        .join(', ');
      
      message += ` (${summary})`;
    } else {
      message += ` (${data})`;
    }
  }
  
  return message;
}

/**
 * Log a workflow event at error level
 * @param {string} step - The workflow step name
 * @param {string} event - The event description
 * @param {Error|Object} error - Error object or data to log
 */
function workflowError(step, event, error = null) {
  baseLogger.error(formatWorkflowEvent(step, event), error);
}

/**
 * Log a workflow event at warning level
 * @param {string} step - The workflow step name
 * @param {string} event - The event description
 * @param {Object} data - Additional data to log (optional)
 */
function workflowWarn(step, event, data = null) {
  baseLogger.warn(formatWorkflowEvent(step, event, data));
}

/**
 * Log a workflow event at info level
 * @param {string} step - The workflow step name
 * @param {string} event - The event description
 * @param {Object} data - Additional data to log (optional)
 */
function workflowInfo(step, event, data = null) {
  baseLogger.info(formatWorkflowEvent(step, event, data));
}

/**
 * Log a workflow event at debug level
 * @param {string} step - The workflow step name
 * @param {string} event - The event description
 * @param {Object} data - Additional data to log (optional)
 */
function workflowDebug(step, event, data = null) {
  baseLogger.debug(formatWorkflowEvent(step, event, data));
}

/**
 * Create a workflow-specific logger for a particular step
 * @param {string} step - The workflow step name
 * @returns {Object} Step-specific logger object
 */
function createStepLogger(step) {
  return {
    error: (event, error = null) => workflowError(step, event, error),
    warn: (event, data = null) => workflowWarn(step, event, data),
    info: (event, data = null) => workflowInfo(step, event, data),
    debug: (event, data = null) => workflowDebug(step, event, data)
  };
}

/**
 * Log the start of a workflow run
 * @param {string} workflowName - Name of the workflow
 * @param {Object} parameters - Workflow parameters
 */
function logWorkflowStart(workflowName, parameters = {}) {
  const message = `Starting workflow: ${workflowName}`;
  baseLogger.info(`[Workflow] ${message}`, parameters);
}

/**
 * Log the completion of a workflow run
 * @param {string} workflowName - Name of the workflow
 * @param {boolean} success - Whether the workflow completed successfully
 * @param {Object} summary - Summary of workflow results
 */
function logWorkflowCompletion(workflowName, success, summary = {}) {
  const status = success ? 'completed successfully' : 'failed';
  const message = `Workflow ${workflowName} ${status}`;
  
  if (success) {
    baseLogger.info(`[Workflow] ${message}`, summary);
  } else {
    baseLogger.error(`[Workflow] ${message}`, summary);
  }
}

module.exports = {
  workflowError,
  workflowWarn,
  workflowInfo,
  workflowDebug,
  createStepLogger,
  logWorkflowStart,
  logWorkflowCompletion
};