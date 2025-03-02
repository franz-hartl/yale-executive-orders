/**
 * impact_extractor.js
 * 
 * Extracts impact information from executive orders, including financial,
 * operational, and compliance impacts on different types of entities.
 */

const BaseExtractor = require('./base_extractor');
const { createExtractionModel } = require('../../models/extracted_knowledge');
const { ImpactExtractionModel } = require('../../models/extracted_knowledge');
const crypto = require('crypto');

/**
 * Impact Extractor class
 */
class ImpactExtractor extends BaseExtractor {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Impact',
      extractorType: 'impacts',
      description: 'Extracts impacts from executive orders',
      confidenceThreshold: 0.6,
      ...options
    });
  }
  
  /**
   * Extract impacts from an executive order
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
    
    // If a specific entity filter is provided, include it in the prompt
    const entityFilter = options.entityFilter || '';
    
    // Prepare the prompt for the AI
    const prompt = this._buildPrompt(orderNumber, title, orderText, entityFilter);
    
    // Call the AI to extract impacts
    const aiResponse = await this._callAI(prompt, {
      systemPrompt: this._getSystemPrompt(),
      temperature: 0.1 // Use a low temperature for factual extraction
    });
    
    // Parse the AI response
    const extractedData = this._parseJsonFromResponse(aiResponse);
    
    // Update the extraction model with the results
    extractionModel.impacts = this._processImpacts(extractedData.impacts || []);
    extractionModel.overallImpactAssessment = extractedData.overallImpactAssessment || '';
    
    // Set confidence based on the AI's assessment
    extractionModel.confidence = extractedData.confidence || this.calculateConfidence(extractionModel, order);
    
    return extractionModel;
  }
  
  /**
   * Build the prompt for the AI
   * @param {string} orderNumber Executive order number
   * @param {string} title Executive order title
   * @param {string} orderText Executive order text
   * @param {string} entityFilter Optional filter for specific entity types
   * @returns {string} Prompt for the AI
   * @private
   */
  _buildPrompt(orderNumber, title, orderText, entityFilter = '') {
    let entityFocus = '';
    
    if (entityFilter) {
      entityFocus = `Focus specifically on impacts to ${entityFilter}.`;
    }
    
    return `
I need you to extract all significant impacts from Executive Order ${orderNumber}: "${title}".
${entityFocus}

An impact is any effect, consequence, or burden that the executive order will have on entities, operations, or regulatory frameworks. Focus on:
1. Financial impacts (costs, funding changes, resource requirements)
2. Operational impacts (changes to processes, workflows, or operations)
3. Compliance impacts (new requirements, reporting, documentation)
4. Organizational impacts (structural changes, roles, responsibilities)
5. Policy impacts (changes to policies, procedures, or frameworks)
6. Timeframe impacts (immediate, short-term, and long-term effects)

For each impact, provide:
- Type of impact (e.g., financial, operational, compliance)
- Description of the impact
- Entities affected by this impact
- Severity of the impact (high/medium/low)
- The immediate text context surrounding the impact
- Whether the impact is direct or indirect
- Timeframe for the impact (immediate, short-term, long-term)
- Any related requirements that drive this impact

Here's the text of the executive order:

${orderText}

Respond with a JSON object using this structure:
{
  "impacts": [
    {
      "impactType": "financial|operational|compliance|policy|organizational|other",
      "description": "Detailed description of the impact",
      "textContext": "Text surrounding the impact for context",
      "affectedEntities": ["Entity1", "Entity2"],
      "severity": "high|medium|low",
      "confidence": 0.0-1.0,
      "timeframe": "immediate|short-term|long-term",
      "isIndirect": true/false,
      "relatedRequirementIds": []
    }
  ],
  "overallImpactAssessment": "Brief overall assessment of impacts",
  "confidence": 0.0-1.0 // Overall confidence in these impacts
}

Only include impacts that are clearly stated or directly implied in the text. Include impacts that are explicit as well as those that can be reasonably inferred from the order's requirements and directives. If you're unsure about an impact, include it but assign a lower confidence score.

High severity impacts are those that:
1. Require significant resource investment
2. Fundamentally change operations or processes
3. Create substantial new compliance burdens
4. Affect core functions of the entity
5. Apply broadly across many entities or systems
`;
  }
  
  /**
   * Get the system prompt for the AI
   * @returns {string} System prompt
   * @private
   */
  _getSystemPrompt() {
    return `You are an expert at analyzing the impacts and consequences of legal documents, especially executive orders. Your task is to identify all effects and implications that the executive order will have on affected entities, operations, and regulatory frameworks.

Your strengths include:
1. Identifying both explicit and implicit impacts
2. Distinguishing between different types of impacts (financial, operational, compliance, etc.)
3. Assessing the severity and scope of impacts
4. Determining which entities will be affected by specific impacts
5. Understanding the timeframe over which impacts will be felt
6. Making reasonable inferences about likely consequences

Focus on accuracy and completeness. Include ALL significant impacts, but assign appropriate confidence levels. For impacts that are clearly and explicitly stated, assign high confidence. For impacts that require inference or are implied, assign lower confidence.

Format your response as structured JSON according to the schema specified in the prompt.`;
  }
  
  /**
   * Process and clean impacts extracted by the AI
   * @param {Array} impacts Array of impacts from AI
   * @returns {Array} Processed impacts
   * @private
   */
  _processImpacts(impacts) {
    return impacts.map(impact => {
      // Generate a unique ID for each impact
      const id = crypto.randomUUID();
      
      // Ensure the impact has the proper structure
      return {
        id,
        impactType: impact.impactType || 'other',
        description: impact.description || '',
        textContext: impact.textContext || '',
        affectedEntities: Array.isArray(impact.affectedEntities) ? impact.affectedEntities : [],
        severity: impact.severity || 'medium',
        confidence: impact.confidence || 0.7,
        timeframe: impact.timeframe || 'immediate',
        isIndirect: impact.isIndirect || false,
        relatedRequirementIds: Array.isArray(impact.relatedRequirementIds) ? impact.relatedRequirementIds : []
      };
    }).filter(impact => {
      // Filter out impacts with confidence below threshold
      return impact.confidence >= this.options.confidenceThreshold;
    });
  }
  
  /**
   * Calculate confidence based on the extracted impacts
   * @param {Object} results Extraction results
   * @param {Object} order Original order data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(results, order) {
    if (!results || !results.impacts || results.impacts.length === 0) {
      return 0.5; // Medium confidence when no impacts found
    }
    
    // Average confidence of all impacts
    const totalConfidence = results.impacts.reduce((sum, impact) => sum + (impact.confidence || 0), 0);
    const averageConfidence = totalConfidence / results.impacts.length;
    
    // Check for high-severity impacts
    const highSeverityCount = results.impacts.filter(impact => impact.severity === 'high').length;
    const highSeverityRatio = highSeverityCount / results.impacts.length;
    
    // Check for direct impacts
    const directImpactCount = results.impacts.filter(impact => !impact.isIndirect).length;
    const directImpactRatio = directImpactCount / results.impacts.length;
    
    // Check for diversity of impact types
    const impactTypes = new Set(results.impacts.map(impact => impact.impactType));
    const diversityFactor = Math.min(1, impactTypes.size / 5); // Max of 5 types as denominator
    
    // Adjust confidence based on quality and diversity of impacts
    let adjustedConfidence = averageConfidence;
    
    if (highSeverityRatio > 0.3) {
      adjustedConfidence += 0.05; // Boost if we have good proportion of high-severity impacts
    }
    
    if (directImpactRatio > 0.6) {
      adjustedConfidence += 0.05; // Boost if we have good proportion of direct impacts
    }
    
    if (diversityFactor > 0.6) {
      adjustedConfidence += 0.05; // Boost if we have diverse impact types
    }
    
    // Check if we have a reasonable number of impacts for an executive order
    if (results.impacts.length < 3) {
      adjustedConfidence -= 0.1; // Reduce confidence if we found very few impacts
    } else if (results.impacts.length > 20) {
      adjustedConfidence -= 0.05; // Slight reduction if there are too many impacts (might be over-extracting)
    }
    
    return Math.max(0, Math.min(1, adjustedConfidence)); // Ensure within 0-1 range
  }
}

module.exports = ImpactExtractor;