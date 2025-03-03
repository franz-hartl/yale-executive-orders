/**
 * text_chunker.js
 * 
 * Utility for splitting long texts into manageable, overlapping chunks for AI processing.
 * This helps overcome token limits when analyzing long documents while maintaining context.
 */

const scraperConfig = require('../config/scraper_config');

/**
 * TextChunker - Splits long texts into smaller chunks with configurable overlap
 */
class TextChunker {
  /**
   * Constructor for TextChunker
   * @param {Object} options - Chunking configuration options
   */
  constructor(options = {}) {
    // Use provided options or defaults from config
    const config = scraperConfig.chunking || {};
    
    this.options = {
      enabled: options.enabled !== undefined ? options.enabled : config.enabled,
      maxChunkSize: options.maxChunkSize || config.maxChunkSize || 12000,
      overlapSize: options.overlapSize || config.overlapSize || 1000,
      preferredBreakPoints: options.preferredBreakPoints || config.preferredBreakPoints || ["\n\n", ". ", ", ", " "],
      minimumChunkSize: options.minimumChunkSize || config.minimumChunkSize || 3000,
      chunkingThreshold: options.chunkingThreshold || config.chunkingThreshold || 13000,
      contextRetention: options.contextRetention || config.contextRetention || 2000,
      contextHeader: options.contextHeader || config.contextHeader || "DOCUMENT CONTEXT: ",
      chunkHeader: options.chunkHeader || config.chunkHeader || "CHUNK {n} OF {total}: "
    };
  }

  /**
   * Split text into chunks at natural boundaries
   * @param {string} text - The full text to chunk
   * @param {Object} metadata - Optional metadata about the document
   * @returns {Array<Object>} - Array of chunk objects with text and metadata
   */
  chunkText(text, metadata = {}) {
    // If chunking is disabled or text is below threshold, return as single chunk
    if (!this.options.enabled || text.length < this.options.chunkingThreshold) {
      return [{
        text,
        isChunked: false,
        chunkIndex: 0,
        totalChunks: 1,
        metadata
      }];
    }

    const chunks = [];
    const documentContext = text.substring(0, this.options.contextRetention);
    let currentPosition = 0;
    let chunkIndex = 0;

    // Continue until we've processed the entire text
    while (currentPosition < text.length) {
      // Calculate the end of this chunk (respecting max size)
      let chunkEnd = Math.min(
        currentPosition + this.options.maxChunkSize,
        text.length
      );

      // If we're not at the end of the text and this wouldn't be the last chunk,
      // find a natural breaking point
      if (chunkEnd < text.length) {
        const searchStart = Math.max(
          chunkEnd - this.options.overlapSize,
          currentPosition + this.options.minimumChunkSize
        );

        // Try each preferred break point in order
        for (const breakPoint of this.options.preferredBreakPoints) {
          const textToSearch = text.substring(searchStart, chunkEnd);
          const breakPosition = textToSearch.lastIndexOf(breakPoint);
          
          if (breakPosition !== -1) {
            chunkEnd = searchStart + breakPosition + breakPoint.length;
            break;
          }
        }
      }

      // Extract the chunk text
      const chunkText = text.substring(currentPosition, chunkEnd);
      
      // Add document context if this isn't the first chunk
      let processedChunkText = chunkText;
      if (chunkIndex > 0) {
        processedChunkText = this.options.contextHeader + documentContext + "\n\n" + processedChunkText;
      }
      
      // Add chunk header with position information
      const totalChunks = Math.ceil(text.length / (this.options.maxChunkSize - this.options.overlapSize));
      const chunkHeader = this.options.chunkHeader
        .replace("{n}", chunkIndex + 1)
        .replace("{total}", totalChunks);
      
      processedChunkText = chunkHeader + processedChunkText;

      // Add the chunk to our results
      chunks.push({
        text: processedChunkText,
        originalText: chunkText,
        isChunked: true,
        chunkIndex,
        totalChunks,
        startPosition: currentPosition,
        endPosition: chunkEnd,
        metadata: {
          ...metadata,
          chunkInfo: {
            index: chunkIndex,
            total: totalChunks,
            start: currentPosition,
            end: chunkEnd,
            length: chunkText.length
          }
        }
      });

      // Move to next chunk, considering overlap
      currentPosition = chunkEnd - this.options.overlapSize;
      // Make sure we're making forward progress
      if (currentPosition <= chunks[chunks.length - 1].startPosition) {
        currentPosition = chunkEnd;
      }
      
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Merge chunked results back together
   * @param {Array<Object>} chunkResults - Results from processing individual chunks
   * @returns {Object} - Merged result
   */
  mergeChunkResults(chunkResults) {
    // If there's only one result, just return it
    if (chunkResults.length === 1) {
      return chunkResults[0];
    }

    // Create a merged result object
    const merged = {
      isChunked: true,
      totalChunks: chunkResults.length,
      sources: chunkResults.map(r => ({chunkIndex: r.chunkIndex, metadata: r.metadata}))
    };

    // For text fields, we'll join with a delimiter
    const textDelimiter = "\n\n";
    
    // Process string fields - join them with delimiters
    const stringFields = [];
    const arrayFields = [];
    const objectFields = [];
    
    // First, identify field types from the first chunk result
    for (const [key, value] of Object.entries(chunkResults[0])) {
      // Skip metadata fields we've already handled
      if (['isChunked', 'chunkIndex', 'totalChunks', 'startPosition', 'endPosition', 'metadata'].includes(key)) {
        continue;
      }
      
      if (typeof value === 'string') {
        stringFields.push(key);
      } else if (Array.isArray(value)) {
        arrayFields.push(key);
      } else if (typeof value === 'object' && value !== null) {
        objectFields.push(key);
      } else {
        // For primitive values, just use the value from the first chunk
        merged[key] = value;
      }
    }
    
    // Merge string fields with delimiters
    for (const field of stringFields) {
      merged[field] = chunkResults.map(r => r[field]).join(textDelimiter);
    }
    
    // Merge array fields - concatenate and deduplicate
    for (const field of arrayFields) {
      const allItems = [];
      for (const result of chunkResults) {
        if (Array.isArray(result[field])) {
          allItems.push(...result[field]);
        }
      }
      // Deduplicate by converting to string for comparison
      merged[field] = [...new Map(allItems.map(item => 
        [typeof item === 'object' ? JSON.stringify(item) : item, item]
      )).values()];
    }
    
    // For object fields, we merge properties
    for (const field of objectFields) {
      merged[field] = {};
      for (const result of chunkResults) {
        if (result[field] && typeof result[field] === 'object') {
          Object.assign(merged[field], result[field]);
        }
      }
    }

    return merged;
  }
}

module.exports = TextChunker;