/**
 * text_chunker.test.js
 * 
 * Tests for the text chunking utility
 */

const TextChunker = require('../../../utils/text_chunker');

describe('TextChunker', () => {
  let chunker;
  
  beforeEach(() => {
    // Create a chunker with test-specific settings
    chunker = new TextChunker({
      enabled: true,
      maxChunkSize: 100,
      overlapSize: 20,
      preferredBreakPoints: ["\n\n", ". ", ", ", " "],
      minimumChunkSize: 50,
      chunkingThreshold: 150,
      contextRetention: 30,
      contextHeader: "CONTEXT: ",
      chunkHeader: "CHUNK {n}/{total}: "
    });
  });

  test('should not chunk text below threshold', () => {
    const shortText = 'This is a short text that should not be chunked.';
    const chunks = chunker.chunkText(shortText);
    
    expect(chunks.length).toBe(1);
    expect(chunks[0].isChunked).toBe(false);
    expect(chunks[0].text).toBe(shortText);
  });

  test('should chunk long text at paragraph boundaries', () => {
    const longText = 'This is the first paragraph of a long text. It contains multiple sentences.\n\n' +
                     'This is the second paragraph. It also has multiple sentences. This content should be in a different chunk.\n\n' +
                     'This is the third paragraph. It continues the long document that needs chunking.';
    
    const chunks = chunker.chunkText(longText);
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].isChunked).toBe(true);
    expect(chunks[0].text).toContain('first paragraph');
    expect(chunks[1].text).toContain('CONTEXT:');
    expect(chunks[1].text).toContain('second paragraph');
  });

  test('should chunk at sentence boundaries if paragraphs are too long', () => {
    const longSentences = 'This is a very long first sentence that should be included in the first chunk. ' +
                          'This is the second sentence that might cross chunk boundaries. ' +
                          'This third sentence should definitely be in the second chunk. ' +
                          'This fourth sentence is also part of the long text that needs to be properly chunked.';
    
    const chunks = chunker.chunkText(longSentences);
    
    expect(chunks.length).toBeGreaterThan(1);
    // Check that we break at a sentence boundary
    expect(chunks[0].originalText.endsWith('. ')).toBe(true);
  });

  test('should include document context in subsequent chunks', () => {
    const longText = 'IMPORTANT DOCUMENT HEADER AND CONTEXT INFORMATION\n\n' +
                     'First chapter content that extends beyond the first chunk size limit. ' +
                     'More content for the first chapter that will be part of first chunk.\n\n' +
                     'Second chapter content that should be in the second chunk. ' +
                     'More content for the second chapter.';
    
    const chunks = chunker.chunkText(longText);
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].text).toContain('CONTEXT:');
    expect(chunks[1].text).toContain('IMPORTANT DOCUMENT HEADER');
  });

  test('should merge chunk results correctly', () => {
    const chunkResults = [
      {
        summary: 'Summary of first chunk.',
        keyPoints: ['Point 1', 'Point 2'],
        entities: { 'Entity1': 'Description1' },
        chunkIndex: 0,
        totalChunks: 3,
        isChunked: true,
        metadata: { documentId: '123' }
      },
      {
        summary: 'Summary of second chunk.',
        keyPoints: ['Point 2', 'Point 3'],
        entities: { 'Entity2': 'Description2' },
        chunkIndex: 1,
        totalChunks: 3,
        isChunked: true,
        metadata: { documentId: '123' }
      },
      {
        summary: 'Summary of final chunk.',
        keyPoints: ['Point 4'],
        entities: { 'Entity3': 'Description3' },
        chunkIndex: 2,
        totalChunks: 3,
        isChunked: true,
        metadata: { documentId: '123' }
      }
    ];
    
    const merged = chunker.mergeChunkResults(chunkResults);
    
    expect(merged.isChunked).toBe(true);
    expect(merged.totalChunks).toBe(3);
    
    // String fields should be joined
    expect(merged.summary).toContain('Summary of first chunk');
    expect(merged.summary).toContain('Summary of second chunk');
    expect(merged.summary).toContain('Summary of final chunk');
    
    // Array fields should be merged and deduplicated
    expect(merged.keyPoints.length).toBe(4);
    expect(merged.keyPoints).toContain('Point 1');
    expect(merged.keyPoints).toContain('Point 4');
    
    // Object fields should be merged
    expect(merged.entities).toHaveProperty('Entity1');
    expect(merged.entities).toHaveProperty('Entity2');
    expect(merged.entities).toHaveProperty('Entity3');
  });

  test('should handle single-item merging', () => {
    const singleResult = {
      summary: 'This is the only chunk.',
      keyPoints: ['Single point'],
      chunkIndex: 0,
      totalChunks: 1,
      isChunked: false,
      metadata: { documentId: '123' }
    };
    
    const merged = chunker.mergeChunkResults([singleResult]);
    
    expect(merged).toEqual(singleResult);
  });
});