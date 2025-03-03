/**
 * BaseExtractor - Base class for all knowledge extractors
 * 
 * This class provides common functionality for all specialized extractors.
 */

class BaseExtractor {
  /**
   * Constructor for BaseExtractor
   * 
   * @param {string} type - The type of knowledge this extractor handles
   */
  constructor(type) {
    this.type = type;
  }
  
  /**
   * Extract knowledge from text (to be implemented by subclasses)
   * 
   * @param {string} text - The text to extract from
   * @param {object} context - Additional context (optional)
   * @returns {object} Extracted knowledge with confidence and evidence
   */
  extract(text, context = {}) {
    throw new Error('Extract method must be implemented by subclass');
  }
  
  /**
   * Clean text for extraction
   * 
   * @param {string} text - The text to clean
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return '';
    
    // Replace multiple spaces with a single space
    let cleanedText = text.replace(/\s+/g, ' ');
    
    // Replace common abbreviations
    const abbreviations = {
      'U.S.': 'US',
      'U.S.C.': 'USC',
      'Sec.': 'Section',
      'sec.': 'section',
      'e.g.': 'for example',
      'i.e.': 'that is',
      'et al.': 'and others',
      'etc.': 'etcetera'
    };
    
    for (const [abbr, full] of Object.entries(abbreviations)) {
      cleanedText = cleanedText.replace(new RegExp(abbr.replace(/\./g, '\\.'), 'g'), full);
    }
    
    return cleanedText.trim();
  }
  
  /**
   * Calculate confidence score based on evidence
   * 
   * @param {string} text - The text being analyzed
   * @param {string} evidence - The evidence for the extraction
   * @param {object} factors - Additional factors affecting confidence
   * @returns {number} Confidence score (0.0 to 1.0)
   */
  calculateConfidence(text, evidence, factors = {}) {
    // Base factors
    const baseFactor = 0.5;
    const evidenceLengthFactor = Math.min(evidence.length / 50, 0.3);
    const patternMatchFactor = factors.patternMatch || 0;
    const contextFactor = factors.context || 0;
    
    // Calculate score
    let score = baseFactor + evidenceLengthFactor + patternMatchFactor + contextFactor;
    
    // Adjust for negative factors
    if (factors.ambiguity) {
      score -= factors.ambiguity;
    }
    
    if (factors.conflicts) {
      score -= factors.conflicts;
    }
    
    // Normalize to 0.0-1.0 range
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Extract sentences containing specific keywords
   * 
   * @param {string} text - The text to extract from
   * @param {string[]} keywords - Keywords to search for
   * @returns {string[]} Sentences containing the keywords
   */
  extractRelevantSentences(text, keywords) {
    if (!text) return [];
    
    // Split into sentences (simple approach)
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    // Filter sentences containing keywords
    return sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return keywords.some(keyword => lowerSentence.includes(keyword.toLowerCase()));
    });
  }
  
  /**
   * Normalize text for comparison
   * 
   * @param {string} text - The text to normalize
   * @returns {string} Normalized text
   */
  normalizeText(text) {
    if (!text) return '';
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
  
  /**
   * Find mentions of entities in text
   * 
   * @param {string} text - The text to search in
   * @param {string[]} entities - Entities to look for
   * @returns {object[]} Found entities with positions
   */
  findEntityMentions(text, entities) {
    if (!text || !entities || !entities.length) return [];
    
    const results = [];
    const lowerText = text.toLowerCase();
    
    for (const entity of entities) {
      const lowerEntity = entity.toLowerCase();
      let position = lowerText.indexOf(lowerEntity);
      
      while (position !== -1) {
        results.push({
          entity,
          position,
          context: text.substring(
            Math.max(0, position - 50),
            Math.min(text.length, position + entity.length + 50)
          )
        });
        
        position = lowerText.indexOf(lowerEntity, position + 1);
      }
    }
    
    return results;
  }
}

module.exports = { BaseExtractor };