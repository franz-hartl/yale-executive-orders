const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const axios = require('axios');
require('dotenv').config();
const scraperConfig = require('./config/scraper_config');
const TextChunker = require('./utils/text_chunker');
const aiCache = require('./utils/ai_cache');

class AIWebScraper {
  constructor() {
    this.browser = null;
    this.dataSources = [
      {
        name: scraperConfig.federalRegister.name,
        baseUrl: scraperConfig.federalRegister.baseUrl,
        selectors: scraperConfig.federalRegister.selectors
      },
      {
        name: scraperConfig.whiteHouse.name,
        baseUrl: scraperConfig.whiteHouse.baseUrl,
        selectors: scraperConfig.whiteHouse.selectors
      },
      // Additional sources are configured in scraper_config.js
    ];
    this.extractedData = [];
    this.config = scraperConfig; // Store config for later use
    this.textChunker = new TextChunker(); // For handling long documents
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: this.config.browser.headless,
      args: this.config.browser.args
    });
  }

  async scrapeSource(source, pageLimit = null) {
    // Use pageLimit from config if not provided
    pageLimit = pageLimit || this.config.general.pageLimit;
    console.log(`Scraping data from ${source.name}...`);
    let allOrders = [];

    for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
      // Use pagination parameter from config if available
      const paginationParam = this.getSourceConfig(source.name).paginationParam || 'page';
      const url = pageNum > 1 ? `${source.baseUrl}?${paginationParam}=${pageNum}` : source.baseUrl;
      
      const page = await this.browser.newPage();
      await page.setUserAgent(this.config.browser.userAgent);
      
      try {
        await page.goto(url, { 
          waitUntil: this.config.browser.waitUntil, 
          timeout: this.config.browser.timeout 
        });
        
        // Check if the page structure matches expected selectors
        const hasExpectedStructure = await page.evaluate((selector) => {
          return document.querySelectorAll(selector).length > 0;
        }, source.selectors.orderList);

        if (!hasExpectedStructure) {
          console.log(`Page structure has changed for ${source.name}. Attempting AI-based extraction...`);
          const pageContent = await page.content();
          const extractedItems = await this.extractWithAI(pageContent, source.name);
          allOrders = [...allOrders, ...extractedItems];
        } else {
          // Standard extraction using selectors
          const pageOrders = await page.evaluate((selectors) => {
            const items = Array.from(document.querySelectorAll(selectors.orderList));
            return items.map(item => {
              const titleEl = item.querySelector(selectors.title);
              const dateEl = item.querySelector(selectors.date);
              const numberEl = selectors.number ? item.querySelector(selectors.number) : null;
              
              return {
                title: titleEl ? titleEl.textContent.trim() : '',
                url: titleEl && titleEl.href ? titleEl.href : '',
                date: dateEl ? dateEl.textContent.trim() : '',
                number: numberEl ? numberEl.textContent.trim() : ''
              };
            });
          }, source.selectors);
          
          allOrders = [...allOrders, ...pageOrders];
        }
      } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
      } finally {
        await page.close();
      }
    }
    
    return allOrders;
  }
  
  /**
   * Get source-specific configuration
   * @param {string} sourceName Name of the source
   * @returns {Object} Source configuration or empty object if not found
   */
  getSourceConfig(sourceName) {
    // Convert source name to camelCase for config lookup
    const sourceKey = sourceName.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s(.)/g, ($1) => $1.toUpperCase())
      .replace(/\s/g, '')
      .replace(/^(.)/, ($1) => $1.toLowerCase());
    
    return this.config[sourceKey] || {};
  }

  async extractWithAI(htmlContent, sourceName) {
    try {
      // Get AI extraction config
      const aiConfig = this.config.aiExtraction;
      
      // Simplified content for API request
      const simplifiedHtml = htmlContent.substring(0, 100000); // Limit content size

      // Prepare prompt from template
      const prompt = aiConfig.promptTemplate
        .replace('{{sourceName}}', sourceName)
        .replace('{{htmlContent}}', simplifiedHtml);

      // Prepare the request object
      const request = {
        model: aiConfig.model,
        max_tokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        system: "You are an expert assistant that extracts structured data from HTML content.",
        messages: [{ role: "user", content: prompt }]
      };

      // Check if we have a cached response
      const cachedResponse = aiCache.getCachedResponse(request);
      if (cachedResponse) {
        console.log(`Using cached AI extraction for ${sourceName}`);
        // Use the cached response
        const responseText = cachedResponse.content[0].text;
        
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      // If no cache hit, call the API
      console.log(`Making AI extraction API call for ${sourceName}`);
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': process.env.ANTHROPIC_API_KEY
          }
        }
      );

      // Cache the response for future use
      aiCache.cacheResponse(request, response.data);

      const responseText = response.data.content[0].text;
      
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      console.log('AI extraction did not return valid JSON:', responseText);
      return [];
    } catch (error) {
      console.error('Error during AI extraction:', error.message);
      return [];
    }
  }

  async fetchFullTextAndEnrich(orders) {
    console.log('Fetching full text and enriching data...');
    const enrichedOrders = [];

    for (const order of orders) {
      if (!order.url) continue;

      try {
        const page = await this.browser.newPage();
        await page.goto(order.url, { 
          waitUntil: this.config.browser.waitUntil, 
          timeout: this.config.browser.timeout 
        });
        
        // Extract the full text using available selectors
        const fullText = await page.evaluate(() => {
          // Try common content selectors in order of likelihood
          const selectors = [
            '.body-content',
            'article', 
            '.main-content',
            '.order-content',
            '#main-content',
            '.content-area'
          ];
          
          for (const selector of selectors) {
            const contentElement = document.querySelector(selector);
            if (contentElement) {
              return contentElement.textContent.trim();
            }
          }
          
          // Fallback to using the entire body content
          return document.body.textContent.trim();
        });

        // Enrich with AI analysis
        const enrichedData = await this.enrichWithAI(order, fullText);
        enrichedOrders.push(enrichedData);
        
        await page.close();
      } catch (error) {
        console.error(`Error fetching full text for ${order.title}:`, error.message);
        enrichedOrders.push(order); // Add original order if enrichment fails
      }
    }

    return enrichedOrders;
  }

  async enrichWithAI(order, fullText) {
    try {
      // Get AI enrichment config
      const aiConfig = this.config.aiEnrichment;
      
      // Check if we need to chunk the text due to length
      if (fullText.length > this.config.chunking.chunkingThreshold && this.config.chunking.enabled) {
        console.log(`Text is ${fullText.length} characters long, splitting into chunks for processing...`);
        return await this.processLongTextWithChunking(order, fullText, aiConfig);
      }
      
      // For shorter texts, process normally
      const truncatedText = fullText.substring(0, this.config.general.contentTruncationSize);

      // Prepare prompt from template
      const prompt = aiConfig.promptTemplate
        .replace('{{title}}', order.title)
        .replace('{{number}}', order.number || 'Unknown')
        .replace('{{date}}', order.date || 'Unknown')
        .replace('{{fullText}}', truncatedText);

      // Prepare the request object
      const request = {
        model: aiConfig.model,
        max_tokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        system: "You are an expert in government policy analysis, specializing in executive orders across all policy domains, with particular knowledge of how executive orders impact Yale University and higher education institutions.",
        messages: [{ role: "user", content: prompt }]
      };

      // Check if we have a cached response
      const cachedResponse = aiCache.getCachedResponse(request);
      if (cachedResponse) {
        console.log(`Using cached AI enrichment for "${order.title}"`);
        const responseText = cachedResponse.content[0].text;
        
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const enrichment = JSON.parse(jsonMatch[0]);
          
          // Convert Yale impact areas to include IDs for easier database integration
          if (enrichment.yaleImpactAreas && Array.isArray(enrichment.yaleImpactAreas)) {
            enrichment.yaleImpactAreasWithIds = enrichment.yaleImpactAreas.map(area => ({
              ...area,
              id: this.config.yaleImpactAreaMapping[area.name] || null
            }));
          }
          
          return { ...order, ...enrichment };
        }
      }

      // If no cache hit, call the API
      console.log(`Making AI enrichment API call for "${order.title}"`);
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': process.env.ANTHROPIC_API_KEY
          }
        }
      );

      // Cache the response for future use
      aiCache.cacheResponse(request, response.data);

      const responseText = response.data.content[0].text;
      
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enrichment = JSON.parse(jsonMatch[0]);
        
        // Convert Yale impact areas to include IDs for easier database integration
        if (enrichment.yaleImpactAreas && Array.isArray(enrichment.yaleImpactAreas)) {
          enrichment.yaleImpactAreasWithIds = enrichment.yaleImpactAreas.map(area => ({
            ...area,
            id: this.config.yaleImpactAreaMapping[area.name] || null
          }));
        }
        
        return { ...order, ...enrichment };
      }
      
      console.log('AI enrichment did not return valid JSON:', responseText);
      return order;
    } catch (error) {
      console.error('Error during AI enrichment:', error.message);
      return order;
    }
  }
  
  /**
   * Process a long text by splitting it into chunks, analyzing each chunk,
   * and merging the results
   * @param {Object} order - The order being analyzed
   * @param {string} fullText - The full text of the order
   * @param {Object} aiConfig - The AI enrichment configuration
   * @returns {Object} The enriched order with merged analysis
   */
  async processLongTextWithChunking(order, fullText, aiConfig) {
    try {
      // Split the text into chunks
      const chunks = this.textChunker.chunkText(fullText, {
        orderNumber: order.number,
        orderTitle: order.title,
        orderDate: order.date
      });
      
      console.log(`Split text into ${chunks.length} chunks for processing`);
      
      // Process each chunk
      const chunkResults = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`Processing chunk ${i+1} of ${chunks.length} (${chunk.originalText.length} characters)`);
        
        // Prepare prompt from template
        const prompt = aiConfig.promptTemplate
          .replace('{{title}}', order.title)
          .replace('{{number}}', order.number || 'Unknown')
          .replace('{{date}}', order.date || 'Unknown')
          .replace('{{fullText}}', chunk.text);

        // Prepare the request object
        const request = {
          model: aiConfig.model,
          max_tokens: aiConfig.maxTokens,
          temperature: aiConfig.temperature,
          system: "You are an expert in government policy analysis, specializing in executive orders across all policy domains, with particular knowledge of how executive orders impact Yale University and higher education institutions.",
          messages: [{ role: "user", content: prompt }]
        };

        // Generate a cache key for this specific chunk, including the chunk index
        const chunkRequest = {
          ...request,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.totalChunks
        };

        // Check if we have a cached response for this chunk
        const cachedResponse = aiCache.getCachedResponse(chunkRequest);
        let responseText;
        
        if (cachedResponse) {
          console.log(`Using cached AI response for chunk ${i+1} of "${order.title}"`);
          responseText = cachedResponse.content[0].text;
        } else {
          // If no cache hit, call the API
          console.log(`Making AI API call for chunk ${i+1} of "${order.title}"`);
          const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            request,
            {
              headers: {
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': process.env.ANTHROPIC_API_KEY
              }
            }
          );

          // Cache the response for future use
          aiCache.cacheResponse(chunkRequest, response.data);
          responseText = response.data.content[0].text;
        }
        
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const enrichment = JSON.parse(jsonMatch[0]);
            // Add chunk metadata to the result
            chunkResults.push({
              ...enrichment,
              chunkIndex: chunk.chunkIndex,
              totalChunks: chunk.totalChunks,
              isChunked: true,
              metadata: chunk.metadata
            });
          } catch (parseError) {
            console.error(`Error parsing JSON from chunk ${i+1}:`, parseError.message);
          }
        } else {
          console.log(`Chunk ${i+1} did not return valid JSON:`, responseText.substring(0, 100) + '...');
        }
      }
      
      // Merge the chunk results
      if (chunkResults.length === 0) {
        console.log('No valid chunk results were obtained, falling back to truncated text');
        // Fall back to processing a truncated version of the text
        const truncatedText = fullText.substring(0, this.config.general.contentTruncationSize);
        return await this.enrichWithAI(order, truncatedText);
      }
      
      const mergedResults = this.textChunker.mergeChunkResults(chunkResults);
      
      // Convert Yale impact areas to include IDs for easier database integration
      if (mergedResults.yaleImpactAreas && Array.isArray(mergedResults.yaleImpactAreas)) {
        mergedResults.yaleImpactAreasWithIds = mergedResults.yaleImpactAreas.map(area => ({
          ...area,
          id: this.config.yaleImpactAreaMapping[area.name] || null
        }));
      }
      
      console.log(`Successfully merged results from ${chunkResults.length} chunks`);
      
      // Return the merged results along with the original order data
      return { 
        ...order, 
        ...mergedResults,
        processingMethod: 'chunked',
        chunksProcessed: chunkResults.length
      };
      
    } catch (error) {
      console.error('Error during chunked processing:', error.message);
      // Fall back to processing a truncated version of the text
      console.log('Falling back to truncated text processing');
      const truncatedText = fullText.substring(0, this.config.general.contentTruncationSize);
      return await this.enrichWithAI(order, truncatedText);
    }
  }

  // Return all orders without filtering for financial relevance
  async processOrders(orders) {
    // No filtering - just return all orders for comprehensive coverage
    return orders;
  }

  async scrapeAndProcess() {
    try {
      await this.initialize();
      
      // Load additional sources dynamically from config
      this.loadSourcesFromConfig();
      
      // Clean up expired cache entries
      const clearedEntries = aiCache.clearExpiredEntries();
      if (clearedEntries > 0) {
        console.log(`Cleared ${clearedEntries} expired cache entries`);
      }
      
      // Log cache statistics
      const cacheStats = aiCache.getStats();
      console.log(`AI cache stats: ${cacheStats.entries} entries, ${cacheStats.size} KB total size`);
      
      let allOrders = [];
      for (const source of this.dataSources) {
        const sourceOrders = await this.scrapeSource(source);
        allOrders = [...allOrders, ...sourceOrders];
      }
      
      console.log(`Found ${allOrders.length} potential executive orders`);
      
      // Enrich data with full text and AI analysis
      const enrichedOrders = await this.fetchFullTextAndEnrich(allOrders);
      
      // Process all orders without filtering for financial relevance
      const processedOrders = await this.processOrders(enrichedOrders);
      
      console.log(`Processing ${processedOrders.length} executive orders`);
      
      // Save the results using paths from config
      await fs.writeFile(
        this.config.general.outputJsonPath, 
        JSON.stringify(processedOrders, null, 2)
      );
      
      // Create CSV output
      const headers = ['Number', 'Title', 'Date', 'President', 'Summary', 'Impact', 'Policy Tags', 'Affected Sectors', 'URL'];
      let csvContent = headers.join(',') + '\n';
      
      for (const order of processedOrders) {
        const row = [
          order.number || 'Unknown',
          `"${(order.title || '').replace(/"/g, '""')}"`,
          order.date || '',
          order.president || '',
          `"${(order.summary || '').replace(/"/g, '""')}"`,
          `"${(order.impact || order.financialImpact || '').replace(/"/g, '""')}"`,
          `"${(order.policyTags || []).join(', ')}"`,
          `"${(order.affectedSectors || []).join(', ')}"`,
          order.url || ''
        ];
        csvContent += row.join(',') + '\n';
      }
      
      await fs.writeFile(this.config.general.outputCsvPath, csvContent);
      
      // Final cache statistics after processing
      const finalCacheStats = aiCache.getStats();
      console.log(`AI cache final stats: ${finalCacheStats.entries} entries, ${finalCacheStats.size} KB total size`);
      
      if (finalCacheStats.hitCount > 0 || finalCacheStats.missCount > 0) {
        console.log(`Cache performance: ${finalCacheStats.hitCount} hits, ${finalCacheStats.missCount} misses, ${finalCacheStats.hitRate}% hit rate`);
        console.log(`Estimated API cost savings: $${((finalCacheStats.hitCount * 0.015) / 1000).toFixed(2)}`);
      }
      
      // Update cache statistics file
      aiCache.updateStats();
      
      console.log('Scraping and processing complete!');
    } catch (error) {
      console.error('Error during scraping process:', error);
    } finally {
      if (this.browser) await this.browser.close();
    }
  }
  
  /**
   * Load additional sources from config
   */
  loadSourcesFromConfig() {
    // Check for NSF source in config
    if (this.config.nsf) {
      this.dataSources.push({
        name: this.config.nsf.name,
        baseUrl: this.config.nsf.baseUrl,
        selectors: this.config.nsf.selectors
      });
    }
    
    // Check for NIH source in config
    if (this.config.nih) {
      this.dataSources.push({
        name: this.config.nih.name,
        baseUrl: this.config.nih.baseUrl,
        selectors: this.config.nih.selectors
      });
    }
    
    // Check for COGR source in config
    if (this.config.cogr) {
      this.dataSources.push({
        name: this.config.cogr.name,
        baseUrl: this.config.cogr.baseUrl,
        selectors: this.config.cogr.selectors
      });
    }
    
    // Check for ACE source in config
    if (this.config.ace) {
      this.dataSources.push({
        name: this.config.ace.name,
        baseUrl: this.config.ace.baseUrl,
        selectors: this.config.ace.selectors
      });
    }
    
    console.log(`Loaded ${this.dataSources.length} data sources from configuration`);
  }
}

// Run the scraper
const scraper = new AIWebScraper();
scraper.scrapeAndProcess();
