const { DateExtractor } = require('../../../extraction/extractors/date_extractor');

describe('DateExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new DateExtractor();
  });

  test('should extract standard date formats', () => {
    const text = 'This order is effective on January 15, 2023. The deadline for compliance is March 1, 2023.';
    
    const result = extractor.extract(text);
    
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(expect.objectContaining({
      type: 'effective_date',
      date: '2023-01-15',
      description: expect.stringContaining('effective')
    }));
    expect(result.items[1]).toEqual(expect.objectContaining({
      type: 'deadline',
      date: '2023-03-01',
      description: expect.stringContaining('compliance')
    }));
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('should extract date ranges', () => {
    const text = 'The implementation period is from April 1, 2023 to June 30, 2023.';
    
    const result = extractor.extract(text);
    
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(expect.objectContaining({
      type: 'date_range',
      startDate: '2023-04-01',
      endDate: '2023-06-30',
      description: expect.stringContaining('implementation period')
    }));
  });

  test('should extract relative dates', () => {
    const text = 'Agencies shall comply within 90 days of this order. Implementation shall begin 30 days after publication.';
    
    const result = extractor.extract(text);
    
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(expect.objectContaining({
      type: 'relative_deadline',
      timeFrame: '90 days',
      relativeTo: 'order_date',
      description: expect.stringContaining('comply')
    }));
    expect(result.items[1]).toEqual(expect.objectContaining({
      type: 'relative_deadline',
      timeFrame: '30 days',
      relativeTo: 'publication_date',
      description: expect.stringContaining('Implementation')
    }));
  });

  test('should handle ambiguous dates', () => {
    const text = 'The review must be completed by next quarter.';
    
    const result = extractor.extract(text);
    
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(expect.objectContaining({
      type: 'ambiguous_date',
      description: expect.stringContaining('review'),
      confidence: expect.any(Number)
    }));
    expect(result.items[0].confidence).toBeLessThan(0.8);
  });

  test('should assign correct confidence scores', () => {
    const highConfidenceText = 'This order is effective on January 15, 2023.';
    const mediumConfidenceText = 'Implementation shall begin in the next fiscal year.';
    const lowConfidenceText = 'The Secretary shall review periodically.';
    
    const highResult = extractor.extract(highConfidenceText);
    const mediumResult = extractor.extract(mediumConfidenceText);
    const lowResult = extractor.extract(lowConfidenceText);
    
    expect(highResult.confidence).toBeGreaterThan(0.8);
    expect(mediumResult.confidence).toBeLessThan(0.8).toBeGreaterThan(0.5);
    expect(lowResult.confidence).toBeLessThan(0.5);
  });

  test('should handle text with no dates', () => {
    const text = 'This section provides general background information.';
    
    const result = extractor.extract(text);
    
    expect(result.items).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });

  test('should extract fiscal year dates', () => {
    const text = 'The program will be funded for fiscal year 2024.';
    
    const result = extractor.extract(text);
    
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(expect.objectContaining({
      type: 'fiscal_year',
      year: '2024',
      description: expect.stringContaining('funded')
    }));
  });

  test('should extract multiple dates from complex text', () => {
    const text = `
      EFFECTIVE DATE: This order is effective January 20, 2023.
      
      Section 1. Implementation Timeline.
      (a) Within
      30 days of the date of this order, agencies shall submit draft plans.
      (b) By March 15, 2023, final plans must be approved.
      (c) Implementation shall begin no later than 60 days after approval.
      (d) The program will run from fiscal year 2024 through fiscal year 2026.
    `;
    
    const result = extractor.extract(text);
    
    expect(result.items.length).toBeGreaterThanOrEqual(5);
    expect(result.items.find(i => i.type === 'effective_date')).toBeTruthy();
    expect(result.items.find(i => i.type === 'relative_deadline' && i.timeFrame === '30 days')).toBeTruthy();
    expect(result.items.find(i => i.date === '2023-03-15')).toBeTruthy();
    expect(result.items.find(i => i.type === 'relative_deadline' && i.timeFrame === '60 days')).toBeTruthy();
    expect(result.items.find(i => i.type === 'fiscal_year' || i.type === 'date_range')).toBeTruthy();
  });
});