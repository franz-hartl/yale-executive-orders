/**
 * logger.js
 * 
 * Provides logging utilities for the Yale Executive Orders analysis jobs
 */

const fs = require('fs');
const path = require('path');

// Define log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Default log level
let currentLogLevel = LOG_LEVELS.INFO;

// Log file path
let logFilePath = null;

/**
 * Initialize the logger with configuration options
 * @param {Object} options Logger configuration options
 * @param {string} options.logLevel Log level (ERROR, WARN, INFO, DEBUG)
 * @param {string} options.logFile Path to log file (optional)
 */
function initLogger(options = {}) {
  // Set log level
  if (options.logLevel && LOG_LEVELS[options.logLevel] !== undefined) {
    currentLogLevel = LOG_LEVELS[options.logLevel];
  }
  
  // Set log file if provided
  if (options.logFile) {
    logFilePath = path.resolve(options.logFile);
    
    // Create log directory if it doesn't exist
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Write logger initialization message
    writeToLogFile(`Logger initialized at ${new Date().toISOString()}\n`);
  }
}

/**
 * Write a message to the log file if configured
 * @param {string} message Message to write
 */
function writeToLogFile(message) {
  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, message + '\n');
    } catch (error) {
      console.error(`Error writing to log file: ${error.message}`);
    }
  }
}

/**
 * Format a log message with timestamp and level
 * @param {string} level Log level
 * @param {string} message Log message
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Log an error message
 * @param {string} message Error message
 * @param {Error} error Error object (optional)
 */
function error(message, error = null) {
  if (currentLogLevel >= LOG_LEVELS.ERROR) {
    const formattedMessage = formatLogMessage('ERROR', message);
    console.error(formattedMessage);
    
    if (error) {
      console.error(error);
      writeToLogFile(`${formattedMessage}\n${error.stack}`);
    } else {
      writeToLogFile(formattedMessage);
    }
  }
}

/**
 * Log a warning message
 * @param {string} message Warning message
 */
function warn(message) {
  if (currentLogLevel >= LOG_LEVELS.WARN) {
    const formattedMessage = formatLogMessage('WARN', message);
    console.warn(formattedMessage);
    writeToLogFile(formattedMessage);
  }
}

/**
 * Log an info message
 * @param {string} message Info message
 */
function info(message) {
  if (currentLogLevel >= LOG_LEVELS.INFO) {
    const formattedMessage = formatLogMessage('INFO', message);
    console.log(formattedMessage);
    writeToLogFile(formattedMessage);
  }
}

/**
 * Log a debug message
 * @param {string} message Debug message
 */
function debug(message) {
  if (currentLogLevel >= LOG_LEVELS.DEBUG) {
    const formattedMessage = formatLogMessage('DEBUG', message);
    console.log(formattedMessage);
    writeToLogFile(formattedMessage);
  }
}

/**
 * Create a job-specific logger that prefixes messages with the job name
 * @param {string} jobName Name of the job
 * @returns {Object} Job-specific logger
 */
function createJobLogger(jobName) {
  return {
    error: (message, error = null) => error(
      `[${jobName}] ${message}`, 
      error
    ),
    warn: (message) => warn(`[${jobName}] ${message}`),
    info: (message) => info(`[${jobName}] ${message}`),
    debug: (message) => debug(`[${jobName}] ${message}`)
  };
}

module.exports = {
  initLogger,
  error,
  warn,
  info,
  debug,
  createJobLogger,
  LOG_LEVELS
};