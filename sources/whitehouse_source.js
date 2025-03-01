/**
 * whitehouse_source.js
 * 
 * Data source adapter for the White House website, which provides
 * the most recent executive orders directly from whitehouse.gov.
 */

const BaseSource = require('./base_source');
const { makeRequestWithRetry, extractTextFromHtml, extractTextBetweenMarkers } = require('../utils/http');
const { determinePresident, sleep } = require('../utils/common');
const cheerio = require('cheerio');

/**
 * White House website source adapter
 */
class WhiteHouseSource extends BaseSource {
  /**
   * Constructor for WhiteHouseSource
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'White House Website',
      description: 'Direct source for executive orders from whitehouse.gov',
      ...options
    });
    
    this.baseUrl = 'https://www.whitehouse.gov';
    this.requestDelay = options.requestDelay || 1500; // Higher delay for scraping
    this.knownOrdersPath = options.knownOrdersPath || null;
  }
  
  /**
   * Fetches executive orders from the White House website and any known orders
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    try {
      this.logger.info('Fetching executive orders from White House Website');
      
      const orders = [];
      
      // Try to fetch orders from the live website
      try {
        const scrapedOrders = await this.scrapeWhiteHouseWebsite(options);
        orders.push(...scrapedOrders);
      } catch (scrapeError) {
        this.logger.error(`Failed to scrape White House website: ${scrapeError.message}`);
      }
      
      // Add known orders from hardcoded data if available
      try {
        const knownOrders = await this.getKnownOrders();
        
        // Filter out duplicates
        for (const knownOrder of knownOrders) {
          // Check if this order is already in our results
          const isDuplicate = orders.some(order => 
            order.order_number === knownOrder.order_number ||
            order.title === knownOrder.title
          );
          
          if (!isDuplicate) {
            this.logger.debug(`Adding known order: ${knownOrder.order_number} - ${knownOrder.title}`);
            
            // Fetch full text if needed
            if (knownOrder.url && (!knownOrder.full_text || knownOrder.full_text === knownOrder.summary)) {
              try {
                const fullText = await this.fetchOrderFullText(knownOrder.url);
                knownOrder.full_text = fullText || knownOrder.summary;
              } catch (fullTextError) {
                this.logger.warn(`Failed to fetch full text for known order ${knownOrder.order_number}: ${fullTextError.message}`);
              }
            }
            
            // Standardize and add the order
            const standardOrder = this.standardizeOrder(knownOrder);
            if (this.validateOrder(standardOrder)) {
              orders.push(standardOrder);
            }
          }
        }
      } catch (knownOrdersError) {
        this.logger.error(`Failed to process known orders: ${knownOrdersError.message}`);
      }
      
      this.logger.info(`Successfully fetched ${orders.length} executive orders from White House source`);
      return orders;
    } catch (error) {
      this.handleError(error, 'fetchOrders');
      return [];
    }
  }
  
  /**
   * Scrapes the White House website for executive orders
   * @param {Object} options Scrape options
   * @returns {Promise<Array>} Array of executive orders
   */
  async scrapeWhiteHouseWebsite(options = {}) {
    try {
      const orders = [];
      const { maxPages = 3 } = options;
      
      // URL for the presidential actions page filtering for executive orders
      const baseUrl = `${this.baseUrl}/briefing-room/presidential-actions`;
      
      for (let page = 1; page <= maxPages; page++) {
        try {
          const url = page === 1 ? baseUrl : `${baseUrl}/page/${page}`;
          this.logger.info(`Scraping White House website page ${page}: ${url}`);
          
          const html = await makeRequestWithRetry(url, {
            requestDelay: this.requestDelay
          });
          
          // Use cheerio to parse the HTML
          const $ = cheerio.load(html);
          
          // Find executive order links
          const orderLinks = [];
          
          // This selector may need adjustment based on the current website structure
          $('article').each((i, element) => {
            const titleElement = $(element).find('h3');
            const title = titleElement.text().trim();
            
            if (title.toLowerCase().includes('executive order')) {
              const link = $(element).find('a').attr('href');
              const date = $(element).find('time').attr('datetime') || '';
              
              if (link) {
                orderLinks.push({
                  title,
                  url: link.startsWith('http') ? link : `${this.baseUrl}${link}`,
                  publication_date: date
                });
              }
            }
          });
          
          this.logger.info(`Found ${orderLinks.length} order links on page ${page}`);
          
          // Fetch details for each order
          for (const link of orderLinks) {
            try {
              const order = await this.fetchOrderDetails(link.url, {
                title: link.title,
                publication_date: link.publication_date
              });
              
              if (order) {
                const standardOrder = this.standardizeOrder(order);
                if (this.validateOrder(standardOrder)) {
                  orders.push(standardOrder);
                }
              }
            } catch (orderError) {
              this.logger.warn(`Failed to fetch details for order at ${link.url}: ${orderError.message}`);
            }
            
            // Add delay between requests
            await sleep(this.requestDelay);
          }
          
          // Check if there are more pages
          const hasNextPage = $('a.next').length > 0;
          if (!hasNextPage) {
            break;
          }
          
          // Add delay between page requests
          await sleep(this.requestDelay * 2);
        } catch (pageError) {
          this.logger.error(`Failed to scrape page ${page}: ${pageError.message}`);
          // Continue with next page
        }
      }
      
      return orders;
    } catch (error) {
      this.handleError(error, 'scrapeWhiteHouseWebsite');
      return [];
    }
  }
  
  /**
   * Fetches details for a specific executive order from its URL
   * @param {string} url Order URL
   * @param {Object} initialData Initial data already known about the order
   * @returns {Promise<Object>} Executive order details
   */
  async fetchOrderDetails(url, initialData = {}) {
    try {
      this.logger.debug(`Fetching order details from URL: ${url}`);
      
      const html = await makeRequestWithRetry(url, {
        requestDelay: this.requestDelay
      });
      
      // Use cheerio to parse the HTML
      const $ = cheerio.load(html);
      
      // Extract order number from title or content
      const title = initialData.title || $('h1').first().text().trim();
      let orderNumber = '';
      
      // Try to extract order number from title
      const orderNumberMatch = title.match(/Executive Order (?:No\.\s*)?(\d+)/i);
      if (orderNumberMatch) {
        orderNumber = orderNumberMatch[1];
      }
      
      // Extract date information
      const dateString = initialData.publication_date || $('time').attr('datetime') || '';
      const signingDateString = $('p:contains("Date:")').text().replace('Date:', '').trim();
      
      // Extract full text
      const contentElement = $('.body-content');
      let fullText = '';
      
      if (contentElement.length > 0) {
        fullText = contentElement.text().trim();
      } else {
        // Fallback to extracting the main content
        fullText = $('main').text().trim();
      }
      
      // Clean up the text
      fullText = fullText.replace(/\s+/g, ' ').trim();
      
      // Extract the actual executive order text using markers
      const startMarker = "EXECUTIVE ORDER";
      const endMarker = "THE WHITE HOUSE,";
      const extractedText = extractTextBetweenMarkers(fullText, startMarker, endMarker);
      
      // Create the order object
      const order = {
        order_number: orderNumber,
        title,
        signing_date: signingDateString || null,
        publication_date: dateString || null,
        president: determinePresident({ 
          signing_date: signingDateString,
          publication_date: dateString
        }),
        summary: $('meta[name="description"]').attr('content') || title,
        full_text: extractedText || fullText,
        url,
        metadata: {
          scrape_date: new Date().toISOString()
        }
      };
      
      return order;
    } catch (error) {
      this.handleError(error, 'fetchOrderDetails', { url });
      return null;
    }
  }
  
  /**
   * Fetches the full text of an executive order from its URL
   * @param {string} url Order URL
   * @returns {Promise<string>} Full text of the order
   */
  async fetchOrderFullText(url) {
    try {
      this.logger.debug(`Fetching order full text from URL: ${url}`);
      
      const html = await makeRequestWithRetry(url, {
        requestDelay: this.requestDelay
      });
      
      // Extract text from HTML
      const fullText = extractTextFromHtml(html);
      
      // Extract the actual executive order text using markers
      const startMarker = "EXECUTIVE ORDER";
      const endMarker = "THE WHITE HOUSE,";
      const extractedText = extractTextBetweenMarkers(fullText, startMarker, endMarker);
      
      return extractedText || fullText;
    } catch (error) {
      this.handleError(error, 'fetchOrderFullText', { url });
      return null;
    }
  }
  
  /**
   * Fetches a specific executive order by number
   * @param {string} orderNumber Executive order number
   * @returns {Promise<Object>} Executive order in standardized format
   */
  async fetchOrderById(orderNumber) {
    try {
      this.logger.info(`Fetching executive order by number: ${orderNumber}`);
      
      // First try to find it in known orders
      const knownOrders = await this.getKnownOrders();
      const knownOrder = knownOrders.find(order => order.order_number === orderNumber);
      
      if (knownOrder) {
        this.logger.debug(`Found order ${orderNumber} in known orders`);
        
        // Fetch full text if needed
        if (knownOrder.url && (!knownOrder.full_text || knownOrder.full_text === knownOrder.summary)) {
          try {
            const fullText = await this.fetchOrderFullText(knownOrder.url);
            knownOrder.full_text = fullText || knownOrder.summary;
          } catch (fullTextError) {
            this.logger.warn(`Failed to fetch full text for known order ${orderNumber}: ${fullTextError.message}`);
          }
        }
        
        // Standardize and return the order
        const standardOrder = this.standardizeOrder(knownOrder);
        if (this.validateOrder(standardOrder)) {
          return standardOrder;
        }
      }
      
      // If not found in known orders, try to search on the website
      // Construct a potential URL based on common patterns
      const potentialUrl = `${this.baseUrl}/briefing-room/presidential-actions/executive-order-${orderNumber}`;
      
      try {
        const order = await this.fetchOrderDetails(potentialUrl);
        if (order && order.order_number === orderNumber) {
          return this.standardizeOrder(order);
        }
      } catch (searchError) {
        this.logger.warn(`Failed to find order ${orderNumber} at expected URL: ${searchError.message}`);
      }
      
      this.logger.info(`Could not find executive order ${orderNumber}`);
      return null;
    } catch (error) {
      this.handleError(error, 'fetchOrderById', { orderNumber });
      return null;
    }
  }
  
  /**
   * Gets the list of known executive orders
   * @returns {Promise<Array>} List of known orders
   */
  async getKnownOrders() {
    // Default hardcoded list of recent important orders
    const defaultKnownOrders = [
      {
        order_number: "14114",
        title: "Ensuring Lawful Governance and Implementing the President's 'Department of Government Efficiency' Deregulatory Initiative",
        signing_date: "2024-02-22",
        publication_date: "2024-02-25",
        president: "Biden",
        summary: "Directs federal agencies to review significant regulations and identify those that are unlawful, ineffective, or overly burdensome.",
        url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2024/02/22/executive-order-on-ensuring-lawful-governance-and-implementing-the-presidents-department-of-government-efficiency-deregulatory-initiative/"
      },
      {
        order_number: "14113",
        title: "Ending Taxpayer Subsidization of Open Borders",
        signing_date: "2024-02-22",
        publication_date: "2024-02-25",
        president: "Biden",
        summary: "Directs federal agencies to review immigration policies to reduce federal funds supporting illegal immigration.",
        url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2024/02/22/executive-order-on-ending-taxpayer-subsidization-of-open-borders/"
      },
      {
        order_number: "14097",
        title: "Safe, Secure, and Trustworthy Development and Use of Artificial Intelligence",
        signing_date: "2023-10-30",
        publication_date: "2023-11-01",
        president: "Biden", 
        summary: "Establishes new standards for AI safety and security while protecting Americans' privacy, advancing equity, and protecting workers' rights.",
        url: "https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/"
      }
    ];
    
    try {
      // If a path to known orders is provided, try to load it
      if (this.knownOrdersPath) {
        const { readJsonFile } = require('../utils/common');
        const knownOrders = readJsonFile(this.knownOrdersPath);
        
        if (knownOrders && Array.isArray(knownOrders) && knownOrders.length > 0) {
          this.logger.info(`Loaded ${knownOrders.length} known orders from file`);
          return knownOrders;
        }
      }
    } catch (fileError) {
      this.logger.warn(`Failed to load known orders from file: ${fileError.message}`);
    }
    
    // Fall back to default hardcoded list
    this.logger.info(`Using default list of ${defaultKnownOrders.length} known orders`);
    return defaultKnownOrders;
  }
}

module.exports = WhiteHouseSource;