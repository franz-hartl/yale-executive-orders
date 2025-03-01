/**
 * cogr_source.js
 * 
 * Data source adapter for the Council on Governmental Relations (COGR),
 * which provides executive order tracking specifically focused on impacts
 * to research institutions, grants, and higher education policy.
 */

const BaseSource = require('./base_source');
const { makeRequestWithRetry, extractTextFromHtml } = require('../utils/http');
const { determinePresident, ensureDirectoryExists, writeJsonFile } = require('../utils/common');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

/**
 * COGR source adapter for research-institution focused analyses
 */
class COGRSource extends BaseSource {
  /**
   * Constructor for COGRSource
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Council on Governmental Relations',
      description: 'Executive order analyses for research institutions from COGR',
      ...options
    });
    
    this.baseUrl = 'https://www.cogr.edu';
    this.trackerUrl = options.trackerUrl || 'https://www.cogr.edu/executive-order-tracker';
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'external_sources', 'cogr');
    this.requestDelay = options.requestDelay || 2000;
  }
  
  /**
   * Initializes the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing COGR source');
    
    // Ensure storage directory exists
    ensureDirectoryExists(this.storageDir);
    
    // Create cache file if it doesn't exist
    const cacheFile = path.join(this.storageDir, 'cogr_cache.json');
    if (!fs.existsSync(cacheFile)) {
      writeJsonFile(cacheFile, {
        lastUpdated: null,
        resources: []
      });
    }
  }
  
  /**
   * Fetches executive orders from COGR's executive order tracker
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    try {
      this.logger.info('Fetching executive orders from COGR Executive Order Tracker');
      
      const {
        forceRefresh = false,
        includeAnalysisDocs = true
      } = options;
      
      // Check if we should use cached data
      const cacheFile = path.join(this.storageDir, 'cogr_cache.json');
      const cache = fs.existsSync(cacheFile) ? 
        JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : 
        { lastUpdated: null, resources: [] };
      
      const cacheAge = cache.lastUpdated ? 
        (new Date() - new Date(cache.lastUpdated)) / (1000 * 60 * 60 * 24) : 
        999;
      
      // If cache is less than 7 days old and we're not forcing refresh, use cache
      if (cache.lastUpdated && cacheAge < 7 && !forceRefresh && cache.resources.length > 0) {
        this.logger.info(`Using cached COGR data (${cacheAge.toFixed(1)} days old)`);
        return cache.resources.map(resource => this.standardizeOrder(resource));
      }
      
      // Otherwise, fetch fresh data
      this.logger.info('Fetching fresh data from COGR Executive Order Tracker');
      
      // Fetch the tracker page
      const html = await makeRequestWithRetry(this.trackerUrl, {
        requestDelay: this.requestDelay
      });
      
      // Parse the page with cheerio
      const $ = cheerio.load(html);
      
      // Extract executive order information
      const orders = [];
      
      // This selector may need adjustment based on COGR's actual website structure
      $('.executive-order-item, .eo-item, article.eo').each((i, element) => {
        try {
          // Extract title (may contain order number)
          const titleElement = $(element).find('h3, h4, .title');
          const title = titleElement.text().trim();
          
          // Extract order number if present in title
          let orderNumber = null;
          const orderNumberMatch = title.match(/Executive Order (?:No\.\s*)?(\d+)/i);
          if (orderNumberMatch) {
            orderNumber = orderNumberMatch[1];
          }
          
          // Extract date if available
          const dateElement = $(element).find('.date, time, .published');
          const dateText = dateElement.text().trim();
          let date = null;
          if (dateText) {
            // Try to parse date from text
            const dateMatch = dateText.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
            if (dateMatch) {
              const [_, month, day, year] = dateMatch;
              date = `20${year.length === 2 ? year : year.substring(2)}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          
          // Extract summary or description
          const summaryElement = $(element).find('.summary, .description, .content p');
          const summary = summaryElement.text().trim();
          
          // Extract any links to analysis documents
          const links = [];
          $(element).find('a').each((j, linkElement) => {
            const href = $(linkElement).attr('href');
            const linkText = $(linkElement).text().trim();
            
            if (href && (href.includes('.pdf') || linkText.includes('Analysis') || linkText.includes('Brief'))) {
              links.push({
                url: href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
                text: linkText
              });
            }
          });
          
          // Add to orders list
          orders.push({
            title,
            order_number: orderNumber,
            signing_date: date,
            publication_date: date,
            summary,
            source: 'COGR',
            analysis_links: links,
            url: this.trackerUrl,
            metadata: {
              source_type: 'research_institution_analysis',
              has_analysis: links.length > 0
            }
          });
        } catch (itemError) {
          this.logger.warn(`Error processing COGR item: ${itemError.message}`);
        }
      });
      
      this.logger.info(`Found ${orders.length} orders on COGR tracker`);
      
      // Fetch analysis documents if requested
      if (includeAnalysisDocs) {
        for (const order of orders) {
          if (order.analysis_links && order.analysis_links.length > 0) {
            try {
              // Fetch the first analysis document
              const analysisLink = order.analysis_links[0];
              this.logger.debug(`Fetching analysis document: ${analysisLink.url}`);
              
              // Handle PDF vs HTML
              if (analysisLink.url.endsWith('.pdf')) {
                // For PDFs, just note the URL for now
                order.comprehensive_analysis = `Analysis available at: ${analysisLink.url}`;
              } else {
                // For HTML, fetch and extract text
                const analysisHtml = await makeRequestWithRetry(analysisLink.url, {
                  requestDelay: this.requestDelay
                });
                
                const analysisText = extractTextFromHtml(analysisHtml);
                order.comprehensive_analysis = analysisText;
              }
              
              // Add executive brief based on analysis or summary
              if (!order.executive_brief) {
                // Use first 500 chars of analysis or full summary
                order.executive_brief = order.comprehensive_analysis 
                  ? order.comprehensive_analysis.substring(0, 500)
                  : order.summary;
              }
            } catch (analysisError) {
              this.logger.warn(`Error fetching analysis for order ${order.order_number}: ${analysisError.message}`);
            }
            
            // Add delay between requests
            await new Promise(resolve => setTimeout(resolve, this.requestDelay));
          }
        }
      }
      
      // Add research categories and impact areas
      for (const order of orders) {
        // All COGR items relate to research
        order.categories = ['Research'];
        order.universityImpactAreas = ['Research Funding', 'Administrative Compliance'];
        
        // Add president if missing
        if (!order.president) {
          order.president = determinePresident(order);
        }
      }
      
      // Update cache
      cache.lastUpdated = new Date().toISOString();
      cache.resources = orders;
      writeJsonFile(cacheFile, cache);
      
      // Return standardized orders
      return orders.map(order => this.standardizeOrder(order));
    } catch (error) {
      this.handleError(error, 'fetchOrders');
      return [];
    }
  }
  
  /**
   * Fetches a specific executive order by ID or number
   * @param {string} identifier Order identifier (number)
   * @returns {Promise<Object>} Executive order in standardized format
   */
  async fetchOrderById(identifier) {
    try {
      this.logger.info(`Fetching executive order ${identifier} from COGR source`);
      
      // Fetch all orders and find the matching one
      const orders = await this.fetchOrders();
      const order = orders.find(o => o.order_number === identifier);
      
      if (order) {
        this.logger.info(`Found order ${identifier} in COGR source`);
        return order;
      }
      
      this.logger.info(`Order ${identifier} not found in COGR source`);
      return null;
    } catch (error) {
      this.handleError(error, 'fetchOrderById', { identifier });
      return null;
    }
  }
  
  /**
   * Standardizes a COGR order
   * @param {Object} order Order from COGR
   * @returns {Object} Standardized order
   */
  standardizeOrder(order) {
    // Standardize order and add COGR-specific metadata
    const standardOrder = super.standardizeOrder(order);
    
    // Add special tags for research institution analysis
    standardOrder.metadata.has_research_institution_analysis = true;
    standardOrder.metadata.analysis_source = 'COGR';
    
    // If analysis links are available, add them to metadata
    if (order.analysis_links && order.analysis_links.length > 0) {
      standardOrder.metadata.analysis_links = order.analysis_links;
    }
    
    return standardOrder;
  }
}

module.exports = COGRSource;