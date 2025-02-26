const fs = require('fs').promises;
const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

// Configure OpenAI API
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

class DataProcessor {
  constructor(inputPath = './financial_executive_orders.json') {
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
      financialTerms: [
        'banking', 'finance', 'securities', 'investment', 'monetary policy',
        'fiscal policy', 'taxation', 'treasury', 'currency', 'market regulation',
        'trade', 'tariffs', 'sanctions', 'financial stability', 'economic growth'
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
Categorize this executive order related to finance or economics. Based on the title and any available information, assign appropriate:
1. Primary category (single most relevant category)
2. Secondary categories (up to 3 additional relevant categories)
3. Administration period
4. Economic sector impacts (which sectors of the economy are most affected)

Title: ${order.title}
Number: ${order.number || 'Unknown'}
Date: ${order.date || 'Unknown'}
Summary: ${order.summary || 'Not available'}

Available financial/economic categories:
- Banking Regulation
- Securities/Investment
- Trade Policy
- Fiscal Policy
- Monetary Policy
- Tax Policy
- Government Contracting
- Economic Sanctions
- Consumer Protection
- Financial Stability
- Market Regulation
- Digital Assets/Cryptocurrency
- Other (please specify)

Return your analysis as JSON with these fields: primaryCategory, secondaryCategories, administration, economicSectors
`;

        const completion = await openai.createChatCompletion({
          model: "gpt-4",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 800
        });

        const responseText = completion.data.choices[0].message.content;
        
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
          order.financialImpact,
          (order.policyTags || []).join(' '),
          (order.affectedSectors || []).join(' ')
        ].filter(Boolean).join(' ');
        
        // Get embedding from OpenAI
        const embeddingResponse = await openai.createEmbedding({
          model: "text-embedding-ada-002",
          input: textForEmbedding.slice(0, 8000) // API limit
        });
        
        ordersWithEmbeddings.push({
          ...order,
          embedding: embeddingResponse.data.data[0].embedding
        });
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
      await fs.writeFile('./processed_financial_eo.json', JSON.stringify(dataWithEmbeddings, null, 2));
      console.log('Processed data saved');
      
      // Save a version without embeddings for easier viewing
      const dataWithoutEmbeddings = dataWithEmbeddings.map(order => {
        const { embedding, ...rest } = order;
        return rest;
      });
      
      await fs.writeFile('./processed_financial_eo_readable.json', JSON.stringify(dataWithoutEmbeddings, null, 2));
      console.log('Human-readable version saved');
      
      // Create CSV output
      const headers = [
        'Number', 'Title', 'Date', 'President', 'Summary', 'Financial Impact', 
        'Primary Category', 'Secondary Categories', 'Administration', 'Economic Sectors'
      ];
      
      let csvContent = headers.join(',') + '\n';
      
      for (const order of dataWithoutEmbeddings) {
        const row = [
          order.number || '',
          `"${(order.title || '').replace(/"/g, '""')}"`,
          order.date || '',
          order.president || '',
          `"${(order.summary || '').replace(/"/g, '""')}"`,
          `"${(order.financialImpact || '').replace(/"/g, '""')}"`,
          order.primaryCategory || '',
          `"${Array.isArray(order.secondaryCategories) ? order.secondaryCategories.join(', ') : ''}"`,
          order.administration || '',
          `"${Array.isArray(order.economicSectors) ? order.economicSectors.join(', ') : ''}"`,
        ];
        
        csvContent += row.join(',') + '\n';
      }
      
      await fs.writeFile('./processed_financial_eo.csv', csvContent);
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
