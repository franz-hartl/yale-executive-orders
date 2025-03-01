/**
 * nih_source.js
 * 
 * Data source adapter for the National Institutes of Health (NIH),
 * which provides policy notices related to executive orders affecting
 * biomedical research and healthcare policy.
 */

const BaseSource = require('./base_source');
const { makeRequestWithRetry, extractTextFromHtml } = require('../utils/http');
const { determinePresident, ensureDirectoryExists, writeJsonFile } = require('../utils/common');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

/**
 * NIH source adapter for biomedical research policy information
 */
class NIHSource extends BaseSource {
  /**
   * Constructor for NIHSource
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'National Institutes of Health',
      description: 'Policy notices from NIH related to executive orders',
      ...options
    });
    
    this.baseUrl = 'https://grants.nih.gov';
    this.noticesUrl = options.noticesUrl || 'https://grants.nih.gov/grants/guide/notice-files/';
    this.policyUrl = options.policyUrl || 'https://grants.nih.gov/policy/';
    this.searchUrl = options.searchUrl || 'https://grants.nih.gov/search/index.htm';
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'external_sources', 'nih');
    this.requestDelay = options.requestDelay || 2000;
  }
  
  /**
   * Initializes the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing NIH source');
    
    // Ensure storage directory exists
    ensureDirectoryExists(this.storageDir);
    
    // Create cache file if it doesn't exist
    const cacheFile = path.join(this.storageDir, 'nih_cache.json');
    if (!fs.existsSync(cacheFile)) {
      writeJsonFile(cacheFile, {
        lastUpdated: null,
        resources: []
      });
    }
  }
  
  /**
   * Fetches executive order related notices from NIH
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    try {
      this.logger.info('Fetching executive order related notices from NIH');
      
      const {
        forceRefresh = false,
        maxResults = 20
      } = options;
      
      // Check if we should use cached data
      const cacheFile = path.join(this.storageDir, 'nih_cache.json');
      const cache = fs.existsSync(cacheFile) ? 
        JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : 
        { lastUpdated: null, resources: [] };
      
      const cacheAge = cache.lastUpdated ? 
        (new Date() - new Date(cache.lastUpdated)) / (1000 * 60 * 60 * 24) : 
        999;
      
      // If cache is less than 14 days old and we're not forcing refresh, use cache
      if (cache.lastUpdated && cacheAge < 14 && !forceRefresh && cache.resources.length > 0) {
        this.logger.info(`Using cached NIH data (${cacheAge.toFixed(1)} days old)`);
        return cache.resources.map(resource => this.standardizeOrder(resource));
      }
      
      // Otherwise, search for executive order notices
      this.logger.info('Searching for executive order notices from NIH');
      
      const notices = [];
      
      // Construct search URL for executive orders
      const searchUrl = `${this.searchUrl}?term=%22executive+order%22+OR+%22presidential+directive%22&titleAccess=public`;
      
      try {
        const searchHtml = await makeRequestWithRetry(searchUrl, {
          requestDelay: this.requestDelay
        });
        
        const $ = cheerio.load(searchHtml);
        
        // Extract search results
        $('.search-result, .result-item').each((i, element) => {
          if (i >= maxResults) return;
          
          const titleElement = $(element).find('.title, h3, a');
          const title = titleElement.text().trim();
          
          const urlElement = titleElement.is('a') ? titleElement : $(element).find('a').first();
          const url = urlElement.attr('href');
          
          const dateElement = $(element).find('.date, time, .published');
          const dateText = dateElement.text().trim();
          
          const summaryElement = $(element).find('.description, .snippet, .summary, p');
          const summary = summaryElement.text().trim();
          
          // Skip if no title or URL
          if (!title || !url) return;
          
          // Parse date if available
          let publicationDate = null;
          if (dateText) {
            const dateMatch = dateText.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
            if (dateMatch) {
              const [_, month, day, year] = dateMatch;
              publicationDate = `20${year.length === 2 ? year : year.substring(2)}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          
          // Extract notice ID if available
          const noticeMatch = title.match(/(NOT-[A-Z]{2}-\d+-\d+)/i);
          const noticeId = noticeMatch ? noticeMatch[1] : null;
          
          // Extract order number if present in title or summary
          let orderNumber = null;
          const orderNumberMatch = (title + ' ' + summary).match(/Executive Order (?:No\.\s*)?(\d+)/i);
          if (orderNumberMatch) {
            orderNumber = orderNumberMatch[1];
          }
          
          notices.push({
            title,
            order_number: orderNumber,
            document_number: noticeId,
            publication_date: publicationDate,
            summary: summary || title,
            url: url.startsWith('http') ? url : `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`,
            source: 'NIH',
            type: 'notice',
            metadata: {
              notice_id: noticeId
            }
          });
        });
        
        this.logger.debug(`Found ${notices.length} NIH notices potentially related to executive orders`);
      } catch (searchError) {
        this.logger.warn(`Error searching NIH notices: ${searchError.message}`);
      }
      
      // Fetch details for each notice
      for (let i = 0; i < notices.length; i++) {
        const notice = notices[i];
        
        try {
          // Skip if no URL
          if (!notice.url) continue;
          
          // Fetch notice content
          const noticeHtml = await makeRequestWithRetry(notice.url, {
            requestDelay: this.requestDelay
          });
          
          const $ = cheerio.load(noticeHtml);
          
          // Extract main content
          const contentElement = $('#main-content, .main-content, article, .content');
          if (contentElement.length > 0) {
            const content = contentElement.text().trim();
            notice.full_text = content;
            
            // Look for executive order references in content
            if (!notice.order_number) {
              const contentOrderMatch = content.match(/Executive Order (?:No\.\s*)?(\d+)/i);
              if (contentOrderMatch) {
                notice.order_number = contentOrderMatch[1];
              }
            }
            
            // Extract better summary if available
            const firstPara = contentElement.find('p').first().text().trim();
            if (firstPara && firstPara.length > 50) {
              notice.summary = firstPara;
            }
            
            // Extract better date if available
            if (!notice.publication_date) {
              const dateElement = $('.date, .published-date, time').first();
              if (dateElement.length > 0) {
                const dateText = dateElement.text().trim();
                const dateMatch = dateText.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
                if (dateMatch) {
                  const [_, month, day, year] = dateMatch;
                  notice.publication_date = `20${year.length === 2 ? year : year.substring(2)}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
            }
          }
        } catch (noticeError) {
          this.logger.warn(`Error fetching NIH notice details: ${noticeError.message}`);
        }
        
        // Add common fields
        notice.president = determinePresident(notice);
        notice.categories = ['Healthcare', 'Research'];
        notice.universityImpactAreas = ['Research Funding', 'Administrative Compliance'];
        
        // Add delay between requests
        if (i < notices.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.requestDelay));
        }
      }
      
      // Filter notices to only include those with executive order references
      const eoNotices = notices.filter(notice => 
        notice.order_number || 
        notice.title.toLowerCase().includes('executive order') ||
        (notice.full_text && notice.full_text.toLowerCase().includes('executive order'))
      );
      
      this.logger.info(`Found ${eoNotices.length} NIH notices related to executive orders`);
      
      // Update cache
      cache.lastUpdated = new Date().toISOString();
      cache.resources = eoNotices;
      writeJsonFile(cacheFile, cache);
      
      // Return standardized notices
      return eoNotices.map(notice => this.standardizeOrder(notice));
    } catch (error) {
      this.handleError(error, 'fetchOrders');
      return [];
    }
  }
  
  /**
   * Fetches details about a specific executive order
   * @param {string} identifier Order number
   * @returns {Promise<Object>} Executive order implementation in standardized format
   */
  async fetchOrderById(identifier) {
    try {
      this.logger.info(`Fetching NIH notices for executive order ${identifier}`);
      
      // Fetch all notices
      const notices = await this.fetchOrders();
      
      // Find notices related to this order number
      const matchingNotices = notices.filter(notice => notice.order_number === identifier);
      
      if (matchingNotices.length > 0) {
        this.logger.info(`Found ${matchingNotices.length} NIH notices for order ${identifier}`);
        
        // If multiple notices, combine them
        if (matchingNotices.length > 1) {
          const combinedNotice = { ...matchingNotices[0] };
          combinedNotice.title = `NIH Notices Related to Executive Order ${identifier}`;
          combinedNotice.related_notices = matchingNotices.map(notice => ({
            title: notice.title,
            url: notice.url,
            publication_date: notice.publication_date
          }));
          
          return this.standardizeOrder(combinedNotice);
        }
        
        return matchingNotices[0];
      }
      
      this.logger.info(`No NIH notices found for order ${identifier}`);
      return null;
    } catch (error) {
      this.handleError(error, 'fetchOrderById', { identifier });
      return null;
    }
  }
  
  /**
   * Standardizes an NIH notice
   * @param {Object} notice NIH notice data
   * @returns {Object} Standardized order
   */
  standardizeOrder(notice) {
    // Standardize notice and add NIH-specific metadata
    const standardOrder = super.standardizeOrder(notice);
    
    // Add NIH-specific metadata
    standardOrder.metadata.has_nih_notice = true;
    standardOrder.metadata.notice_id = notice.document_number;
    
    if (notice.related_notices) {
      standardOrder.metadata.related_notices = notice.related_notices;
    }
    
    return standardOrder;
  }
}

module.exports = NIHSource;