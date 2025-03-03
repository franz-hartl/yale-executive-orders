/**
 * scraper_config.js
 * 
 * Configuration settings for web scrapers used in the Yale Executive Orders system.
 * This file centralizes all selectors and URLs to make maintenance easier when websites change.
 */

module.exports = {
  // Federal Register scraper configuration
  federalRegister: {
    name: 'Federal Register',
    baseUrl: 'https://www.federalregister.gov/presidential-documents/executive-orders',
    apiUrl: 'https://www.federalregister.gov/api/v1',
    selectors: {
      orderList: '.document-list .document-wrapper',
      title: '.title a',
      date: '.metadata .date',
      number: '.metadata .executive-order-number',
      fullTextContent: '.body-content'
    },
    paginationParam: 'page'
  },
  
  // White House scraper configuration
  whiteHouse: {
    name: 'White House',
    baseUrl: 'https://www.whitehouse.gov/briefing-room/presidential-actions/',
    selectors: {
      orderList: '.news-item-wrapper',
      title: '.news-item__title a',
      date: '.news-item__date',
      fullTextContent: 'article'
    },
    paginationParam: 'page'
  },
  
  // National Science Foundation (NSF) scraper configuration
  nsf: {
    name: 'National Science Foundation',
    baseUrl: 'https://www.nsf.gov/pubs/policydocs/',
    apiUrl: 'https://www.nsf.gov/pubs/policydocs/apis/implementation.json',
    selectors: {
      documentList: '.policydoc-list li',
      title: 'a',
      date: '.date',
      fullTextContent: '.policydoc-content'
    }
  },
  
  // National Institutes of Health (NIH) scraper configuration
  nih: {
    name: 'National Institutes of Health',
    baseUrl: 'https://grants.nih.gov/policy/notices.htm',
    selectors: {
      documentList: '.policy-notice',
      title: '.notice-title a',
      date: '.notice-date',
      fullTextContent: '.notice-content'
    }
  },
  
  // Council on Governmental Relations (COGR) scraper configuration
  cogr: {
    name: 'Council on Governmental Relations',
    baseUrl: 'https://www.cogr.edu/executive-order-tracker',
    selectors: {
      documentList: '.eo-tracker-item',
      title: '.eo-title',
      date: '.eo-date',
      description: '.eo-description',
      fullTextContent: '.eo-content'
    }
  },
  
  // American Council on Education (ACE) scraper configuration
  ace: {
    name: 'American Council on Education',
    baseUrl: 'https://www.acenet.edu/policy-and-advocacy/Pages/Regulatory-Trackers.aspx',
    selectors: {
      documentList: '.tracker-item',
      title: '.tracker-title',
      date: '.tracker-date',
      fullTextContent: '.tracker-content'
    }
  },
  
  // AI extraction fallback configuration
  aiExtraction: {
    model: "claude-3-haiku-20240307",
    maxTokens: 2000,
    temperature: 0,
    useCache: true,
    cacheExpiration: 604800000, // 7 days in milliseconds
    promptTemplate: `Extract executive order information from {{sourceName}} in the HTML content below. 
Extract all executive orders from the content.
For each executive order, extract:
1. Title
2. Date (publication or signing date)
3. Executive Order number (if available)
4. URL to the full text (if available)

Return your response as a valid JSON array of objects with these fields.

HTML Content:
{{htmlContent}}`
  },
  
  // AI enrichment configuration
  aiEnrichment: {
    model: "claude-3-opus-20240229",
    maxTokens: 1500,
    temperature: 0,
    useCache: true,
    cacheExpiration: 604800000, // 7 days in milliseconds
    promptTemplate: `Analyze this executive order and extract/generate the following information:
1. A 2-3 sentence summary of the order
2. Key impact(s) on society, government, and/or private sector
3. Policy area tags (e.g., "healthcare", "education", "environment", "technology")
4. Affected sectors 
5. Determine the president who issued this order

Yale University Specific Analysis:
6. Identify which Yale-specific impact areas are relevant (select from the list below):
   - Research & Innovation: Federal grants, funding priorities, research initiatives
   - Research Security & Export Control: Security requirements, export controls, foreign collaborations
   - International & Immigration: International students, scholar mobility, visa regulations
   - Community & Belonging: Community building, belonging initiatives, educational equity
   - Campus Safety & Student Affairs: Campus safety, student life, residential colleges
   - Faculty & Workforce: Faculty administration, employment policies, workforce management
   - Healthcare & Public Health: Yale School of Medicine, Yale Health, public health initiatives
   - Financial & Operations: Financial operations, endowment management, facilities, IT
   - Governance & Legal: Governance structure, legal compliance, university policies
   - Academic Programs: Academic programming, curriculum, and teaching across schools
   - Arts & Cultural Heritage: Yale's museums, collections, performances, and cultural programming
   - Athletics & Student Activities: Yale's sports programs and extracurricular activities

7. For each identified Yale impact area, provide a brief explanation of why it's relevant

Executive Order Title: {{title}}
Executive Order Number: {{number}}
Date: {{date}}
Full Text:
{{fullText}}

Return the information in JSON format with these fields: summary, impact, policyTags, affectedSectors, president, yaleImpactAreas (as an array of objects with "name" and "relevance" properties)`
  },
  
  // Yale impact area ID mapping
  yaleImpactAreaMapping: {
    "Research & Innovation": 1,
    "Research Security & Export Control": 2,
    "International & Immigration": 3,
    "Community & Belonging": 4,
    "Campus Safety & Student Affairs": 5,
    "Faculty & Workforce": 6,
    "Healthcare & Public Health": 7,
    "Financial & Operations": 8,
    "Governance & Legal": 9,
    "Academic Programs": 10,
    "Arts & Cultural Heritage": 11,
    "Athletics & Student Activities": 12
  },
  
  // Browser configuration
  browser: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    timeout: 60000,
    waitUntil: 'networkidle2'
  },
  
  // General scraper settings
  general: {
    pageLimit: 5,                    // Default number of pages to scrape
    contentTruncationSize: 15000,    // Max size for AI analysis
    outputJsonPath: './executive_orders.json',
    outputCsvPath: './executive_orders.csv'
  },
  
  // Text chunking settings for long documents
  chunking: {
    enabled: true,                   // Enable text chunking
    maxChunkSize: 12000,             // Maximum characters per chunk
    overlapSize: 1000,               // Overlap between chunks to maintain context
    preferredBreakPoints: [
      "\n\n",                        // Double line break (paragraph)
      ". ",                          // End of sentence
      ", ",                          // Comma
      " ",                           // Word boundary
    ],
    minimumChunkSize: 3000,          // Don't create chunks smaller than this
    chunkingThreshold: 13000,        // Only chunk texts larger than this
    contextRetention: 2000,          // Amount of document start text to include in each chunk
    contextHeader: "DOCUMENT CONTEXT: ",  // Header for context section
    chunkHeader: "CHUNK {n} OF {total}: " // Chunk marker template
  }
};