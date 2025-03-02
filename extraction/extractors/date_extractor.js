/**
 * date_extractor.js
 * 
 * Extracts dates from executive orders, including signing dates, effective dates,
 * deadlines, and other important dates mentioned in the text.
 */

const BaseExtractor = require('./base_extractor');
const { createExtractionModel } = require('../../models/extracted_knowledge');
const { DateExtractionModel } = require('../../models/extracted_knowledge');
const crypto = require('crypto');

/**
 * Date Extractor class
 */
class DateExtractor extends BaseExtractor {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Date',
      extractorType: 'dates',
      description: 'Extracts dates from executive orders',
      confidenceThreshold: 0.7,
      ...options
    });
  }
  
  /**
   * Extract dates from an executive order
   * @param {Object} order Executive order data
   * @param {Object} extractionModel Initial extraction model
   * @param {Object} options Extraction options
   * @returns {Promise<Object>} Updated extraction model with results
   * @protected
   */
  async _extractImplementation(order, extractionModel, options = {}) {
    // Get the order text
    const orderText = this._getOrderText(order);
    
    // Get metadata from the order
    const orderNumber = order.orderNumber || order.data?.order_number;
    const title = order.data?.title || order.title;
    
    // Prepare the prompt for the AI
    const prompt = this._buildPrompt(orderNumber, title, orderText);
    
    // Call the AI to extract dates
    const aiResponse = await this._callAI(prompt, {
      systemPrompt: this._getSystemPrompt(),
      temperature: 0.1 // Use a low temperature for factual extraction
    });
    
    // Parse the AI response
    const extractedData = this._parseJsonFromResponse(aiResponse);
    
    // Update the extraction model with the results
    extractionModel.dates = this._processDates(extractedData.dates || []);
    
    // Set confidence based on the AI's assessment
    extractionModel.confidence = extractedData.confidence || this.calculateConfidence(extractionModel, order);
    
    return extractionModel;
  }
  
  /**
   * Build the prompt for the AI
   * @param {string} orderNumber Executive order number
   * @param {string} title Executive order title
   * @param {string} orderText Executive order text
   * @returns {string} Prompt for the AI
   * @private
   */
  _buildPrompt(orderNumber, title, orderText) {
    return `
I need you to extract all important dates from Executive Order ${orderNumber}: "${title}".
Focus specifically on:
1. Signing date
2. Effective date
3. Compliance deadlines
4. Reporting deadlines
5. Review or reassessment dates
6. Any other important dates mentioned in the text

For each date, provide:
- The actual date (in YYYY-MM-DD format when possible)
- Type of date (signing, effective, deadline, etc.)
- A brief description of what the date represents
- The immediate text context where the date appears
- Any entities affected by this date
- Whether the date is explicit or inferred
- Whether it's a recurring date (with pattern if applicable)

Here's the text of the executive order:

${orderText}

Respond with a JSON object using this structure:
{
  "dates": [
    {
      "date": "YYYY-MM-DD", // or description if not a specific date
      "dateType": "signing|effective|deadline|publication|other",
      "description": "Brief description of what this date represents",
      "textContext": "Text surrounding the date for context",
      "isExplicit": true/false,
      "confidence": 0.0-1.0,
      "affectedEntities": ["Entity1", "Entity2"],
      "recurring": true/false,
      "recurrencePattern": "Description of recurrence if applicable"
    }
  ],
  "confidence": 0.0-1.0 // Overall confidence in these dates
}

If a date is mentioned but not specified (e.g., "within 90 days"), calculate it based on the signing date if possible, or include it as a relative date. If exact day is not specified, use the first day of the month.

Only include dates that are clearly stated or directly implied in the text. Do not extrapolate or guess. If you're unsure about a date, include it but assign a lower confidence score.
`;
  }
  
  /**
   * Get the system prompt for the AI
   * @returns {string} System prompt
   * @private
   */
  _getSystemPrompt() {
    return `You are an expert at extracting and analyzing important dates mentioned in legal documents, especially executive orders. Your task is to identify all dates, deadlines, and timeframes mentioned in the text provided.

Your strengths include:
1. Distinguishing between different types of dates (signing, effective, compliance, etc.)
2. Recognizing both explicit dates and relative timeframes (e.g., "within 90 days")
3. Converting relative dates to absolute dates when a reference point is available
4. Understanding complex date patterns and recurrences
5. Extracting the proper context around each date

Focus on accuracy and completeness. Include ALL dates mentioned, but assign appropriate confidence levels. For dates that are clearly and explicitly stated, assign high confidence. For dates that require inference or are ambiguous, assign lower confidence.

Format your response as structured JSON according to the schema specified in the prompt.`;
  }
  
  /**
   * Process and clean dates extracted by the AI
   * @param {Array} dates Array of dates from AI
   * @returns {Array} Processed dates
   * @private
   */
  _processDates(dates) {
    return dates.map(date => {
      // Generate a unique ID for each date
      const id = crypto.randomUUID();
      
      // Ensure the date has the proper structure
      return {
        id,
        date: date.date || null,
        dateType: date.dateType || 'other',
        description: date.description || '',
        textContext: date.textContext || '',
        isExplicit: date.isExplicit !== undefined ? date.isExplicit : true,
        confidence: date.confidence || 0.7,
        affectedEntities: Array.isArray(date.affectedEntities) ? date.affectedEntities : [],
        recurring: date.recurring || false,
        recurrencePattern: date.recurrencePattern || null
      };
    }).filter(date => {
      // Filter out dates with confidence below threshold
      return date.confidence >= this.options.confidenceThreshold;
    });
  }
  
  /**
   * Calculate confidence based on the extracted dates
   * @param {Object} results Extraction results
   * @param {Object} order Original order data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(results, order) {
    if (!results || !results.dates || results.dates.length === 0) {
      return 0.5; // Medium confidence when no dates found
    }
    
    // Average confidence of all dates
    const totalConfidence = results.dates.reduce((sum, date) => sum + (date.confidence || 0), 0);
    const averageConfidence = totalConfidence / results.dates.length;
    
    // Check if we have at least the signing date
    const hasSigningDate = results.dates.some(date => 
      date.dateType === 'signing' || date.description.toLowerCase().includes('sign'));
    
    // Adjust confidence based on presence of important dates
    if (hasSigningDate && results.dates.length >= 3) {
      return Math.min(averageConfidence + 0.1, 1.0); // Boost confidence if we have key dates
    } else if (!hasSigningDate) {
      return Math.max(averageConfidence - 0.1, 0.0); // Reduce confidence if missing signing date
    }
    
    return averageConfidence;
  }
}

module.exports = DateExtractor;