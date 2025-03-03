/**
 * nsf_source.js
 * 
 * Data source adapter for the National Science Foundation (NSF),
 * which provides implementation information for executive orders
 * affecting grant procedures and research policies.
 */

const BaseSource = require('./base_source');
const { makeRequestWithRetry, extractTextFromHtml } = require('../utils/http');
const { determinePresident, ensureDirectoryExists, writeJsonFile } = require('../utils/common');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

/**
 * NSF source adapter for grant-implementation focused information
 */
class NSFSource extends BaseSource {
  /**
   * Constructor for NSFSource
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'National Science Foundation',
      description: 'Executive order implementation information from NSF',
      ...options
    });
    
    this.baseUrl = 'https://www.nsf.gov';
    this.policyUrl = options.policyUrl || 'https://www.nsf.gov/bfa/dias/policy/';
    this.bulletinsUrl = options.bulletinsUrl || 'https://www.nsf.gov/publications/pub_summ.jsp?ods_key=policyoutreach';
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'external_sources', 'nsf');
    this.requestDelay = options.requestDelay || 2000;
  }
  
  /**
   * Initializes the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing NSF source');
    
    // Ensure storage directory exists
    ensureDirectoryExists(this.storageDir);
    
    // Create cache file if it doesn't exist
    const cacheFile = path.join(this.storageDir, 'nsf_cache.json');
    if (!fs.existsSync(cacheFile)) {
      writeJsonFile(cacheFile, {
        lastUpdated: null,
        resources: []
      });
    }
  }
  
  /**
   * Fetches executive order implementations from NSF
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    try {
      this.logger.info('Fetching executive order implementations from NSF');
      
      const {
        forceRefresh = false,
        maxPages = 3
      } = options;
      
      // Check if we should use cached data
      const cacheFile = path.join(this.storageDir, 'nsf_cache.json');
      const cache = fs.existsSync(cacheFile) ? 
        JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : 
        { lastUpdated: null, resources: [] };
      
      const cacheAge = cache.lastUpdated ? 
        (new Date() - new Date(cache.lastUpdated)) / (1000 * 60 * 60 * 24) : 
        999;
      
      // If cache is less than 14 days old and we're not forcing refresh, use cache
      if (cache.lastUpdated && cacheAge < 14 && !forceRefresh && cache.resources.length > 0) {
        this.logger.info(`Using cached NSF data (${cacheAge.toFixed(1)} days old)`);
        return cache.resources.map(resource => this.standardizeOrder(resource));
      }
      
      // Otherwise, fetch fresh data
      this.logger.info('Fetching fresh implementation data from NSF');
      
      const implementations = [];
      
      // Fetch from policy page
      try {
        const policyHtml = await makeRequestWithRetry(this.policyUrl, {
          requestDelay: this.requestDelay
        });
        
        const $ = cheerio.load(policyHtml);
        
        // Look for executive order mentions
        $('a').each((i, element) => {
          const text = $(element).text().trim();
          const href = $(element).attr('href');
          
          if (text.toLowerCase().includes('executive order') || 
              text.toLowerCase().includes('e.o.') || 
              (href && href.toLowerCase().includes('eo'))) {
            
            implementations.push({
              title: text,
              url: href && href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
              source: 'NSF Policy',
              summary: `NSF implementation information: ${text}`,
              type: 'policy'
            });
          }
        });
        
        this.logger.debug(`Found ${implementations.length} executive order references on NSF policy page`);
      } catch (policyError) {
        this.logger.warn(`Error fetching NSF policy page: ${policyError.message}`);
      }
      
      // Fetch from bulletins
      try {
        const bulletinsHtml = await makeRequestWithRetry(this.bulletinsUrl, {
          requestDelay: this.requestDelay
        });
        
        const $ = cheerio.load(bulletinsHtml);
        
        // Look for bulletins about executive orders
        $('a').each((i, element) => {
          const text = $(element).text().trim();
          const href = $(element).attr('href');
          
          if ((text.toLowerCase().includes('executive order') || text.toLowerCase().includes('e.o.')) &&
              href && (href.endsWith('.pdf') || href.includes('policyletter'))) {
            
            implementations.push({
              title: text,
              url: href.startsWith('http') ? href : `${this.baseUrl}${href.startsWith('/') ? '' : '/'}${href}`,
              source: 'NSF Bulletin',
              summary: `NSF bulletin regarding: ${text}`,
              type: 'bulletin'
            });
          }
        });
        
        this.logger.debug(`Found ${implementations.length - implementations.filter(i => i.type === 'policy').length} executive order references on NSF bulletins page`);
      } catch (bulletinsError) {
        this.logger.warn(`Error fetching NSF bulletins page: ${bulletinsError.message}`);
      }
      
      // Extract order number and additional details from each implementation
      for (let i = 0; i < implementations.length; i++) {
        const impl = implementations[i];
        
        try {
          // Extract order number from title if possible
          const orderNumberMatch = impl.title.match(/(?:Executive Order|E\.O\.|EO)\s*(?:No\.\s*)?(\d+)/i);
          if (orderNumberMatch) {
            impl.order_number = orderNumberMatch[1];
          }
          
          // Fetch the implementation document if it's HTML (skip PDFs for now)
          if (impl.url && !impl.url.endsWith('.pdf')) {
            const implHtml = await makeRequestWithRetry(impl.url, {
              requestDelay: this.requestDelay
            });
            
            const $ = cheerio.load(implHtml);
            
            // Extract main content
            const content = $('.main-content, #content, article').text();
            if (content) {
              impl.full_text = content.trim();
              
              // Extract a better summary if possible
              const paragraphs = $('.main-content p, #content p, article p');
              if (paragraphs.length > 0) {
                const firstPara = $(paragraphs[0]).text().trim();
                if (firstPara && firstPara.length > 20) {
                  impl.summary = firstPara;
                }
              }
              
              // Try to extract date
              const dateText = $('.date, time, .published').text().trim();
              if (dateText) {
                const dateMatch = dateText.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
                if (dateMatch) {
                  const [_, month, day, year] = dateMatch;
                  impl.publication_date = `20${year.length === 2 ? year : year.substring(2)}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
              
              // If order number wasn't in title, try to find it in content
              if (!impl.order_number) {
                const contentOrderMatch = content.match(/(?:Executive Order|E\.O\.|EO)\s*(?:No\.\s*)?(\d+)/i);
                if (contentOrderMatch) {
                  impl.order_number = contentOrderMatch[1];
                }
              }
            }
          }
        } catch (implError) {
          this.logger.warn(`Error processing implementation document: ${implError.message}`);
        }
        
        // Add common fields
        impl.source = 'NSF';
        impl.president = determinePresident(impl);
        impl.categories = ['Research'];
        impl.universityImpactAreas = ['Research Funding', 'Administrative Compliance'];
        impl.yaleImpactAreas = [
          { id: 1, name: 'Research & Innovation' },
          { id: 2, name: 'Research Security & Export Control' }
        ];
        impl.yaleStakeholders = [
          { id: 2, name: 'Office of Research Administration' },
          { id: 4, name: 'Graduate School of Arts and Sciences' }
        ];
        
        // Add delay between requests
        if (i < implementations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.requestDelay));
        }
      }
      
      // Filter out items without order numbers if requested
      const filteredImplementations = options.requireOrderNumber 
        ? implementations.filter(impl => impl.order_number)
        : implementations;
      
      this.logger.info(`Found ${filteredImplementations.length} NSF implementation documents related to executive orders`);
      
      // Update cache
      cache.lastUpdated = new Date().toISOString();
      cache.resources = filteredImplementations;
      writeJsonFile(cacheFile, cache);
      
      // Return standardized implementations
      return filteredImplementations.map(impl => this.standardizeOrder(impl));
    } catch (error) {
      this.handleError(error, 'fetchOrders');
      return [];
    }
  }
  
  /**
   * Fetches a specific executive order implementation by order number
   * @param {string} identifier Order number
   * @returns {Promise<Object>} Executive order implementation in standardized format
   */
  async fetchOrderById(identifier) {
    try {
      this.logger.info(`Fetching NSF implementation for executive order ${identifier}`);
      
      // Fetch all implementations and find the matching one
      const implementations = await this.fetchOrders();
      const implementation = implementations.find(impl => impl.order_number === identifier);
      
      if (implementation) {
        this.logger.info(`Found NSF implementation for order ${identifier}`);
        return implementation;
      }
      
      this.logger.info(`No NSF implementation found for order ${identifier}`);
      return null;
    } catch (error) {
      this.handleError(error, 'fetchOrderById', { identifier });
      return null;
    }
  }
  
  /**
   * Standardizes an NSF implementation
   * @param {Object} implementation NSF implementation data
   * @returns {Object} Standardized order
   */
  standardizeOrder(implementation) {
    // Standardize implementation and add NSF-specific metadata
    const standardOrder = super.standardizeOrder(implementation);
    
    // Add implementation-specific metadata
    standardOrder.metadata.has_implementation_guidance = true;
    standardOrder.metadata.implementation_source = 'NSF';
    standardOrder.metadata.implementation_type = implementation.type || 'policy';
    
    return standardOrder;
  }
}

module.exports = NSFSource;