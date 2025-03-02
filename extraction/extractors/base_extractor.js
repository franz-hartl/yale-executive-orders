/**
 * base_extractor.js
 * 
 * Base class for all extractors that pull specific types of information
 * from executive orders. Defines the common interface and functionality.
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const { createExtractionModel } = require('../../models/extracted_knowledge');
const { sleep } = require('../../utils/common');

/**
 * Base Extractor class that all specific extractors should extend
 */
class BaseExtractor {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.options = {
      name: 'base',                 // Name of the extractor
      extractorType: 'base',        // Type of information extracted
      description: 'Base extractor', // Description of what this extractor does
      confidenceThreshold: 0.6,     // Minimum confidence to include an item
      apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
      apiHost: process.env.ANTHROPIC_API_HOST || 'https://api.anthropic.com',
      apiModel: process.env.ANTHROPIC_API_MODEL || 'claude-3-opus-20240229',
      maxRetries: 3,                // Maximum number of retries for API calls
      retryDelay: 1000,             // Delay between retries in milliseconds
      ...options
    };
    
    // Create a extractor-specific logger
    this.logger = logger.createJobLogger(`${this.options.name}Extractor`);
    
    this.logger.info(`Initialized ${this.options.name} extractor`);
  }
  
  /**
   * Extract information from an executive order
   * @param {Object} order Executive order data
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Extraction results
   */
  async extract(order, options = {}) {
    this.logger.info(`Extracting ${this.options.extractorType} from order ${order.orderNumber || order.id}`);
    
    try {
      // Validate the order
      this._validateOrder(order);
      
      // Create a new model instance
      const extractionModel = createExtractionModel(this.options.extractorType, {
        orderNumber: order.orderNumber || order.data?.order_number,
        sourceId: order.sourceId || order.data?.source_id,
        sourceName: order.sourceName || order.data?.source || 'Unknown',
        rawText: this._getOrderText(order)
      });
      
      // Perform the extraction
      const results = await this._extractImplementation(order, extractionModel, options);
      
      // Calculate confidence if not already set
      if (!results.confidence) {
        results.confidence = this.calculateConfidence(results, order);
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Error extracting from order: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Implement extraction logic in subclasses
   * @param {Object} order Executive order data
   * @param {Object} extractionModel Initial extraction model
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Updated extraction model with results
   * @protected
   */
  async _extractImplementation(order, extractionModel, options = {}) {
    throw new Error('_extractImplementation must be implemented by subclass');
  }
  
  /**
   * Calculate the confidence score for extraction results
   * @param {Object} results Extraction results
   * @param {Object} order Original order data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(results, order) {
    // Base implementation - subclasses should override with specific logic
    return 0.7; // Default medium-high confidence
  }
  
  /**
   * Make an API call to extract information using AI
   * @param {string} prompt Prompt for the AI
   * @param {Object} options API call options
   * @returns {Promise<string>} AI response
   * @protected
   */
  async _callAI(prompt, options = {}) {
    if (!this.options.apiKey) {
      throw new Error('No API key provided for AI extraction');
    }
    
    const apiOptions = {
      model: options.model || this.options.apiModel,
      maxTokens: options.maxTokens || 2500,
      maxRetries: options.maxRetries || this.options.maxRetries,
      retryDelay: options.retryDelay || this.options.retryDelay,
      temperature: options.temperature || 0.2, // Low temperature for factual extraction
      ...options
    };
    
    this.logger.info(`Calling AI (${apiOptions.model}) for extraction`);
    
    // Determine which API provider to use
    const isAnthropicAPI = this.options.apiKey.startsWith('sk-ant-') || this.options.apiHost.includes('anthropic');
    
    let attempts = 0;
    let lastError = null;
    
    while (attempts < apiOptions.maxRetries) {
      try {
        let response;
        
        if (isAnthropicAPI) {
          // Call Anthropic Claude API
          response = await axios.post(
            `${this.options.apiHost}/v1/messages`,
            {
              model: apiOptions.model,
              max_tokens: apiOptions.maxTokens,
              system: options.systemPrompt || this._getDefaultSystemPrompt(),
              temperature: apiOptions.temperature,
              messages: [
                {
                  role: "user",
                  content: prompt
                }
              ]
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': this.options.apiKey
              }
            }
          );
          
          return response.data.content[0].text;
          
        } else {
          // Call OpenAI API
          response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: apiOptions.model,
              max_tokens: apiOptions.maxTokens,
              temperature: apiOptions.temperature,
              messages: [
                {
                  role: "system",
                  content: options.systemPrompt || this._getDefaultSystemPrompt()
                },
                {
                  role: "user",
                  content: prompt
                }
              ]
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.options.apiKey}`
              }
            }
          );
          
          return response.data.choices[0].message.content;
        }
      } catch (error) {
        lastError = error;
        attempts++;
        
        const status = error.response?.status;
        
        if (status === 429) {
          // Rate limit error - use exponential backoff
          const delay = apiOptions.retryDelay * Math.pow(2, attempts - 1);
          this.logger.warn(`Rate limit exceeded. Retry ${attempts}/${apiOptions.maxRetries} after ${delay}ms delay.`);
          await sleep(delay);
        } else if (status >= 500) {
          // Server error - retry with backoff
          const delay = apiOptions.retryDelay * Math.pow(2, attempts - 1);
          this.logger.warn(`API server error (${status}). Retry ${attempts}/${apiOptions.maxRetries} after ${delay}ms delay.`);
          await sleep(delay);
        } else {
          // Other errors - log and retry with backoff
          const delay = apiOptions.retryDelay * Math.pow(2, attempts - 1);
          this.logger.warn(`API call failed (${error.message}). Retry ${attempts}/${apiOptions.maxRetries} after ${delay}ms delay.`);
          await sleep(delay);
        }
        
        if (attempts >= apiOptions.maxRetries) {
          this.logger.error(`API call failed after ${attempts} attempts: ${lastError.message}`);
          throw lastError;
        }
      }
    }
  }
  
  /**
   * Parse JSON from AI response
   * @param {string} response AI response text
   * @returns {Object} Parsed JSON
   * @protected
   */
  _parseJsonFromResponse(response) {
    try {
      // Try to find JSON in the response
      const jsonMatch = response.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) || 
                        response.match(/({[\s\S]*})/) ||
                        response.match(/({\s*"[^"]+"\s*:[\s\S]*})/);
      
      if (jsonMatch && jsonMatch[1]) {
        // Extract JSON string and parse it
        const jsonString = jsonMatch[1].trim();
        return JSON.parse(jsonString);
      }
      
      // If no JSON found, try parsing the whole response
      return JSON.parse(response.trim());
    } catch (error) {
      this.logger.error(`Failed to parse JSON from AI response: ${error.message}`);
      throw new Error(`Failed to parse JSON from AI response: ${error.message}`);
    }
  }
  
  /**
   * Get default system prompt for AI
   * @returns {string} System prompt
   * @protected
   */
  _getDefaultSystemPrompt() {
    return `You are an expert at analyzing executive orders and extracting specific information about ${this.options.extractorType}. 
Your task is to carefully read the text and identify all ${this.options.extractorType} mentioned. 
Be precise and thorough in your extraction, focusing only on explicitly stated information.
Format your response as structured JSON following the schema provided in the user prompt.`;
  }
  
  /**
   * Validate the order object
   * @param {Object} order Executive order data
   * @throws {Error} If order is invalid
   * @protected
   */
  _validateOrder(order) {
    if (!order) {
      throw new Error('No order provided');
    }
    
    // Check for order number
    if (!order.orderNumber && !order.data?.order_number) {
      throw new Error('Order missing order number');
    }
    
    // Check for text content
    if (!this._getOrderText(order)) {
      throw new Error('Order missing text content');
    }
  }
  
  /**
   * Get the text content from the order
   * @param {Object} order Executive order data
   * @returns {string} Order text
   * @protected
   */
  _getOrderText(order) {
    // Try different possible locations for the text
    if (order.data?.full_text) {
      return order.data.full_text;
    } else if (order.full_text) {
      return order.full_text;
    } else if (order.data?.summary) {
      return order.data.summary;
    } else if (order.summary) {
      return order.summary;
    } else if (order.content?.full_text) {
      return order.content.full_text;
    } else if (order.content) {
      // If content is a string, use it directly
      return typeof order.content === 'string' ? order.content : JSON.stringify(order.content);
    }
    
    return '';
  }
}

module.exports = BaseExtractor;