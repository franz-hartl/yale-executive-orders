# Executive Order Scraper Documentation

## Overview

The AI-powered scraper is designed to collect executive orders and policy documents from various sources. It has built-in resilience to handle website changes through a configurable approach and AI fallback mechanisms.

## Key Features

- **Configuration-based selectors**: All HTML selectors and URLs are stored in a centralized configuration file
- **Automatic source detection**: Dynamically loads data sources from configuration
- **AI fallback extraction**: Uses Claude to extract data when website structure changes
- **Enrichment pipeline**: Enhances extracted content with AI analysis
- **Yale-specific analysis**: Identifies impact areas relevant to Yale University
- **Text chunking**: Processes long documents by splitting them into overlapping chunks

## Configuration

The scraper uses a modular configuration system with settings defined in `config/scraper_config.js`. Key configuration sections include:

- **Source-specific selectors**: CSS selectors for each data source
- **AI extraction settings**: Model parameters and prompt templates
- **Browser settings**: Puppeteer configuration
- **Chunking settings**: Parameters for processing long documents
- **Output settings**: File paths and format options

### Adding a New Source

To add a new source to the scraper:

1. Add a new section to `config/scraper_config.js` following this template:

```javascript
newSourceName: {
  name: "New Source Display Name",
  baseUrl: "https://example.com/source-url",
  selectors: {
    orderList: ".items-container", // CSS selector for the list of items
    title: ".item-title a",        // CSS selector for title
    date: ".item-date",            // CSS selector for date
    number: ".item-number",        // CSS selector for document number (if available)
    fullTextContent: ".content"    // CSS selector for full text content
  },
  paginationParam: "page"          // URL parameter for pagination
}
```

2. The scraper will automatically load and use the new source on next run.

### Updating Selectors When Websites Change

When a website changes its structure, you only need to update the selectors in the configuration file:

1. Open `config/scraper_config.js`
2. Find the relevant source section
3. Update the selectors to match the new HTML structure
4. Run the scraper again

If the scraper still fails to extract data with the updated selectors, it will automatically fall back to AI-based extraction.

## Running the Scraper

To run the scraper:

```bash
node ai_scraper.js
```

The scraper will:
1. Load all configured sources
2. Scrape data from each source
3. Extract full text for each document
4. Enrich data with AI analysis
5. Save results to both JSON and CSV formats

## AI Extraction Fallback

When standard scraping fails due to website changes, the scraper uses Claude to extract information from the HTML content. The AI extraction:

1. Receives the HTML content of the page
2. Extracts titles, dates, numbers, and URLs
3. Returns structured data that matches the expected format
4. Continues the normal enrichment process

## Modifying AI Prompts

The AI prompts used for extraction and enrichment can be customized in the config file:

1. Find the `aiExtraction` or `aiEnrichment` section in the config file
2. Update the `promptTemplate` property with your desired prompt
3. Use placeholders like `{{sourceName}}`, `{{htmlContent}}`, `{{title}}`, etc., which will be replaced with actual values

## Output Files

The scraper generates two output files:
- `executive_orders.json`: Complete data in JSON format
- `executive_orders.csv`: Summary data in CSV format

The paths for these files can be configured in the `general` section of the config.

## Document Chunking

For long executive orders that exceed token limits, the scraper uses a text chunking system:

1. **Chunking Process**:
   - The system detects long documents based on the `chunkingThreshold` setting
   - Text is split into overlapping chunks of `maxChunkSize` with `overlapSize` overlap
   - Each chunk includes context from the beginning of the document
   - Chunks break at natural boundaries (paragraphs, sentences) whenever possible

2. **Chunk Processing**:
   - Each chunk is processed individually with the AI model
   - Results from all chunks are merged intelligently:
     - Text fields are concatenated with delimiters
     - Array fields are merged and deduplicated
     - Object fields are merged by properties

3. **Fallback Mechanism**:
   - If chunking fails, the system falls back to processing a truncated version
   - Detailed logging tracks the chunking and merging process

4. **Configuring Chunking**:
   - Settings in `config/scraper_config.js` under the `chunking` section control behavior
   - Adjust `maxChunkSize`, `overlapSize`, and `preferredBreakPoints` to optimize
   - Set `enabled: false` to disable chunking completely

## Troubleshooting

If the scraper fails to extract data:

1. Check the console logs for error messages
2. Verify that the selectors in the configuration match the current website structure
3. Check if the website has implemented anti-scraping measures
4. Try increasing the browser timeout settings in the configuration

For AI extraction issues:
1. Verify the ANTHROPIC_API_KEY environment variable is set
2. Check that the AI prompt templates contain all necessary placeholders
3. Try adjusting the model parameters (tokens, temperature) in the configuration

For chunking issues:
1. Look for errors in the chunking process in the logs
2. Try adjusting chunk size and overlap settings
3. Check that the merged results contain data from all chunks
4. For debugging, set `chunkingThreshold` very low to force chunking on smaller documents