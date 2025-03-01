/**
 * ace_source.js
 * 
 * Data source adapter for the American Council on Education (ACE),
 * which provides higher education sector-wide analysis of executive order impacts.
 */

const BaseSource = require('./base_source');
const { makeRequestWithRetry, extractTextFromHtml } = require('../utils/http');
const { determinePresident, ensureDirectoryExists, writeJsonFile } = require('../utils/common');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

/**
 * ACE source adapter for higher education policy analyses
 */
class ACESource extends BaseSource {
  /**
   * Constructor for ACESource
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'American Council on Education',
      description: 'Higher education policy analyses from ACE',
      ...options
    });
    
    this.baseUrl = 'https://www.acenet.edu';
    this.policyUrl = options.policyUrl || 'https://www.acenet.edu/Policy-Advocacy/Pages/default.aspx';
    this.searchUrl = options.searchUrl || 'https://www.acenet.edu/search/Pages/results.aspx';
    this.storageDir = options.storageDir || path.join(__dirname, '..', 'external_sources', 'ace');
    this.requestDelay = options.requestDelay || 2000;
  }
  
  /**
   * Initializes the source
   * @returns {Promise<void>}
   */
  async initialize() {
    this.logger.info('Initializing ACE source');
    
    // Ensure storage directory exists
    ensureDirectoryExists(this.storageDir);
    
    // Create cache file if it doesn't exist
    const cacheFile = path.join(this.storageDir, 'ace_cache.json');
    if (!fs.existsSync(cacheFile)) {
      writeJsonFile(cacheFile, {
        lastUpdated: null,
        resources: []
      });
    }
  }
  
  /**
   * Fetches executive order analyses from ACE
   * @param {Object} options Fetch options
   * @returns {Promise<Array>} Array of executive orders in standardized format
   */
  async fetchOrders(options = {}) {
    try {
      this.logger.info('Fetching executive order analyses from ACE');
      
      const {
        forceRefresh = false,
        maxResults = 20
      } = options;
      
      // Check if we should use cached data
      const cacheFile = path.join(this.storageDir, 'ace_cache.json');
      const cache = fs.existsSync(cacheFile) ? 
        JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : 
        { lastUpdated: null, resources: [] };
      
      const cacheAge = cache.lastUpdated ? 
        (new Date() - new Date(cache.lastUpdated)) / (1000 * 60 * 60 * 24) : 
        999;
      
      // If cache is less than 14 days old and we're not forcing refresh, use cache
      if (cache.lastUpdated && cacheAge < 14 && !forceRefresh && cache.resources.length > 0) {
        this.logger.info(`Using cached ACE data (${cacheAge.toFixed(1)} days old)`);
        return cache.resources.map(resource => this.standardizeOrder(resource));
      }
      
      // Otherwise, search for executive order analyses
      this.logger.info('Searching for executive order analyses from ACE');
      
      const analyses = [];
      
      // Construct search URL for executive orders
      const searchUrl = `${this.searchUrl}?k=%22executive%20order%22`;
      
      try {
        const searchHtml = await makeRequestWithRetry(searchUrl, {
          requestDelay: this.requestDelay
        });
        
        const $ = cheerio.load(searchHtml);
        
        // Extract search results
        $('.search-result, .ms-srch-item, .result-item').each((i, element) => {
          if (i >= maxResults) return;
          
          const titleElement = $(element).find('.ms-srch-item-title, .title, h3 a, .headline a');
          const title = titleElement.text().trim();
          
          let url = '';
          if (titleElement.is('a')) {
            url = titleElement.attr('href');
          } else {
            const linkElement = $(element).find('a').first();
            url = linkElement.attr('href');
          }
          
          const dateElement = $(element).find('.date, time, .published, .ms-srch-item-date');
          const dateText = dateElement.text().trim();
          
          const summaryElement = $(element).find('.description, .snippet, .summary, .ms-srch-item-summary');
          const summary = summaryElement.text().trim();
          
          // Skip if no title or URL
          if (!title || !url) return;
          
          // Only include items likely to be about executive orders
          if (!title.toLowerCase().includes('executive order') && 
              !summary.toLowerCase().includes('executive order')) {
            return;
          }
          
          // Parse date if available
          let publicationDate = null;
          if (dateText) {
            const dateMatch = dateText.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
            if (dateMatch) {
              const [_, month, day, year] = dateMatch;
              publicationDate = `20${year.length === 2 ? year : year.substring(2)}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
          
          // Extract order number if present in title or summary
          let orderNumber = null;
          const orderNumberMatch = (title + ' ' + summary).match(/Executive Order (?:No\.\s*)?(\d+)/i);
          if (orderNumberMatch) {
            orderNumber = orderNumberMatch[1];
          }
          
          analyses.push({
            title,
            order_number: orderNumber,
            publication_date: publicationDate,
            summary: summary || title,
            url: url.startsWith('http') ? url : `${this.baseUrl}${url.startsWith('/') ? '' : '/'}${url}`,
            source: 'ACE',
            type: 'analysis'
          });
        });
        
        this.logger.debug(`Found ${analyses.length} ACE analyses potentially related to executive orders`);
      } catch (searchError) {
        this.logger.warn(`Error searching ACE analyses: ${searchError.message}`);
      }
      
      // Fetch details for each analysis
      for (let i = 0; i < analyses.length; i++) {
        const analysis = analyses[i];
        
        try {
          // Skip if no URL
          if (!analysis.url) continue;
          
          // Fetch analysis content
          const analysisHtml = await makeRequestWithRetry(analysis.url, {
            requestDelay: this.requestDelay
          });
          
          const $ = cheerio.load(analysisHtml);
          
          // Extract main content
          const contentElement = $('#main-content, .main-content, article, .content, .content-area');
          if (contentElement.length > 0) {
            const content = contentElement.text().trim();
            analysis.full_text = content;
            
            // Look for executive order references in content
            if (!analysis.order_number) {
              const contentOrderMatch = content.match(/Executive Order (?:No\.\s*)?(\d+)/i);
              if (contentOrderMatch) {
                analysis.order_number = contentOrderMatch[1];
              }
            }
            
            // Extract executive brief (first few paragraphs)
            const paragraphs = contentElement.find('p');
            if (paragraphs.length > 0) {
              let brief = '';
              for (let p = 0; p < Math.min(3, paragraphs.length); p++) {
                brief += $(paragraphs[p]).text().trim() + '\n\n';
              }
              if (brief) {
                analysis.executive_brief = brief.trim();
              }
            }
            
            // Extract better date if available
            if (!analysis.publication_date) {
              const dateElement = $('.date, .published-date, time, .meta-date').first();
              if (dateElement.length > 0) {
                const dateText = dateElement.text().trim();
                const dateMatch = dateText.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
                if (dateMatch) {
                  const [_, month, day, year] = dateMatch;
                  analysis.publication_date = `20${year.length === 2 ? year : year.substring(2)}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
              }
            }
            
            // Extract author if available
            const authorElement = $('.author, .byline, .meta-author').first();
            if (authorElement.length > 0) {
              analysis.metadata = analysis.metadata || {};
              analysis.metadata.author = authorElement.text().trim();
            }
          }
        } catch (analysisError) {
          this.logger.warn(`Error fetching ACE analysis details: ${analysisError.message}`);
        }
        
        // Add common fields
        analysis.president = determinePresident(analysis);
        analysis.categories = ['Education'];
        analysis.universityImpactAreas = ['Administrative Compliance', 'Institutional Accessibility'];
        
        // If we have exec brief but no comprehensive analysis, use the brief
        if (analysis.executive_brief && !analysis.comprehensive_analysis) {
          analysis.comprehensive_analysis = analysis.executive_brief;
        }
        
        // Add delay between requests
        if (i < analyses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, this.requestDelay));
        }
      }
      
      this.logger.info(`Found ${analyses.length} ACE analyses related to executive orders`);
      
      // Update cache
      cache.lastUpdated = new Date().toISOString();
      cache.resources = analyses;
      writeJsonFile(cacheFile, cache);
      
      // Return standardized analyses
      return analyses.map(analysis => this.standardizeOrder(analysis));
    } catch (error) {
      this.handleError(error, 'fetchOrders');
      return [];
    }
  }
  
  /**
   * Fetches analyses about a specific executive order
   * @param {string} identifier Order number
   * @returns {Promise<Object>} Executive order analysis in standardized format
   */
  async fetchOrderById(identifier) {
    try {
      this.logger.info(`Fetching ACE analyses for executive order ${identifier}`);
      
      // Fetch all analyses
      const analyses = await this.fetchOrders();
      
      // Find analyses related to this order number
      const matchingAnalyses = analyses.filter(analysis => analysis.order_number === identifier);
      
      if (matchingAnalyses.length > 0) {
        this.logger.info(`Found ${matchingAnalyses.length} ACE analyses for order ${identifier}`);
        
        // If multiple analyses, combine them
        if (matchingAnalyses.length > 1) {
          const combinedAnalysis = { ...matchingAnalyses[0] };
          combinedAnalysis.title = `ACE Analyses of Executive Order ${identifier}`;
          combinedAnalysis.related_analyses = matchingAnalyses.map(analysis => ({
            title: analysis.title,
            url: analysis.url,
            publication_date: analysis.publication_date
          }));
          
          return this.standardizeOrder(combinedAnalysis);
        }
        
        return matchingAnalyses[0];
      }
      
      this.logger.info(`No ACE analyses found for order ${identifier}`);
      return null;
    } catch (error) {
      this.handleError(error, 'fetchOrderById', { identifier });
      return null;
    }
  }
  
  /**
   * Standardizes an ACE analysis
   * @param {Object} analysis ACE analysis data
   * @returns {Object} Standardized order
   */
  standardizeOrder(analysis) {
    // Standardize analysis and add ACE-specific metadata
    const standardOrder = super.standardizeOrder(analysis);
    
    // Add ACE-specific metadata
    standardOrder.metadata.has_higher_ed_analysis = true;
    standardOrder.metadata.analysis_type = 'higher_education_policy';
    
    if (analysis.related_analyses) {
      standardOrder.metadata.related_analyses = analysis.related_analyses;
    }
    
    return standardOrder;
  }
}

module.exports = ACESource;