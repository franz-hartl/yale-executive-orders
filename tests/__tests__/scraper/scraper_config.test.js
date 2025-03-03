/**
 * scraper_config.test.js
 * 
 * Tests for the scraper configuration system
 */

const scraperConfig = require('../../../config/scraper_config');

describe('Scraper Configuration', () => {
  test('should contain required sources', () => {
    expect(scraperConfig).toHaveProperty('federalRegister');
    expect(scraperConfig).toHaveProperty('whiteHouse');
  });

  test('should have properly structured federal register config', () => {
    const frConfig = scraperConfig.federalRegister;
    expect(frConfig).toHaveProperty('name');
    expect(frConfig).toHaveProperty('baseUrl');
    expect(frConfig).toHaveProperty('selectors');
    expect(frConfig.selectors).toHaveProperty('orderList');
    expect(frConfig.selectors).toHaveProperty('title');
    expect(frConfig.selectors).toHaveProperty('date');
  });

  test('should have properly structured AI extraction config', () => {
    expect(scraperConfig).toHaveProperty('aiExtraction');
    const aiConfig = scraperConfig.aiExtraction;
    expect(aiConfig).toHaveProperty('model');
    expect(aiConfig).toHaveProperty('maxTokens');
    expect(aiConfig).toHaveProperty('promptTemplate');
    expect(aiConfig.promptTemplate).toContain('{{sourceName}}');
    expect(aiConfig.promptTemplate).toContain('{{htmlContent}}');
  });

  test('should have properly structured AI enrichment config', () => {
    expect(scraperConfig).toHaveProperty('aiEnrichment');
    const aiConfig = scraperConfig.aiEnrichment;
    expect(aiConfig).toHaveProperty('model');
    expect(aiConfig).toHaveProperty('maxTokens');
    expect(aiConfig).toHaveProperty('promptTemplate');
    expect(aiConfig.promptTemplate).toContain('{{title}}');
    expect(aiConfig.promptTemplate).toContain('{{number}}');
    expect(aiConfig.promptTemplate).toContain('{{date}}');
    expect(aiConfig.promptTemplate).toContain('{{fullText}}');
  });

  test('should have Yale impact area mappings', () => {
    expect(scraperConfig).toHaveProperty('yaleImpactAreaMapping');
    const mappings = scraperConfig.yaleImpactAreaMapping;
    expect(Object.keys(mappings).length).toBeGreaterThan(0);
    expect(mappings['Research & Innovation']).toBe(1);
  });

  test('should have browser configuration', () => {
    expect(scraperConfig).toHaveProperty('browser');
    const browser = scraperConfig.browser;
    expect(browser).toHaveProperty('headless');
    expect(browser).toHaveProperty('args');
    expect(browser).toHaveProperty('userAgent');
    expect(browser).toHaveProperty('timeout');
  });

  test('should have general scraper settings', () => {
    expect(scraperConfig).toHaveProperty('general');
    const general = scraperConfig.general;
    expect(general).toHaveProperty('pageLimit');
    expect(general).toHaveProperty('contentTruncationSize');
    expect(general).toHaveProperty('outputJsonPath');
    expect(general).toHaveProperty('outputCsvPath');
  });
});