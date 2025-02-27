const fs = require('fs').promises;
const axios = require('axios');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
require('dotenv').config();

class DataProcessor {
  constructor(inputPath = './executive_orders.json') {
    this.inputPath = inputPath;
    this.processedData = [];
    this.referenceData = {
      presidents: {
        'Biden': 'Joseph R. Biden Jr.',
        'Trump': 'Donald J. Trump',
        'Obama': 'Barack Obama',
        'Bush': 'George W. Bush',
        'Clinton': 'William J. Clinton'
      },
      policyDomains: [
        'healthcare', 'education', 'environment', 'technology', 'immigration',
        'national security', 'foreign policy', 'civil rights', 'energy',
        'infrastructure', 'agriculture', 'labor', 'housing', 'transportation'
      ]
    };
  }

  async loadData() {
    try {
      const data = await fs.readFile(this.inputPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading data:', error);
      return [];
    }
  }

  async cleanData(orders) {
    return orders.map(order => {
      // Normalize date formats
      let normalizedDate = order.date;
      if (order.date) {
        try {
          const dateObj = new Date(order.date);
          if (!isNaN(dateObj.getTime())) {
            normalizedDate = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
          }
        } catch (error) {
          console.warn(`Could not parse date: ${order.date}`);
        }
      }

      // Clean executive order number (standardize format)
      let cleanNumber = order.number;
      if (order.number) {
        // Extract digits only if it contains text like "EO" or "Executive Order"
        if (/[a-zA-Z]/.test(order.number)) {
          const matches = order.number.match(/\d+/);
          cleanNumber = matches ? matches[0] : order.number;
        }
      }

      // Clean title (remove redundant prefixes)
      let cleanTitle = order.title || '';
      cleanTitle = cleanTitle.replace(/^Executive Order:?\s+/i, '');
      cleanTitle = cleanTitle.replace(/^EO\s+\d+:?\s+/i, '');

      return {
        ...order,
        date: normalizedDate,
        number: cleanNumber,
        title: cleanTitle
      };
    });
  }

  async validateData(orders) {
    return orders.filter(order => {
      // Keep only orders with at least title and date
      if (!order.title || order.title.trim() === '') {
        console.warn('Filtered out order with no title');
        return false;
      }

      // Validate date format
      if (order.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(order.date)) {
          console.warn(`Invalid date format for order ${order.title}: ${order.date}`);
          // We'll still keep the order but with warning
        }
      }

      return true;
    });
  }

  async deduplicateOrders(orders) {
    const uniqueOrders = {};
    
    for (const order of orders) {
      const key = order.number ? order.number : order.title;
      
      if (!uniqueOrders[key] || this.isMoreComplete(order, uniqueOrders[key])) {
        uniqueOrders[key] = order;
      }
    }
    
    return Object.values(uniqueOrders);
  }

  isMoreComplete(newOrder, existingOrder) {
    // Count non-empty fields to determine which record is more complete
    const countNonEmpty = (obj) => {
      return Object.values(obj).filter(val => 
        val && (typeof val === 'string' ? val.trim() !== '' : true)
      ).length;
    };
    
    return countNonEmpty(newOrder) > countNonEmpty(existingOrder);
  }

  async crossReferenceData(orders) {
    console.log('Cross-referencing data...');
    
    // Build a map of order numbers to full order data
    const orderMap = {};
    orders.forEach(order => {
      if (order.number) {
        orderMap[order.number] = order;
      }
    });
    
    // Cross-reference with an external API for verification
    // This is a simplified example - in production, you'd use a real API
    try {
      const response = await axios.get('https://www.federalregister.gov/api/v1/documents.json?conditions%5Bpresidential_document_type%5D=executive_order&per_page=100');
      
      if (response.data.results) {
        for (const apiOrder of response.data.results) {
          const orderNumber = apiOrder.executive_order_number;
          
          if (orderNumber && orderMap[orderNumber]) {
            // Merge data, preferring our enriched data but filling missing fields
            orderMap[orderNumber] = {
              ...apiOrder, // Base data from API
              ...orderMap[orderNumber], // Our data takes precedence
              // Always take these fields from the API
              publication_date: apiOrder.publication_date || orderMap[orderNumber].date,
              signing_date: apiOrder.signing_date
            };
          }
        }
      }
    } catch (error) {
      console.error('Error cross-referencing with external API:', error.message);
    }
    
    return Object.values(orderMap);
  }

  async categorizeByAI(orders) {
    console.log('Categorizing orders using AI...');
    const categorizedOrders = [];
    
    for (const order of orders) {
      try {
        const prompt = `
Categorize this executive order across all policy domains. Based on the title and any available information, assign appropriate:
1. Primary category (single most relevant category)
2. Secondary categories (up to 3 additional relevant categories)
3. Administration period
4. Sector impacts (which sectors are most affected)

Title: ${order.title}
Number: ${order.number || 'Unknown'}
Date: ${order.date || 'Unknown'}
Summary: ${order.summary || 'Not available'}

Available policy categories:
- Healthcare
- Education
- Environment
- Technology
- Immigration
- National Security
- Foreign Policy
- Civil Rights
- Energy
- Infrastructure
- Agriculture
- Labor
- Housing
- Transportation
- Other (please specify)

Return your analysis as JSON with these fields: primaryCategory, secondaryCategories, administration, impactedSectors
`;

        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: "claude-3-sonnet-20240229",
            max_tokens: 800,
            temperature: 0.3,
            system: "You are an expert in government policy analysis, specializing in categorizing executive orders across all policy domains.",
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
              'x-api-key': process.env.ANTHROPIC_API_KEY
            }
          }
        );

        const responseText = response.data.content[0].text;
        
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const categories = JSON.parse(jsonMatch[0]);
          categorizedOrders.push({
            ...order,
            ...categories
          });
        } else {
          categorizedOrders.push(order);
        }
      } catch (error) {
        console.error(`Error categorizing order ${order.title}:`, error.message);
        categorizedOrders.push(order);
      }
    }
    
    return categorizedOrders;
  }

  async generateEmbeddings(orders) {
    console.log('Generating embeddings for semantic search...');
    const ordersWithEmbeddings = [];
    
    for (const order of orders) {
      try {
        // Prepare text for embedding
        const textForEmbedding = [
          order.title,
          order.summary,
          order.impact || order.financialImpact,
          (order.policyTags || []).join(' '),
          (order.affectedSectors || order.impactedSectors || []).join(' ')
        ].filter(Boolean).join(' ');
        
        // Get embedding from Anthropic
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: "claude-3-haiku-20240307",
            max_tokens: 1000,
            system: "You are a helpful assistant specialized in creating semantic embeddings from text.",
            messages: [
              {
                role: "user",
                content: `Please create a semantic embedding representation of this text about an executive order. 
                Format your response as a JSON array of 1536 floating point numbers between -1 and 1.
                
                Text to embed: ${textForEmbedding.slice(0, 8000)}`
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
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          // Parse the embedding array from the response
          const embedding = JSON.parse(jsonMatch[0]);
          ordersWithEmbeddings.push({
            ...order,
            embedding: embedding
          });
        } else {
          // If no embedding was generated, add order without it
          console.warn(`Could not extract embedding from response for order ${order.title}`);
          ordersWithEmbeddings.push(order);
        }
      } catch (error) {
        console.error(`Error generating embedding for order ${order.title}:`, error.message);
        ordersWithEmbeddings.push(order);
      }
    }
    
    return ordersWithEmbeddings;
  }

  async process() {
    try {
      console.log('Starting data processing pipeline...');
      
      // Load raw data
      const rawData = await this.loadData();
      console.log(`Loaded ${rawData.length} raw records`);
      
      // Clean data
      const cleanedData = await this.cleanData(rawData);
      console.log('Data cleaned');
      
      // Validate data
      const validatedData = await this.validateData(cleanedData);
      console.log(`${validatedData.length} records passed validation`);
      
      // Deduplicate records
      const uniqueData = await this.deduplicateOrders(validatedData);
      console.log(`${uniqueData.length} unique records after deduplication`);
      
      // Cross-reference with external sources
      const crossReferencedData = await this.crossReferenceData(uniqueData);
      console.log('Cross-reference complete');
      
      // Categorize using AI
      const categorizedData = await this.categorizeByAI(crossReferencedData);
      console.log('AI categorization complete');
      
      // Generate embeddings for semantic search
      const dataWithEmbeddings = await this.generateEmbeddings(categorizedData);
      console.log('Embeddings generated');
      
      // Save processed data
      await fs.writeFile('./processed_executive_orders.json', JSON.stringify(dataWithEmbeddings, null, 2));
      console.log('Processed data saved');
      
      // Save a version without embeddings for easier viewing
      const dataWithoutEmbeddings = dataWithEmbeddings.map(order => {
        const { embedding, ...rest } = order;
        return rest;
      });
      
      await fs.writeFile('./processed_executive_orders_readable.json', JSON.stringify(dataWithoutEmbeddings, null, 2));
      console.log('Human-readable version saved');
      
      // Create CSV output
      const headers = [
        'Number', 'Title', 'Date', 'President', 'Summary', 'Impact', 
        'Primary Category', 'Secondary Categories', 'Administration', 'Impacted Sectors'
      ];
      
      let csvContent = headers.join(',') + '\n';
      
      for (const order of dataWithoutEmbeddings) {
        const row = [
          order.number || '',
          `"${(order.title || '').replace(/"/g, '""')}"`,
          order.date || '',
          order.president || '',
          `"${(order.summary || '').replace(/"/g, '""')}"`,
          `"${(order.impact || order.financialImpact || '').replace(/"/g, '""')}"`,
          order.primaryCategory || '',
          `"${Array.isArray(order.secondaryCategories) ? order.secondaryCategories.join(', ') : ''}"`,
          order.administration || '',
          `"${Array.isArray(order.impactedSectors || order.economicSectors) ? (order.impactedSectors || order.economicSectors).join(', ') : ''}"`,
        ];
        
        csvContent += row.join(',') + '\n';
      }
      
      await fs.writeFile('./processed_executive_orders.csv', csvContent);
      console.log('CSV output created');
      
      return dataWithoutEmbeddings;
    } catch (error) {
      console.error('Error in processing pipeline:', error);
      throw error;
    }
  }
}

// Run the processor
const processor = new DataProcessor();
processor.process();
