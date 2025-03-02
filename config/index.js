/**
 * config/index.js
 * 
 * Configuration loader for the Yale Executive Orders workflow system.
 * Loads the default configuration and applies any environment-specific overrides.
 */

const path = require('path');
const fs = require('fs');
const defaultConfig = require('./default');
const logger = require('../utils/logger');

// Environment variables
const ENV = process.env.NODE_ENV || 'development';

/**
 * Merges two configuration objects, with override taking precedence
 * @param {Object} base - Base configuration object
 * @param {Object} override - Override configuration object
 * @returns {Object} Merged configuration
 */
function mergeConfig(base, override) {
  const result = { ...base };
  
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && 
        typeof result[key] === 'object' && result[key] !== null) {
      // Recursively merge nested objects
      result[key] = mergeConfig(result[key], value);
    } else {
      // Override or add the value
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Loads configuration for the current environment
 * @returns {Object} Merged configuration object
 */
function loadConfig() {
  let config = { ...defaultConfig };
  
  // Check for environment-specific config
  const envConfigPath = path.join(__dirname, `${ENV}.js`);
  if (fs.existsSync(envConfigPath)) {
    try {
      const envConfig = require(envConfigPath);
      config = mergeConfig(config, envConfig);
      console.log(`Loaded environment configuration for: ${ENV}`);
    } catch (error) {
      console.error(`Error loading environment config for ${ENV}:`, error.message);
    }
  }
  
  // Apply environment variable overrides
  if (process.env.LOG_LEVEL) {
    config.logging.level = process.env.LOG_LEVEL;
  }
  
  if (process.env.DATABASE_PATH) {
    config.database.path = process.env.DATABASE_PATH;
  }
  
  return config;
}

// Load the configuration once when the module is imported
const config = loadConfig();

module.exports = config;