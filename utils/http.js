/**
 * http.js
 * 
 * Provides standardized HTTP request utilities for fetching executive order data
 * from various sources. Handles different HTTP client libraries, retry logic,
 * and consistent error reporting.
 */

const https = require('https');
const axios = require('axios');
const { sleep } = require('./common');
const logger = require('./logger');

/**
 * Configuration options for HTTP requests
 */
const HTTP_CONFIG = {
  // Default timeout in milliseconds
  defaultTimeout: 30000,
  
  // Default number of retry attempts
  defaultRetries: 3,
  
  // Default delay between retries in milliseconds
  defaultRetryDelay: 1000,
  
  // Default delay between normal requests in milliseconds (to prevent rate limiting)
  defaultRequestDelay: 500,
  
  // User agent to use for requests
  userAgent: 'Yale Executive Orders Research Project (https://github.com/yale/executive-orders)'
};

/**
 * Makes an HTTP request using the native Node.js https module
 * @param {string} url URL to request
 * @param {Object} options Request options
 * @returns {Promise<string>} Response body as string
 */
function makeNativeRequest(url, options = {}) {
  const httpLogger = logger.createNamedLogger('HTTP-Native');
  
  return new Promise((resolve, reject) => {
    httpLogger.debug(`Making native request to: ${url}`);
    
    const requestOptions = {
      timeout: options.timeout || HTTP_CONFIG.defaultTimeout,
      headers: {
        'User-Agent': HTTP_CONFIG.userAgent,
        ...(options.headers || {})
      }
    };
    
    https.get(url, requestOptions, (res) => {
      httpLogger.debug(`Response status code: ${res.statusCode}`);
      
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpLogger.debug(`Following redirect to: ${res.headers.location}`);
        return makeNativeRequest(res.headers.location, options)
          .then(resolve)
          .catch(reject);
      }
      
      // Handle error status codes
      if (res.statusCode >= 400) {
        const error = new Error(`HTTP error ${res.statusCode}`);
        error.statusCode = res.statusCode;
        reject(error);
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        httpLogger.debug(`Request completed, received ${data.length} bytes`);
        resolve(data);
      });
    }).on('error', (err) => {
      httpLogger.error(`Request error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Makes an HTTP request using Axios
 * @param {string} url URL to request
 * @param {Object} options Request options
 * @returns {Promise<string>} Response body as string
 */
async function makeAxiosRequest(url, options = {}) {
  const httpLogger = logger.createNamedLogger('HTTP-Axios');
  
  httpLogger.debug(`Making axios request to: ${url}`);
  
  const requestOptions = {
    timeout: options.timeout || HTTP_CONFIG.defaultTimeout,
    headers: {
      'User-Agent': HTTP_CONFIG.userAgent,
      ...(options.headers || {})
    },
    validateStatus: status => status < 400,
    ...(options.axiosOptions || {})
  };
  
  try {
    const response = await axios.get(url, requestOptions);
    httpLogger.debug(`Response status code: ${response.status}`);
    return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  } catch (error) {
    httpLogger.error(`Axios request error: ${error.message}`);
    
    // Enhance error with status code if available
    if (error.response) {
      error.statusCode = error.response.status;
    }
    
    throw error;
  }
}

/**
 * Makes an HTTP request with retry logic
 * @param {string} url URL to request
 * @param {Object} options Request options
 * @returns {Promise<string>} Response body as string
 */
async function makeRequestWithRetry(url, options = {}) {
  const httpLogger = logger.createNamedLogger('HTTP');
  const maxRetries = options.retries || HTTP_CONFIG.defaultRetries;
  const retryDelay = options.retryDelay || HTTP_CONFIG.defaultRetryDelay;
  const useAxios = options.useAxios !== undefined ? options.useAxios : true;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Use either axios or native https based on option
      const response = useAxios 
        ? await makeAxiosRequest(url, options)
        : await makeNativeRequest(url, options);
      
      // Add delay after successful request if requested
      if (options.requestDelay || HTTP_CONFIG.defaultRequestDelay) {
        await sleep(options.requestDelay || HTTP_CONFIG.defaultRequestDelay);
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Log retry attempts
      if (attempt < maxRetries) {
        const backoffTime = retryDelay * attempt;
        httpLogger.warn(`Request failed (attempt ${attempt}/${maxRetries}), retrying in ${backoffTime}ms: ${error.message}`);
        await sleep(backoffTime);
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  httpLogger.error(`Request failed after ${maxRetries} attempts to: ${url}`);
  throw lastError;
}

/**
 * Makes a JSON request and parses the response
 * @param {string} url URL to request
 * @param {Object} options Request options
 * @returns {Promise<Object>} Parsed JSON response
 */
async function makeJsonRequest(url, options = {}) {
  const response = await makeRequestWithRetry(url, options);
  
  try {
    return JSON.parse(response);
  } catch (error) {
    const httpLogger = logger.createNamedLogger('HTTP');
    httpLogger.error(`Failed to parse JSON response: ${error.message}`);
    throw new Error(`Failed to parse JSON response: ${error.message}`);
  }
}

/**
 * Extracts plain text from HTML content
 * @param {string} html HTML content
 * @returns {string} Plain text
 */
function extractTextFromHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
    .trim();
}

/**
 * Extracts text between two markers in a document
 * @param {string} text Full text to search
 * @param {string} startMarker Text that marks the beginning of the section
 * @param {string} endMarker Text that marks the end of the section
 * @returns {string} Extracted text or original text if markers not found
 */
function extractTextBetweenMarkers(text, startMarker, endMarker) {
  if (text.includes(startMarker) && text.includes(endMarker)) {
    const startIndex = text.indexOf(startMarker);
    const endIndex = text.indexOf(endMarker, startIndex);
    
    if (startIndex !== -1 && endIndex !== -1) {
      return text.substring(startIndex, endIndex).trim();
    }
  }
  
  return text;
}

module.exports = {
  makeRequestWithRetry,
  makeJsonRequest,
  extractTextFromHtml,
  extractTextBetweenMarkers,
  HTTP_CONFIG
};