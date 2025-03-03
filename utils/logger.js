/**
 * logger.js
 * 
 * Simple logging utility for the Yale Executive Orders project.
 * Provides consistent logging across the application.
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Current logging level (defaults to INFO)
 */
let currentLogLevel = LOG_LEVELS.INFO;

/**
 * Set the current log level
 * @param {string|number} level Log level to set
 */
function setLogLevel(level) {
  if (typeof level === 'string') {
    const upperLevel = level.toUpperCase();
    if (LOG_LEVELS[upperLevel] !== undefined) {
      currentLogLevel = LOG_LEVELS[upperLevel];
    } else {
      console.warn(`Unknown log level: ${level}, defaulting to INFO`);
      currentLogLevel = LOG_LEVELS.INFO;
    }
  } else if (typeof level === 'number') {
    if (level >= 0 && level <= 3) {
      currentLogLevel = level;
    } else {
      console.warn(`Invalid log level number: ${level}, defaulting to INFO`);
      currentLogLevel = LOG_LEVELS.INFO;
    }
  }
}

/**
 * Format log message with timestamp and category
 * @param {string} category Log category
 * @param {string} level Log level
 * @param {string} message Log message
 * @returns {string} Formatted log message
 */
function formatLogMessage(category, level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${category}] [${level}] ${message}`;
}

/**
 * Create a logger instance with specified category
 * @param {string} category Logger category
 * @returns {Object} Logger instance
 */
function createNamedLogger(category = 'YaleEO') {
  return {
    error(message, ...args) {
      if (currentLogLevel >= LOG_LEVELS.ERROR) {
        console.error(formatLogMessage(category, 'ERROR', message), ...args);
      }
    },
    
    warn(message, ...args) {
      if (currentLogLevel >= LOG_LEVELS.WARN) {
        console.warn(formatLogMessage(category, 'WARN', message), ...args);
      }
    },
    
    info(message, ...args) {
      if (currentLogLevel >= LOG_LEVELS.INFO) {
        console.info(formatLogMessage(category, 'INFO', message), ...args);
      }
    },
    
    debug(message, ...args) {
      if (currentLogLevel >= LOG_LEVELS.DEBUG) {
        console.debug(formatLogMessage(category, 'DEBUG', message), ...args);
      }
    }
  };
}

/**
 * Default logger instance
 */
const defaultLogger = createNamedLogger();

module.exports = {
  LOG_LEVELS,
  setLogLevel,
  createNamedLogger,
  error: defaultLogger.error,
  warn: defaultLogger.warn,
  info: defaultLogger.info,
  debug: defaultLogger.debug
};