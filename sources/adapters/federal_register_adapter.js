/**
 * federal_register_adapter.js
 * 
 * Adapter for fetching executive orders from the Federal Register API.
 * This is the official source for executive orders from the U.S. government.
 */

const BaseAdapter = require('./base_adapter');
const { extractTextFromHtml } = require('../../utils/http');
const { sleep } = require('../../utils/common');
const crypto = require('crypto');

/**
 * Adapter for Federal Register API
 */
class FederalRegisterAdapter extends BaseAdapter {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      sourceType: 'federal_register',
      name: 'Federal Register',
      description: 'Official Federal Register API for executive orders',
      baseUrl: 'https://www.federalregister.gov/api/v1',
      ...options
    });
    
    // Federal Register specific options
    this.defaultPerPage = options.perPage || 50; // API maximum is 50
  }
  
  /**
   * Federal Register implementation of the fetch method
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Fetched executive orders
   * @protected
   */
  async _fetchImplementation(options = {}) {
    const {
      fromDate,
      toDate,
      perPage = this.defaultPerPage,
      maxPages = 0, // 0 means fetch all pages
      includeFullText = true,
      orderNumber = null
    } = options;
    
    // If a specific order is requested, fetch by order number
    if (orderNumber) {
      const order = await this._fetchOrderByNumber(orderNumber);
      return order ? [order] : [];
    }
    
    // Otherwise fetch all orders matching criteria
    return await this._fetchOrdersByCriteria({
      fromDate,
      toDate,
      perPage,
      maxPages,
      includeFullText
    });
  }
  
  /**
   * Fetch a specific executive order by number
   * @param {string} orderNumber Executive order number (e.g., "14000")
   * @returns {Promise<Object|null>} Executive order or null if not found
   * @private
   */
  async _fetchOrderByNumber(orderNumber) {
    try {
      this.logger.info(`Fetching executive order by number: ${orderNumber}`);
      
      // Search for the order by number
      const searchEndpoint = `/documents.json?conditions%5Bpresidential_document_type%5D=executive_order&conditions%5Bexecutive_order_number%5D=${orderNumber}`;
      
      const searchResult = await this.makeRequest(searchEndpoint);
      
      if (!searchResult.results || searchResult.results.length === 0) {
        this.logger.warn(`No executive order found with number ${orderNumber}`);
        return null;
      }
      
      // Get the first matching order
      const orderData = searchResult.results[0];
      
      // Fetch full text if available
      if (orderData.body_html_url) {
        try {
          const bodyHtml = await this.makeRequest(orderData.body_html_url.replace(this.baseUrl, ''));
          
          if (bodyHtml && bodyHtml.html) {
            orderData.full_text = extractTextFromHtml(bodyHtml.html);
          }
        } catch (fullTextError) {
          this.logger.warn(`Failed to fetch full text: ${fullTextError.message}`);
          orderData.full_text = orderData.abstract || orderData.description || '';
        }
      } else {
        orderData.full_text = orderData.abstract || orderData.description || '';
      }
      
      // Process the order
      return this._processItem(orderData);
    } catch (error) {
      this.logger.error(`Error fetching executive order by number ${orderNumber}: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Fetch executive orders based on criteria
   * @param {Object} criteria Search criteria
   * @returns {Promise<Array>} Array of executive orders
   * @private
   */
  async _fetchOrdersByCriteria(criteria) {
    try {
      this.logger.info('Fetching executive orders based on criteria');
      
      const {
        fromDate,
        toDate,
        perPage,
        maxPages,
        includeFullText
      } = criteria;
      
      let allOrders = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      // Build base URL with conditions
      let apiEndpoint = `/documents.json?conditions%5Bpresidential_document_type%5D=executive_order`;
      
      // Add date filters if provided
      if (fromDate) {
        apiEndpoint += `&conditions%5Bpublication_date%5D%5Bgte%5D=${fromDate}`;
      }
      
      if (toDate) {
        apiEndpoint += `&conditions%5Bpublication_date%5D%5Blte%5D=${toDate}`;
      }
      
      // Add pagination and sorting
      apiEndpoint += `&per_page=${perPage}&order=newest`;
      
      // Fetch pages until there are no more or we hit the max
      while (hasMorePages && (!maxPages || currentPage <= maxPages)) {
        const pageEndpoint = `${apiEndpoint}&page=${currentPage}`;
        this.logger.info(`Fetching page ${currentPage}`);
        
        try {
          const data = await this.makeRequest(pageEndpoint);
          
          if (data.results && data.results.length > 0) {
            this.logger.info(`Found ${data.results.length} results on page ${currentPage}`);
            
            // Process each order
            for (const order of data.results) {
              try {
                // Fetch full text if requested
                if (includeFullText && order.body_html_url) {
                  this.logger.debug(`Fetching full text for order ${order.executive_order_number || order.document_number}`);
                  
                  try {
                    const bodyUrl = order.body_html_url.replace(this.baseUrl, '');
                    const bodyHtml = await this.makeRequest(bodyUrl);
                    
                    if (bodyHtml && bodyHtml.html) {
                      order.full_text = extractTextFromHtml(bodyHtml.html);
                    }
                  } catch (fullTextError) {
                    this.logger.warn(`Failed to fetch full text: ${fullTextError.message}`);
                    order.full_text = order.abstract || order.description || '';
                  }
                } else {
                  order.full_text = order.abstract || order.description || '';
                }
                
                // Process the order
                const processedOrder = this._processItem(order);
                
                if (processedOrder) {
                  allOrders.push(processedOrder);
                }
              } catch (orderError) {
                this.logger.error(`Error processing order: ${orderError.message}`);
              }
            }
            
            // Determine if there are more pages
            hasMorePages = !!data.next_page_url;
            
            // Move to next page
            if (hasMorePages) {
              currentPage++;
              await sleep(this.requestDelay);
            }
          } else {
            this.logger.info('No more results found');
            hasMorePages = false;
          }
        } catch (pageError) {
          // Log the error but continue with next page
          this.logger.error(`Error fetching page ${currentPage}: ${pageError.message}`);
          
          // Implement exponential backoff for retries
          const backoffTime = this.requestDelay * Math.pow(2, Math.min(3, currentPage - 1));
          this.logger.info(`Backing off for ${backoffTime}ms before trying next page`);
          await sleep(backoffTime);
          
          // Move to next page even if current page failed
          currentPage++;
        }
      }
      
      this.logger.info(`Successfully fetched ${allOrders.length} executive orders`);
      return allOrders;
    } catch (error) {
      this.logger.error(`Error fetching orders by criteria: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Process a Federal Register item
   * @param {Object} item Federal Register item
   * @returns {Object} Processed item
   * @protected
   */
  _processItem(item) {
    // Skip items that aren't executive orders
    if (item.presidential_document_type !== 'executive_order') {
      this.logger.warn(`Skipping non-executive order item: ${item.document_number}`);
      return null;
    }
    
    // Create a standardized version of the order
    return {
      id: item.document_number,
      order_number: item.executive_order_number,
      document_number: item.document_number,
      title: item.title,
      signing_date: item.signing_date,
      publication_date: item.publication_date,
      president: item.president?.name || this._determinePresident(item),
      summary: item.abstract || item.description || '',
      full_text: item.full_text || item.body || '',
      url: item.html_url,
      source: 'Federal Register',
      source_id: this.sourceId,
      source_type: this.sourceType,
      metadata: {
        citation: item.citation,
        type: item.type,
        document_type: item.presidential_document_type_slug,
        federal_register_data: {
          start_page: item.start_page,
          end_page: item.end_page,
          volume: item.volume,
          agency_names: item.agencies?.map(a => a.name) || []
        }
      }
    };
  }
  
  /**
   * Determine the president based on order data
   * @param {Object} order Order data
   * @returns {string} President name
   * @private
   */
  _determinePresident(order) {
    // For orders after January 20, 2025, set to Trump
    const pubDate = order.publication_date ? new Date(order.publication_date) : null;
    const signingDate = order.signing_date ? new Date(order.signing_date) : null;
    const trumpDate2025 = new Date('2025-01-20');
    
    if ((pubDate && pubDate >= trumpDate2025) || (signingDate && signingDate >= trumpDate2025)) {
      return "Trump";
    }
    
    // For orders between Jan 20, 2021 and Jan 20, 2025, set to Biden
    const bidenStartDate = new Date('2021-01-20');
    
    if ((pubDate && pubDate >= bidenStartDate && pubDate < trumpDate2025) || 
        (signingDate && signingDate >= bidenStartDate && signingDate < trumpDate2025)) {
      return "Biden";
    }
    
    // For orders between Jan 20, 2017 and Jan 20, 2021, set to Trump
    const trumpDate2017 = new Date('2017-01-20');
    
    if ((pubDate && pubDate >= trumpDate2017 && pubDate < bidenStartDate) || 
        (signingDate && signingDate >= trumpDate2017 && signingDate < bidenStartDate)) {
      return "Trump";
    }
    
    // For orders between Jan 20, 2009 and Jan 20, 2017, set to Obama
    const obamaStartDate = new Date('2009-01-20');
    
    if ((pubDate && pubDate >= obamaStartDate && pubDate < trumpDate2017) || 
        (signingDate && signingDate >= obamaStartDate && signingDate < trumpDate2017)) {
      return "Obama";
    }
    
    // Default to Unknown if we can't determine the president
    return "Unknown";
  }
  
  /**
   * Enhanced validation for Federal Register content
   * @param {Object} content Content to validate
   * @returns {Object} Validation result
   * @protected
   */
  _validateContentItem(content) {
    // First do base validation
    const baseValidation = super._validateContentItem(content);
    if (!baseValidation.isValid) {
      return baseValidation;
    }
    
    // Check for required Federal Register fields
    const data = content.content;
    
    if (!data.document_number) {
      return {
        isValid: false,
        message: 'Missing document number'
      };
    }
    
    if (!data.title) {
      return {
        isValid: false,
        message: 'Missing title'
      };
    }
    
    if (!data.order_number && !data.executive_order_number) {
      return {
        isValid: false,
        message: 'Missing executive order number'
      };
    }
    
    // If the full text is very short, it might be incomplete
    if (data.full_text && data.full_text.length < 100) {
      return {
        isValid: false,
        message: 'Full text appears to be incomplete (too short)'
      };
    }
    
    return {
      isValid: true,
      message: ''
    };
  }
}

module.exports = FederalRegisterAdapter;