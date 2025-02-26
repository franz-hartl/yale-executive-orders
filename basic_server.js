const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

// Initialize Express app
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to get system information
app.get('/api/system-info', (req, res) => {
  return res.json({
    topicName: 'Yale Executive Order Analysis',
    topicDescription: 'This assistant analyzes executive orders and their potential impacts on Yale University operations, compliance requirements, and academic activities.',
    usingDatabase: false,
    apiProvider: 'anthropic',
    model: 'claude-3-sonnet-20240229'
  });
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
    },
    {
      "order_number": "EO 14113",
      "title": "Promoting Diversity in Higher Education",
      "signing_date": "2025-03-05",
      "president": "Sanders",
      "summary": "Establishes initiatives to promote diversity and inclusion in higher education institutions.",
      "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/03/05/executive-order-on-promoting-diversity-in-higher-education/",
      "categories": ["Education", "Diversity"],
      "impact_areas": ["Policy", "Compliance"],
      "impact_level": "High",
      "university_impact_areas": ["Administrative Compliance", "Workforce & Employment Policy"]
    },
    {
      "order_number": "EO 14114",
      "title": "Strengthening University-Industry Research Partnerships",
      "signing_date": "2025-03-15",
      "president": "Sanders",
      "summary": "Creates new frameworks for collaboration between universities and private industry.",
      "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2025/03/15/executive-order-on-strengthening-university-industry-research-partnerships/",
      "categories": ["Research", "Industry"],
      "impact_areas": ["Economic Development", "Research"],
      "impact_level": "High",
      "university_impact_areas": ["Public-Private Partnerships", "Research Funding"]
    }
  ]);
});

// Minimal query endpoint for the chat functionality
app.post('/api/query', (req, res) => {
  const { question } = req.body;
  
  if (\!question) {
    return res.status(400).json({ error: 'Question is required' });
  }
  
  // Simple response for demo purposes
  return res.json({
    question,
    answer: "This is a demonstration response to your question: \"" + question + "\". In a production environment, this would be processed by Claude or another AI model. The application is currently running in demonstration mode with sample data focusing on executive orders from January 20, 2025 onwards."
  });
});

// Start the server
const PORT = 8080;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
