/**
 * requirement_extractor.js
 * 
 * Extracts requirements from executive orders, including compliance requirements,
 * reporting requirements, and action items directed at specific entities.
 */

const BaseExtractor = require('./base_extractor');
const { createExtractionModel } = require('../../models/extracted_knowledge');
const { RequirementExtractionModel } = require('../../models/extracted_knowledge');
const crypto = require('crypto');

/**
 * Requirement Extractor class
 */
class RequirementExtractor extends BaseExtractor {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    super({
      name: 'Requirement',
      extractorType: 'requirements',
      description: 'Extracts requirements from executive orders',
      confidenceThreshold: 0.65,
      ...options
    });
  }
  
  /**
   * Extract requirements from an executive order
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
    
    // Call the AI to extract requirements
    const aiResponse = await this._callAI(prompt, {
      systemPrompt: this._getSystemPrompt(),
      temperature: 0.1 // Use a low temperature for factual extraction
    });
    
    // Parse the AI response
    const extractedData = this._parseJsonFromResponse(aiResponse);
    
    // Update the extraction model with the results
    extractionModel.requirements = this._processRequirements(extractedData.requirements || []);
    
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
I need you to extract all requirements from Executive Order ${orderNumber}: "${title}".

A requirement is any action, obligation, or mandate that the order directs entities to perform. Focus on:
1. Compliance requirements
2. Reporting requirements
3. Policy development requirements
4. Implementation requirements
5. Deadlines and timeframes for specific actions
6. Any other directives requiring action

For each requirement, provide:
- Type of requirement (e.g., compliance, reporting, action)
- Description of the requirement
- The target entities directed to fulfill this requirement
- Any deadlines associated with it
- The immediate text context surrounding the requirement
- Whether the requirement is explicitly stated or inferred
- Priority level (high/medium/low) based on language used and importance
- Any conditions that must be met for the requirement to apply
- Whether this is an alternative to another requirement

Here's the text of the executive order:

${orderText}

Respond with a JSON object using this structure:
{
  "requirements": [
    {
      "requirementType": "compliance|reporting|action|implementation|policy|other",
      "description": "Detailed description of the requirement",
      "textContext": "Text surrounding the requirement for context",
      "targetEntities": ["Entity1", "Entity2"],
      "deadline": "YYYY-MM-DD or time period (e.g., '90 days from signing')",
      "isExplicit": true/false,
      "confidence": 0.0-1.0,
      "priority": "high|medium|low",
      "conditionalOn": "Condition that must be met, if any",
      "alternativeToRequirementId": null
    }
  ],
  "confidence": 0.0-1.0 // Overall confidence in these requirements
}

Only include requirements that are clearly stated or directly implied in the text. Focus on specific, actionable items, not general statements of policy or intent. If you're unsure about a requirement, include it but assign a lower confidence score.

Requirements with specific deadlines, clear mandatory language (shall, must, required to), or that establish enforcement mechanisms should be assigned high priority.
`;
  }
  
  /**
   * Get the system prompt for the AI
   * @returns {string} System prompt
   * @private
   */
  _getSystemPrompt() {
    return `You are an expert at analyzing legal documents, especially executive orders, to extract specific requirements and obligations. Your task is to identify all mandates, directives, and required actions in the text.

Your strengths include:
1. Distinguishing between mandatory requirements ("shall", "must") and discretionary provisions ("may", "should")
2. Identifying the specific entities responsible for fulfilling requirements
3. Understanding complex conditional requirements
4. Recognizing deadlines and timeframes associated with requirements
5. Determining the relative importance and priority of different requirements

Focus on accuracy and completeness. Include ALL requirements mentioned, but assign appropriate confidence levels. For requirements that are clearly and explicitly stated with mandatory language, assign high confidence. For requirements that are implied or use ambiguous language, assign lower confidence.

Requirements should be actionable directives, not general statements of policy. Look for specific actions that must be taken by specific entities within specific timeframes.

Format your response as structured JSON according to the schema specified in the prompt.`;
  }
  
  /**
   * Process and clean requirements extracted by the AI
   * @param {Array} requirements Array of requirements from AI
   * @returns {Array} Processed requirements
   * @private
   */
  _processRequirements(requirements) {
    // First pass - assign IDs to each requirement
    const requirementsWithIds = requirements.map(req => {
      return {
        ...req,
        id: crypto.randomUUID()
      };
    });
    
    // Second pass - link alternatives and ensure proper structure
    return requirementsWithIds.map(req => {
      // Look for alternatives
      let alternativeToRequirementId = null;
      
      if (req.alternativeTo) {
        // Find the requirement this is an alternative to
        const alternativeMatch = requirementsWithIds.find(r => 
          r.description && req.alternativeTo && 
          r.description.includes(req.alternativeTo)
        );
        
        if (alternativeMatch) {
          alternativeToRequirementId = alternativeMatch.id;
        }
      }
      
      // Ensure the requirement has the proper structure
      return {
        id: req.id,
        requirementType: req.requirementType || 'other',
        description: req.description || '',
        textContext: req.textContext || '',
        targetEntities: Array.isArray(req.targetEntities) ? req.targetEntities : [],
        deadline: req.deadline || null,
        isExplicit: req.isExplicit !== undefined ? req.isExplicit : true,
        confidence: req.confidence || 0.7,
        priority: req.priority || 'medium',
        conditionalOn: req.conditionalOn || null,
        alternativeToRequirementId
      };
    }).filter(req => {
      // Filter out requirements with confidence below threshold
      return req.confidence >= this.options.confidenceThreshold;
    });
  }
  
  /**
   * Calculate confidence based on the extracted requirements
   * @param {Object} results Extraction results
   * @param {Object} order Original order data
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(results, order) {
    if (!results || !results.requirements || results.requirements.length === 0) {
      return 0.5; // Medium confidence when no requirements found
    }
    
    // Average confidence of all requirements
    const totalConfidence = results.requirements.reduce((sum, req) => sum + (req.confidence || 0), 0);
    const averageConfidence = totalConfidence / results.requirements.length;
    
    // Check for high-priority requirements
    const highPriorityCount = results.requirements.filter(req => req.priority === 'high').length;
    const highPriorityRatio = highPriorityCount / results.requirements.length;
    
    // Check for explicit requirements with deadlines
    const explicitWithDeadlineCount = results.requirements.filter(req => 
      req.isExplicit && req.deadline).length;
    const explicitWithDeadlineRatio = explicitWithDeadlineCount / results.requirements.length;
    
    // Adjust confidence based on quality of requirements
    let adjustedConfidence = averageConfidence;
    
    if (highPriorityRatio > 0.3) {
      adjustedConfidence += 0.05; // Boost if we have good proportion of high-priority requirements
    }
    
    if (explicitWithDeadlineRatio > 0.3) {
      adjustedConfidence += 0.05; // Boost if we have good proportion of explicit requirements with deadlines
    }
    
    // Check if we have a reasonable number of requirements for an executive order
    if (results.requirements.length < 3) {
      adjustedConfidence -= 0.1; // Reduce confidence if we found very few requirements
    } else if (results.requirements.length > 20) {
      adjustedConfidence -= 0.05; // Slight reduction if there are too many requirements (might be over-extracting)
    }
    
    return Math.max(0, Math.min(1, adjustedConfidence)); // Ensure within 0-1 range
  }
}

module.exports = RequirementExtractor;