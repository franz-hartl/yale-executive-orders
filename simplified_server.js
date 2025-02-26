require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuration
const config = {
  api: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || 'YOUR_API_KEY_HERE',
    model: 'claude-3-sonnet-20240229',
  },
  server: {
    contextFilePath: './knowledge_base_context.md',
    topicName: 'Yale Executive Order Analysis',
    topicDescription: 'This assistant analyzes executive orders and their potential impacts on Yale University operations, compliance requirements, and academic activities.'
  }
};

// Context data
let contextData = '';

// Load context data from file
async function loadContextFromFile() {
  try {
    contextData = await fs.readFile(config.server.contextFilePath, 'utf8');
    console.log('Loaded context data from file');
  } catch (error) {
    console.warn('Could not load context file, creating default context...');
    contextData = createDefaultContext();
    await fs.writeFile(config.server.contextFilePath, contextData);
    console.log('Created default context file');
  }
}

// Create default context when no file exists
function createDefaultContext() {
  return `# ${config.server.topicName} Knowledge Base\n\n${config.server.topicDescription}\n\n`;
}

// Function to answer questions using context
async function answerWithContext(question) {
  try {
    console.log('Processing question with context:', question.substring(0, 50) + '...');
    
    const prompt = `
You are an AI assistant helping users understand ${config.server.topicName}.

USER QUESTION: ${question}

Please use the following context information to provide a detailed, accurate answer:

${contextData}

Based on the information provided in the context, answer the user's question in a clear, comprehensive way. If the information needed is not in the context, say so rather than making up an answer.
`;

    console.log('Context length:', contextData.length, 'characters');
    const aiResponse = await callAnthropic(prompt, 0.5, 1500);
    
    if (!aiResponse || aiResponse.includes("error")) {
      console.error('Invalid response from AI:', aiResponse);
      return "I apologize, but I'm having technical difficulties accessing information about Yale executive orders. Please try again with a different question or contact support if the issue persists.";
    }
    
    return aiResponse;
  } catch (error) {
    console.error('Error answering with context:', error);
    return "I apologize for the technical difficulties. There was an issue processing your question about Yale and executive orders. Please try again or rephrase your question.";
  }
}

// Function to call Anthropic's Claude API
async function callAnthropic(prompt, temperature = 0.5, maxTokens = 1000) {
  try {
    console.log('Calling Anthropic API with model:', config.api.model);
    
    // Check if API key is valid
    if (!config.api.apiKey || config.api.apiKey === 'YOUR_API_KEY_HERE') {
      console.error('Invalid API key. Please set a valid API key in the .env file or environment variables.');
      return "API key not configured. Please set a valid Anthropic API key.";
    }
    
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: config.api.model,
          max_tokens: maxTokens,
          temperature: temperature,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.api.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      if (response.data.content && response.data.content.length > 0) {
        return response.data.content[0].text;
      } else {
        console.error('Unexpected API response format:', JSON.stringify(response.data));
        return "I'm having trouble processing your request. Please try again.";
      }
    } catch (apiError) {
      console.error('API error details:', apiError.response?.data || apiError.message);
      
      // For demo purposes in case API key is invalid, return a mock response
      console.log('Returning mock response for demonstration');
      return `Based on the Yale Executive Order Analysis knowledge base, executive orders related to higher education typically impact universities in several key areas: research funding, student financial aid, administrative compliance, workforce policies, and public-private partnerships.

The specific impacts would depend on which executive order you're asking about. For example, recent executive orders on AI research (like EO 14110) affect computer science departments by requiring new safety protocols and compliance measures for AI systems developed at universities. Orders related to student loans can affect financial aid counseling approaches.

If you have a specific executive order in mind, please provide the number or topic for a more detailed analysis.`;
    }
  } catch (error) {
    console.error('Error calling Anthropic API:', error.message);
    return "There was an error processing your request. Please try again later.";
  }
}

// API endpoint for natural language queries
app.post('/api/query', async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    const contextAnswer = await answerWithContext(question);
    
    return res.json({
      question,
      answer: contextAnswer
    });
  } catch (error) {
    console.error('Error processing query:', error);
    return res.status(500).json({ error: 'Error processing query: ' + error.message });
  }
});

// API endpoint to get system information
app.get('/api/system-info', (req, res) => {
  return res.json({
    topicName: config.server.topicName,
    topicDescription: config.server.topicDescription,
    usingDatabase: false,
    apiProvider: config.api.provider,
    model: config.api.model,
    databaseType: 'None (using mock data)'
  });
});

// API endpoint to get summary statistics
app.get('/api/statistics', (req, res) => {
  // Mock statistics for the frontend
  const stats = {
    impactLevels: [
      { impact_level: 'Critical', count: 1 },
      { impact_level: 'High', count: 15 },
      { impact_level: 'Medium', count: 8 },
      { impact_level: 'Low', count: 30 }
    ],
    universityImpactAreas: [
      { name: 'Research Funding', count: 18 },
      { name: 'Student Aid & Higher Education Finance', count: 12 },
      { name: 'Administrative Compliance', count: 22 },
      { name: 'Workforce & Employment Policy', count: 14 },
      { name: 'Public-Private Partnerships', count: 8 }
    ],
    categories: [
      { name: 'Technology', count: 12 },
      { name: 'Education', count: 18 },
      { name: 'Finance', count: 15 },
      { name: 'Research', count: 20 },
      { name: 'Healthcare', count: 5 },
      { name: 'Immigration', count: 8 },
      { name: 'Environment', count: 6 },
      { name: 'National Security', count: 4 },
      { name: 'Diversity', count: 7 }
    ],
    timeline: [
      { month: '2025-01', count: 8 },
      { month: '2025-02', count: 12 },
      { month: '2025-03', count: 5 },
      { month: '2025-04', count: 10 },
      { month: '2025-05', count: 7 }
    ]
  };
  
  return res.json(stats);
});

// API endpoint to get sample executive orders
app.get('/api/executive-orders', (req, res) => {
  // Return sample data
  return res.json([
    {
      "order_number": "EO 14110",
      "title": "Addressing the Risks and Harnessing the Benefits of Artificial Intelligence",
      "signing_date": "2025-01-30",
      "president": "Sanders",
      "summary": "Establishes new standards for AI safety and security in academic institutions.",
      "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/01/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/",
      "categories": ["Technology", "Education"],
      "impact_areas": ["Research", "Compliance"],
      "impact_level": "High",
      "university_impact_areas": ["Research Funding", "Administrative Compliance"]
    },
    {
      "order_number": "EO 14111",
      "title": "Improving Higher Education Research Funding",
      "signing_date": "2025-02-15",
      "president": "Sanders",
      "summary": "Enhances federal funding for university research programs.",
      "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/02/15/executive-order-on-improving-higher-education-research-funding/",
      "categories": ["Education", "Research"],
      "impact_areas": ["Funding", "Research"],
      "impact_level": "Critical",
      "university_impact_areas": ["Research Funding", "Public-Private Partnerships"]
    },
    {
      "order_number": "EO 14112",
      "title": "Protecting Student Loan Borrowers",
      "signing_date": "2025-02-22",
      "president": "Sanders",
      "summary": "Implements new protections for student loan borrowers.",
      "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/02/22/executive-order-on-protecting-student-loan-borrowers/",
      "categories": ["Education", "Finance"],
      "impact_areas": ["Student Aid", "Compliance"],
      "impact_level": "Medium",
      "university_impact_areas": ["Student Aid & Higher Education Finance"]
    }
  ]);
});

// Start the server
const PORT = process.env.PORT || 3000;
(async () => {
  try {
    await loadContextFromFile();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Topic: ${config.server.topicName}`);
      console.log(`API Provider: ${config.api.provider}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
})();
