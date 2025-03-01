/**
 * common.js
 * 
 * Common utility functions shared across the Yale Executive Orders project.
 * These utilities handle generic operations like date manipulation, string processing,
 * file operations, and other helpers that are not specific to a single domain.
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Creates a promise that resolves after a specified number of milliseconds
 * @param {number} ms Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the specified time
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determines the U.S. president based on an executive order's dates
 * @param {Object} order Executive order object with dates
 * @returns {string} President's name
 */
function determinePresident(order) {
  // If the president name is already available, use it
  if (order.president && typeof order.president === 'string' && order.president !== 'Unknown') {
    return order.president;
  }
  
  if (order.president?.name) {
    return order.president.name;
  }
  
  // Use publication date and signing date to determine the president
  const pubDate = order.publication_date ? new Date(order.publication_date) : null;
  const signingDate = order.signing_date ? new Date(order.signing_date) : null;
  
  // Use the earlier of the two dates if both are available
  const orderDate = signingDate || pubDate;
  
  // If no date is available, return unknown
  if (!orderDate) {
    return "Unknown";
  }
  
  // Define presidential terms
  const presidentialTerms = [
    { name: "Trump", start: new Date('2025-01-20') },
    { name: "Biden", start: new Date('2021-01-20') },
    { name: "Trump", start: new Date('2017-01-20') },
    { name: "Obama", start: new Date('2009-01-20') },
    { name: "Bush", start: new Date('2001-01-20') },
    { name: "Clinton", start: new Date('1993-01-20') },
    { name: "Bush", start: new Date('1989-01-20') },
    { name: "Reagan", start: new Date('1981-01-20') },
    { name: "Carter", start: new Date('1977-01-20') },
    { name: "Ford", start: new Date('1974-08-09') },
    { name: "Nixon", start: new Date('1969-01-20') }
  ];
  
  // Find the first term that started before the order date
  for (let i = 0; i < presidentialTerms.length; i++) {
    if (orderDate >= presidentialTerms[i].start) {
      return presidentialTerms[i].name;
    }
  }
  
  return "Unknown";
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param {string} dirPath Path to directory
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.debug(`Created directory: ${dirPath}`);
  }
}

/**
 * Writes data to a JSON file
 * @param {string} filePath Path to file
 * @param {Object|Array} data Data to write
 * @param {boolean} pretty Whether to format the JSON with indentation
 */
function writeJsonFile(filePath, data, pretty = true) {
  try {
    const dirPath = path.dirname(filePath);
    ensureDirectoryExists(dirPath);
    
    const jsonString = pretty 
      ? JSON.stringify(data, null, 2) 
      : JSON.stringify(data);
    
    fs.writeFileSync(filePath, jsonString, 'utf8');
    logger.debug(`Wrote JSON file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write JSON file ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Reads and parses a JSON file
 * @param {string} filePath Path to file
 * @returns {Object|Array} Parsed JSON data
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      logger.warn(`JSON file does not exist: ${filePath}`);
      return null;
    }
    
    const jsonString = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(jsonString);
  } catch (error) {
    logger.error(`Failed to read JSON file ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Writes data to a CSV file
 * @param {string} filePath Path to file
 * @param {Array} headers Array of column headers
 * @param {Array} records Array of data records
 */
function writeCsvFile(filePath, headers, records) {
  try {
    const dirPath = path.dirname(filePath);
    ensureDirectoryExists(dirPath);
    
    // Create headers line
    let csvContent = headers.map(header => `"${header.replace(/"/g, '""')}"`).join(',') + '\n';
    
    // Add data rows
    for (const record of records) {
      const row = headers.map(header => {
        const value = record[header] || '';
        // Handle string values that might contain commas or quotes
        if (typeof value === 'string') {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += row.join(',') + '\n';
    }
    
    fs.writeFileSync(filePath, csvContent, 'utf8');
    logger.debug(`Wrote CSV file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to write CSV file ${filePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Generates a unique identifier
 * @returns {string} Unique ID
 */
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Gets the base URL from a full URL
 * @param {string} url Full URL
 * @returns {string} Base URL (protocol + hostname)
 */
function getBaseUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  } catch (error) {
    return '';
  }
}

/**
 * Deep clones an object
 * @param {Object} obj Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  sleep,
  determinePresident,
  ensureDirectoryExists,
  writeJsonFile,
  readJsonFile,
  writeCsvFile,
  generateUniqueId,
  getBaseUrl,
  deepClone
};