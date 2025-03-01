/**
 * federal_register_source.js
 * 
 * Data source adapter for the Federal Register API, which provides
 * official executive order data from the U.S. government.
 */

const BaseSource = require('./base_source');
const { makeJsonRequest, extractTextFromHtml } = require('../utils/http');
const { determinePresident, sleep } = require('../utils/common');

/**
 * Federal Register API source adapter
 */
class FederalRegisterSource extends BaseSource {
  /**
   * Constructor for FederalRegisterSource
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Federal Register',
      description: 'Official Federal Register API for executive orders',
      ...options
    });
    
    this.baseUrl = 'https://www.federalregister.gov/api/v1';
    this.defaultPerPage = options.perPage || 50; // API maximum is 50
    this.requestDelay = options.requestDelay || 1000; // Delay between requests to prevent rate limiting
  }
  
  /**
   * Fetches executive orders from the Federal Register API
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    try {
      this.logger.info('Fetching executive orders from Federal Register API');
      
      const {
        fromDate,
        toDate,
        perPage = this.defaultPerPage,
        maxPages = 0, // 0 means fetch all pages
        includeFullText = true
      } = options;
      
      let allOrders = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      // Build base URL with conditions
      let apiUrl = `${this.baseUrl}/documents.json?conditions%5Bpresidential_document_type%5D=executive_order`;
      
      // Add date filters if provided
      if (fromDate) {
        apiUrl += `&conditions%5Bpublication_date%5D%5Bgte%5D=${fromDate}`;
      }
      
      if (toDate) {
        apiUrl += `&conditions%5Bpublication_date%5D%5Blte%5D=${toDate}`;
      }
      
      // Add pagination parameters
      apiUrl += `&per_page=${perPage}&order=newest`;
      
      // Fetch pages until there are no more or we hit the max
      while (hasMorePages && (!maxPages || currentPage <= maxPages)) {
        const pageUrl = `${apiUrl}&page=${currentPage}`;
        this.logger.info(`Fetching page ${currentPage} from Federal Register API`);
        
        try {
          const data = await makeJsonRequest(pageUrl, {
            requestDelay: this.requestDelay
          });
          
          if (data.results && data.results.length > 0) {
            this.logger.info(`Found ${data.results.length} results on page ${currentPage}`);
            
            // Process each order
            for (const order of data.results) {
              try {
                // Fetch full text if requested
                if (includeFullText && order.body_html_url) {
                  this.logger.debug(`Fetching full text for order ${order.executive_order_number || order.document_number}`);
                  
                  try {
                    const bodyHtml = await makeJsonRequest(order.body_html_url, {
                      requestDelay: this.requestDelay
                    });
                    
                    // Extract text from HTML
                    if (bodyHtml && bodyHtml.html) {
                      order.full_text = extractTextFromHtml(bodyHtml.html);
                    }
                  } catch (fullTextError) {
                    this.logger.warn(`Failed to fetch full text for order ${order.executive_order_number || order.document_number}: ${fullTextError.message}`);
                    order.full_text = order.abstract || order.description || '';
                  }
                } else {
                  order.full_text = order.abstract || order.description || '';
                }
                
                // Add president information if missing
                if (!order.president?.name) {
                  order.president = determinePresident(order);
                }
                
                // Standardize the order format
                const standardOrder = this.standardizeOrder(order);
                
                // Add to results if valid
                if (this.validateOrder(standardOrder)) {
                  allOrders.push(standardOrder);
                }
              } catch (orderError) {
                this.handleError(orderError, 'processingOrder', { 
                  orderNumber: order.executive_order_number || order.document_number
                });
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
          this.handleError(pageError, 'fetchPage', { page: currentPage });
          
          // Implement exponential backoff for retries
          const backoffTime = this.requestDelay * Math.pow(2, Math.min(3, currentPage - 1));
          this.logger.info(`Backing off for ${backoffTime}ms before trying next page`);
          await sleep(backoffTime);
          
          // Move to next page even if current page failed
          currentPage++;
        }
      }
      
      this.logger.info(`Successfully fetched ${allOrders.length} executive orders from Federal Register API`);
      return allOrders;
    } catch (error) {
      this.handleError(error, 'fetchOrders');
      return [];
    }
  }
  
  /**
   * Fetches a specific executive order by document number
   * @param {string} documentNumber Federal Register document number
   * @returns {Promise<Object>} Executive order in standardized format
   */
  async fetchOrderById(documentNumber) {
    try {
      this.logger.info(`Fetching executive order by document number: ${documentNumber}`);
      
      // Build API URL for specific document
      const apiUrl = `${this.baseUrl}/documents/${documentNumber}.json`;
      
      const order = await makeJsonRequest(apiUrl, {
        requestDelay: this.requestDelay
      });
      
      // Fetch full text if available
      if (order && order.body_html_url) {
        this.logger.debug(`Fetching full text for order ${order.executive_order_number || order.document_number}`);
        
        try {
          const bodyHtml = await makeJsonRequest(order.body_html_url, {
            requestDelay: this.requestDelay
          });
          
          // Extract text from HTML
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
      
      // Add president information if missing
      if (!order.president?.name) {
        order.president = determinePresident(order);
      }
      
      // Standardize the order format
      const standardOrder = this.standardizeOrder(order);
      
      if (this.validateOrder(standardOrder)) {
        return standardOrder;
      } else {
        throw new Error(`Invalid order data received for document number: ${documentNumber}`);
      }
    } catch (error) {
      this.handleError(error, 'fetchOrderById', { documentNumber });
      return null;
    }
  }
  
  /**
   * Standardizes a Federal Register order
   * @param {Object} order Federal Register order
   * @returns {Object} Standardized order
   */
  standardizeOrder(order) {
    // Map Federal Register-specific fields to standard format
    const standardOrder = super.standardizeOrder({
      order_number: order.executive_order_number,
      document_number: order.document_number,
      title: order.title,
      signing_date: order.signing_date,
      publication_date: order.publication_date,
      president: typeof order.president === 'string' ? order.president : order.president?.name,
      summary: order.abstract || order.description || '',
      full_text: order.full_text || order.body || '',
      url: order.html_url,
      metadata: {
        citation: order.citation,
        type: order.type,
        document_type: order.presidential_document_type_slug,
        federal_register_data: {
          start_page: order.start_page,
          end_page: order.end_page,
          volume: order.volume,
          agency_names: order.agencies?.map(a => a.name) || []
        }
      }
    });
    
    return standardOrder;
  }
}

module.exports = FederalRegisterSource;