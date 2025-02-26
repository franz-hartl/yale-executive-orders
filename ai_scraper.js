const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const axios = require('axios');
require('dotenv').config();

class AIWebScraper {
  constructor() {
    this.browser = null;
    this.dataSources = [
      {
        name: 'Federal Register',
        baseUrl: 'https://www.federalregister.gov/presidential-documents/executive-orders',
        selectors: {
          orderList: '.document-list .document-wrapper',
          title: '.title a',
          date: '.metadata .date',
          number: '.metadata .executive-order-number'
        }
      },
      {
        name: 'White House',
        baseUrl: 'https://www.whitehouse.gov/briefing-room/presidential-actions/',
        selectors: {
          orderList: '.news-item-wrapper',
          title: '.news-item__title a',
          date: '.news-item__date'
        }
      },
      // Additional sources can be added here
    ];
    this.extractedData = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async scrapeSource(source, pageLimit = 5) {
    console.log(`Scraping data from ${source.name}...`);
    let allOrders = [];

    for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
      const url = pageNum > 1 ? `${source.baseUrl}?page=${pageNum}` : source.baseUrl;
      
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        
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

  async extractWithAI(htmlContent, sourceName) {
    try {
      // Simplified content for API request
      const simplifiedHtml = htmlContent.substring(0, 100000); // Limit content size

      // Call Anthropic API
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: "claude-3-haiku-20240307",
          max_tokens: 2000,
          system: "You are an expert assistant that extracts structured data from HTML content.",
          messages: [
            {
              role: "user",
              content: `Extract executive order information from ${sourceName} in the HTML content below. 
Extract only executive orders related to financial or economic matters.
For each executive order, extract:
1. Title
2. Date (publication or signing date)
3. Executive Order number (if available)
4. URL to the full text (if available)

Return your response as a valid JSON array of objects with these fields.

HTML Content:
${simplifiedHtml}`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': process.env.ANTHROPIC_API_KEY
          }
        }
      );

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
        await page.goto(order.url, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Extract the full text
        const fullText = await page.evaluate(() => {
          const contentElement = document.querySelector('.body-content') || 
                                document.querySelector('article') || 
                                document.querySelector('.main-content');
          return contentElement ? contentElement.textContent.trim() : '';
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
      // Truncate full text to fit within token limits
      const truncatedText = fullText.substring(0, 15000);

      // Call Anthropic API
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: "claude-3-opus-20240229",  // Using Opus for deeper analysis
          max_tokens: 1000,
          system: "You are an expert in finance, economics, and government policy analysis, specializing in executive orders.",
          messages: [
            {
              role: "user",
              content: `Analyze this executive order and extract/generate the following information:
1. A 2-3 sentence summary of the order
2. Key financial impact(s)
3. Policy area tags (e.g., "banking", "securities", "fiscal_policy")
4. Affected sectors of the economy
5. Determine the president who issued this order

Executive Order Title: ${order.title}
Executive Order Number: ${order.number || 'Unknown'}
Date: ${order.date || 'Unknown'}
Full Text:
${truncatedText}

Return the information in JSON format with these fields: summary, financialImpact, policyTags, affectedSectors, president`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': process.env.ANTHROPIC_API_KEY
          }
        }
      );

      const responseText = response.data.content[0].text;
      
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enrichment = JSON.parse(jsonMatch[0]);
        return { ...order, ...enrichment };
      }
      
      console.log('AI enrichment did not return valid JSON:', responseText);
      return order;
    } catch (error) {
      console.error('Error during AI enrichment:', error.message);
      return order;
    }
  }

  async detectFinancialRelevance(orders) {
    const relevantOrders = [];
    
    for (const order of orders) {
      // Combine available text for analysis
      const combinedText = `${order.title} ${order.summary || ''} ${order.financialImpact || ''}`;
      
      // Simple keyword-based relevance check
      const financialKeywords = [
        'financ', 'econom', 'bank', 'currenc', 'money', 'tax', 'fiscal', 
        'budget', 'treasury', 'securities', 'invest', 'capital', 'market',
        'trade', 'tariff', 'sanction', 'debt', 'credit', 'loan', 'mortgage'
      ];
      
      const isRelevant = financialKeywords.some(keyword => 
        combinedText.toLowerCase().includes(keyword)
      );
      
      if (isRelevant) {
        relevantOrders.push(order);
      }
    }
    
    return relevantOrders;
  }

  async scrapeAndProcess() {
    try {
      await this.initialize();
      
      let allOrders = [];
      for (const source of this.dataSources) {
        const sourceOrders = await this.scrapeSource(source);
        allOrders = [...allOrders, ...sourceOrders];
      }
      
      console.log(`Found ${allOrders.length} potential executive orders`);
      
      // Enrich data with full text and AI analysis
      const enrichedOrders = await this.fetchFullTextAndEnrich(allOrders);
      
      // Filter for financial relevance
      const financialOrders = await this.detectFinancialRelevance(enrichedOrders);
      
      console.log(`Filtered to ${financialOrders.length} finance-related executive orders`);
      
      // Save the results
      await fs.writeFile('./financial_executive_orders.json', JSON.stringify(financialOrders, null, 2));
      
      // Create CSV output
      const headers = ['Number', 'Title', 'Date', 'President', 'Summary', 'Financial Impact', 'Policy Tags', 'Affected Sectors', 'URL'];
      let csvContent = headers.join(',') + '\n';
      
      for (const order of financialOrders) {
        const row = [
          order.number || 'Unknown',
          `"${(order.title || '').replace(/"/g, '""')}"`,
          order.date || '',
          order.president || '',
          `"${(order.summary || '').replace(/"/g, '""')}"`,
          `"${(order.financialImpact || '').replace(/"/g, '""')}"`,
          `"${(order.policyTags || []).join(', ')}"`,
          `"${(order.affectedSectors || []).join(', ')}"`,
          order.url || ''
        ];
        csvContent += row.join(',') + '\n';
      }
      
      await fs.writeFile('./financial_executive_orders.csv', csvContent);
      
      console.log('Scraping and processing complete!');
    } catch (error) {
      console.error('Error during scraping process:', error);
    } finally {
      if (this.browser) await this.browser.close();
    }
  }
}

// Run the scraper
const scraper = new AIWebScraper();
scraper.scrapeAndProcess();
