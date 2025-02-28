# AI Pipeline for Yale Executive Order Analysis

This document explains the AI integration in the Yale Executive Order Analysis system, detailing how Claude AI is leveraged for various tasks.

## Overview

The AI pipeline consists of three main AI-powered components:

1. **Order Categorization**: AI-based categorization of executive orders relevant to Yale University
2. **Plain Language Summaries**: Generation of accessible summaries of complex executive orders
3. **Natural Language Queries**: Context-based answering of questions about executive orders

## 1. AI-Powered Categorization

The system categorizes executive orders using a hybrid approach - rule-based keyword matching for initial categorization and Claude AI for more sophisticated analysis:

### Rule-Based Categorization

```javascript
// Implementation in sqlite_setup.js
function categorizeExecutiveOrders() {
  db.all('SELECT id, title, summary FROM executive_orders', [], (err, orders) => {
    // Define keywords for university-relevant categories
    const categoryKeywords = {
      'Technology': ['technology', 'digital', 'cyber', 'internet', 'innovation'],
      'Education': ['education', 'student', 'school', 'university', 'college'],
      // Additional categories...
    };
    
    // Process each order using keyword matching
    orders.forEach(order => {
      const content = `${order.title} ${order.summary}`.toLowerCase();
      
      // Find category matches
      Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        // Assign categories based on keyword matches
        // ...
      });
    });
  });
}
```

### Claude AI Categorization

The system provides an API endpoint for AI-powered categorization:

```javascript
// Implementation in api_server.js (lines 736-896)
app.post('/api/categorize-order/:id', async (req, res) => {
  const orderId = req.params.id;
  
  // Fetch the order details
  db.get('SELECT * FROM executive_orders WHERE id = ?', [orderId], async (err, order) => {
    // Prepare order text for analysis
    const orderText = `
      Executive Order: ${order.order_number}
      Title: ${order.title}
      Date: ${order.signing_date || 'Unknown'}
      President: ${order.president || 'Unknown'}
      Summary: ${order.summary || ''}
      Full Text: ${order.full_text || ''}
    `;
    
    // Call Claude API for categorization
    const anthropicResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        system: `You are an expert in analyzing executive orders and categorizing them for university compliance. 
                The categories you can use are: ["Technology", "Education", "Healthcare", "Finance", "Environment", 
                "Immigration", "Security", "Diversity", "Research", "Infrastructure", "International", "Industry"].
                The impact areas you can assign are: ["Funding", "Policy", "Operations", "Compliance", "Research", "International"].
                The university impact areas to choose from are: ["Research Funding", "Student Aid & Higher Education Finance", 
                "Administrative Compliance", "Workforce & Employment Policy", "Public-Private Partnerships"].
                Return your analysis in JSON format with fields: categories, impactAreas, universityImpactAreas, and rationale.`,
        messages: [
          {
            role: "user",
            content: `Based on the following executive order, provide a categorization for university compliance tracking. 
                      Analyze the content and determine:
                      1. The primary categories the order falls under (select 1-3 from the available list)
                      2. The impact areas affecting universities (select 1-3 from the available list)
                      3. Specific university impact areas most relevant to this order (select 1-2 from the available list)
                      
                      Executive order details:
                      ${orderText}`
          }
        ]
      }
    );
    
    // Parse and update the database with AI-generated categorization
    // ...
  });
});
```

Key features of the categorization system:
- **University-Specific Focus**: Tailored categories and impact areas relevant to higher education
- **Multi-Level Categorization**: General categories + university-specific impact areas
- **Human-Readable Rationale**: AI provides explanation for its categorization choices
- **Batch Processing**: Support for categorizing many orders (via frontend button)
- **Flexible Integration**: Categories can be added or modified through database and prompt

## 2. Plain Language Summaries

A core feature of the system is the generation of accessible plain language summaries for executive orders using the Claude API:

```javascript
// Implementation in generate_plain_summaries.js
async function generateMultiLevelSummaries(order) {
  // Create a streamlined prompt for Claude with essential information
  const prompt = `
    Create three different levels of summaries for this executive order for higher education administrators, focusing on differentiated impact by institution type:

    EXECUTIVE ORDER INFORMATION:
    Title: ${order.title}
    Order Number: ${order.order_number}
    Date: ${order.signing_date || 'Unknown'}
    President: ${order.president || 'Unknown'}
    Impact Level: ${order.impact_level || 'Unknown'}
    Categories: ${order.categories.join(', ')}
    University Impact Areas: ${order.university_impact_areas.join(', ')}
    
    Original Summary: ${order.summary || 'Not available'}
    
    Additional Text: ${order.full_text || ''}
    
    Format your response as JSON with this structure:
    {
      "executive_brief": "1-2 sentence TL;DR summary with institution variation note if applicable",
      "standard_summary": {
        "title": "Clear title",
        "overview": "Concise explanation",
        "bottom_line": "Critical takeaway",
        // Additional fields for impact matrix, action steps, etc.
      },
      "comprehensive_analysis": {
        "title": "Detailed title",
        "overview": "Thorough explanation",
        // Additional fields for detailed analysis, differentiated by institution type
      }
    }
  `;
  
  // Call Claude API with optimized system prompt
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: "claude-3-opus-20240229",
      max_tokens: 3500,
      system: "You are an expert in higher education administration with specialized expertise in policy domains relevant to colleges and universities of all types. You have deep expertise in institutional differentiation and understand how federal policies affect various institutions differently based on their type, size, mission, resources, and other characteristics.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    }
  );
  
  // Process response and format as HTML with institution-specific sections
  // ...
}
```

Key aspects of the summary generation:
- **Multi-Level Summaries**: Produces three distinct summary types (Executive Brief, Standard Summary, and Comprehensive Analysis)
- **Institution-Differentiated Analysis**: Tailored to different institution types (R1/R2 research universities, master's universities, colleges, community colleges)
- **Optimized Context Usage**: Streamlined prompts and reduced token allocation to prevent context limit errors
- **Structured JSON Output**: Consistent machine-readable format for templated display
- **Resource Requirements by Institution Size**: Specific guidance for large, medium, and small institutions
- **Compliance Timeline Variations**: Highlights differences in deadlines and requirements by institution type

## 3. Natural Language Queries

The system supports natural language questions about executive orders via the simplified server:

```javascript
// Implementation in simplified_server.js
app.post('/api/query', async (req, res) => {
  const { question } = req.body;
  
  // Load context from knowledge base
  const context = await fs.readFile('knowledge_base_context.md', 'utf8');
  
  // Call Claude API with context and question
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: "You are an assistant that helps Yale University staff understand executive orders...",
      messages: [
        {
          role: "user",
          content: `Context information: ${context}\n\nQuestion: ${question}\n\nPlease provide a concise answer based on the context information.`
        }
      ]
    }
  );
  
  return res.json({
    question,
    answer: response.data.content[0].text
  });
});
```

## Current Implementation Details

The AI pipeline currently leverages:

1. **Multiple Claude Models**:
   - `claude-3-haiku-20240307`: For fast categorization and queries
   - `claude-3-opus-20240229`: For high-quality plain language summaries

2. **AI Integration Points**:
   - `api_server.js`: Handles categorization requests via API endpoint
   - `generate_plain_summaries.js`: Standalone script for batch generating summaries
   - `simplified_server.js`: Natural language query processing

3. **Technical Implementation**:
   - Asynchronous JavaScript for all AI operations
   - Error handling and rate limiting for API calls
   - JSON parsing and formatting for structured data exchange
   - HTML templating for plain language summary presentation

4. **Structured Prompting Techniques**:
   - Detailed system prompts that establish expertise and role
   - Specific task instructions with clear output format requirements
   - Data formatting for optimal context inclusion
   - JSON output format for structured responses

## Recent Enhancements

Recent improvements to the AI pipeline include:

1. **Multi-Level Differentiated Summaries**:
   - Expanded from Yale-specific to sector-wide higher education analysis
   - Developed three-tiered summary system (Executive Brief, Standard Summary, Comprehensive Analysis)
   - Implemented institution-specific impact analysis across diverse higher education segments
   - Added differentiated resource requirements based on institution size
   - Created custom templates for displaying institution-specific guidance

2. **Optimized Context Management**:
   - Fine-tuned prompt structure for detailed institution-specific analysis
   - Adjusted max_tokens parameter to 3500 for comprehensive output
   - Enhanced system prompt with detailed expertise in differential impacts
   - Structured JSON output format for consistent templated display
   - Implemented efficient HTML templates for differentiated information display

3. **Batch Categorization Improvements**:
   - Support for processing up to 500 orders in one batch operation
   - Smart filtering to prioritize recent (2022+) and uncategorized orders
   - Progress notifications during categorization process
   - Improved error handling for API failures

## Future Enhancements

Planned improvements to the AI pipeline:

1. **Automatic Data Collection**: Add scheduled scraping with AI-guided extraction
2. **Fine-Tuned Models**: Custom-trained models for higher education-specific categorization
3. **Multi-Modal Analysis**: Analyze PDFs and images of executive orders directly
4. **Impact Assessment Framework**: Implement quantitative scoring methodology for comparing impacts
5. **Institution-Specific Templates**: Develop dynamic templates that adjust based on institution type
6. **Real-Time Alerts**: Notification system customized to institution profile and needs
