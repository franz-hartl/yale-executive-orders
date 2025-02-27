require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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
    provider: 'anthropic', // Only using Anthropic
    apiKey: process.env.ANTHROPIC_API_KEY || 'YOUR_API_KEY_HERE',
    model: process.env.API_MODEL || 'claude-3-sonnet-20240229', // Fallback to stable model name
  },
  database: {
    enabled: process.env.DB_ENABLED === 'true', // Use environment variable
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'executive_orders',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres'
  },
  server: {
    port: process.env.PORT || 3000,
    contextFilePath: process.env.CONTEXT_FILE_PATH || './knowledge_base_context.md',
    topicName: process.env.TOPIC_NAME || 'Yale Executive Order Analysis',
    topicDescription: process.env.TOPIC_DESCRIPTION || 'This assistant analyzes executive orders and their potential impacts on Yale University operations, compliance requirements, and academic activities.'
  }
};

// SQLite database connection (only initialized if database is enabled)
let sqliteDb;

// Context data
let contextData = '';

// Initialize application
async function initialize() {
  try {
    // Connect to SQLite database if enabled
    if (config.database.enabled) {
      try {
        const sqliteDbPath = path.join(__dirname, 'executive_orders.db');
        
        // Create a promise-based version of the SQLite connection
        const openSqliteDb = () => {
          return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err) => {
              if (err) {
                reject(err);
              } else {
                resolve(db);
              }
            });
          });
        };
        
        sqliteDb = await openSqliteDb();
        console.log('Connected to SQLite database');
        
        // Load context data from file since SQLite doesn't store it
        await loadContextFromFile();
      } catch (sqliteError) {
        console.warn('Could not connect to SQLite database:', sqliteError.message);
        console.log('Falling back to file-based context mode');
        config.database.enabled = false;
        await loadContextFromFile();
      }
    } else {
      // Load context from file if database is not enabled
      await loadContextFromFile();
    }
    
    console.log(`Server initialized with topic: ${config.server.topicName}`);
  } catch (error) {
    console.error('Error initializing:', error);
    console.log('Falling back to file-based context mode');
    config.database.enabled = false;
    try {
      await loadContextFromFile();
    } catch (fileError) {
      console.error('Error loading context from file:', fileError);
      // Create default context
      contextData = createDefaultContext();
      console.log('Created default context');
    }
  }
}

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

// Generate context data from database
async function generateContextFromDatabase() {
  try {
    // Get data from the database
    const result = await client.query(`
      SELECT * FROM knowledge_items 
      ORDER BY created_at DESC
    `);
    
    // Prepare content for context
    let contextContent = `# ${config.server.topicName} Knowledge Base\n\n`;
    contextContent += `${config.server.topicDescription}\n\n`;
    
    for (const row of result.rows) {
      contextContent += '---\n\n';
      contextContent += `## ${row.title}\n\n`;
      contextContent += `${row.content}\n\n`;
      if (row.metadata) {
        contextContent += `**Metadata:** ${JSON.stringify(row.metadata)}\n\n`;
      }
    }
    
    // Save to memory and file
    contextData = contextContent;
    await fs.writeFile(config.server.contextFilePath, contextContent);
    console.log('Generated and saved context data from database');
    return contextContent;
  } catch (error) {
    console.error('Error generating context data from database:', error);
    throw error;
  }
}

// Function to convert natural language to SQL query using the configured AI provider
async function nlToSql(question) {
  try {
    const prompt = `
You are an AI assistant that translates natural language questions about ${config.server.topicName} into SQL queries.

The database schema is:
- knowledge_items (id, title, content, metadata, created_at, updated_at)
- categories (id, name, description)
- item_categories (item_id, category_id)

The knowledge_items.id is referenced as the item_id in the related tables.

Question: ${question}

Generate a SQL query that answers this question. The query should be valid PostgreSQL SQL.
Return ONLY the SQL query without any other text.
`;

    const aiResponse = await callAI(prompt, 0.1, 500);
    return aiResponse;
  } catch (error) {
    console.error('Error translating natural language to SQL:', error);
    return null;
  }
}

// Function to format query results using the configured AI provider
async function formatQueryResults(question, results, sqlQuery) {
  try {
    const prompt = `
You are an AI assistant that formats database query results about ${config.server.topicName} into a readable answer.

Question: ${question}

SQL Query Used:
${sqlQuery}

Query Results:
${JSON.stringify(results, null, 2)}

Based on the query results, provide a clear, concise answer to the original question. If the results are empty, say so and suggest a different query approach. Format the information in a structured way suitable for a user interface.
`;

    const aiResponse = await callAI(prompt, 0.7, 1000);
    return aiResponse;
  } catch (error) {
    console.error('Error formatting query results:', error);
    return "There was an error formatting the results.";
  }
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
    const aiResponse = await callAI(prompt, 0.5, 1500);
    
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

// Function to call the Anthropic API
async function callAI(prompt, temperature = 0.5, maxTokens = 1000) {
  return callAnthropic(prompt, temperature, maxTokens);
}

// Function to call Anthropic's Claude API
async function callAnthropic(prompt, temperature = 0.5, maxTokens = 1000) {
  try {
    console.log('Calling Anthropic API with model:', config.api.model);
    
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
  } catch (error) {
    console.error('Error calling Anthropic API:', error.response?.data || error.message);
    console.error('Error details:', JSON.stringify(error.response?.data || error.message));
    return "There was an error connecting to the AI service. Please check your API key and try again.";
  }
}

// OpenAI API removed - using only Anthropic now

// API endpoint to get all executive orders
app.get('/api/executive-orders', async (req, res) => {
  console.log('Received request for /api/executive-orders');
  try {
    // If database is not connected, use sample data
    if (!sqliteDb || !config.database.enabled) {
      console.log('Database not available, using sample data');
      
      // Read sample data from file
      try {
        const fs = require('fs');
        const sampleDataPath = path.join(__dirname, 'sample_data.json');
        console.log('Reading sample data from:', sampleDataPath);
        
        if (fs.existsSync(sampleDataPath)) {
          console.log('Sample data file exists, size:', fs.statSync(sampleDataPath).size, 'bytes');
          const sampleDataContent = fs.readFileSync(sampleDataPath, 'utf8');
          console.log('Sample data read, length:', sampleDataContent.length);
          try {
            const sampleData = JSON.parse(sampleDataContent);
            console.log('Sample data parsed successfully, contains', sampleData.length, 'items');
            res.set('Content-Type', 'application/json');
            return res.json(sampleData);
          } catch (parseError) {
            console.error('Error parsing sample data JSON:', parseError);
            return res.status(500).json({ error: 'Error parsing sample data JSON: ' + parseError.message });
          }
        } else {
          console.error('Sample data file not found');
          // Provide fallback data if file doesn't exist
          return res.json([
            {
              "order_number": "EO 14110",
              "title": "Addressing the Risks and Harnessing the Benefits of Artificial Intelligence",
              "signing_date": "2023-10-30",
              "president": "Biden",
              "summary": "Establishes new standards for AI safety and security.",
              "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2023/10/30/executive-order-on-the-safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence/",
              "categories": ["Technology", "Education"],
              "impact_areas": ["Research", "Compliance"]
            },
            {
              "order_number": "EO 14028",
              "title": "Improving the Nation's Cybersecurity",
              "signing_date": "2021-05-12",
              "president": "Biden",
              "summary": "Enhances cybersecurity practices.",
              "url": "https://www.whitehouse.gov/briefing-room/presidential-actions/2021/05/12/executive-order-on-improving-the-nations-cybersecurity/",
              "categories": ["Technology", "National Security"],
              "impact_areas": ["IT Operations", "Research Security"]
            }
          ]);
        }
      } catch (error) {
        console.error('Error reading sample data:', error);
        return res.status(500).json({ error: 'Error reading sample data: ' + error.message });
      }
    } else if (sqliteDb) {
      try {
        // Helper function to run SQLite queries with promises
        function sqliteQuery(query, params = []) {
          return new Promise((resolve, reject) => {
            sqliteDb.all(query, params, (err, rows) => {
              if (err) {
                reject(err);
              } else {
                resolve(rows);
              }
            });
          });
        }
        
        // Get executive orders from SQLite
        const orders = await sqliteQuery(`
          SELECT 
            id, 
            order_number, 
            title, 
            signing_date, 
            publication_date, 
            president, 
            summary, 
            url, 
            impact_level, 
            status 
          FROM executive_orders
          ORDER BY signing_date DESC
        `);
        
        // Get categories for each order
        for (const order of orders) {
          // Get categories
          const categories = await sqliteQuery(`
            SELECT c.name 
            FROM categories c
            JOIN order_categories oc ON c.id = oc.category_id
            WHERE oc.order_id = ?
          `, [order.id]);
          
          order.categories = categories.map(cat => cat.name);
          
          // Get impact areas
          const impactAreas = await sqliteQuery(`
            SELECT i.name 
            FROM impact_areas i
            JOIN order_impact_areas oia ON i.id = oia.impact_area_id
            WHERE oia.order_id = ?
          `, [order.id]);
          
          order.impact_areas = impactAreas.map(area => area.name);
          
          // Get university impact areas
          const universityImpactAreas = await sqliteQuery(`
            SELECT ui.name 
            FROM university_impact_areas ui
            JOIN order_university_impact_areas ouia ON ui.id = ouia.university_impact_area_id
            WHERE ouia.order_id = ?
          `, [order.id]);
          
          order.university_impact_areas = universityImpactAreas.map(area => area.name);
        }
        
        return res.json(orders);
      } catch (error) {
        console.error('Error querying SQLite database:', error);
        return res.status(500).json({ error: 'Error querying SQLite database: ' + error.message });
      }
    } else {
      // No database connection available, use sample data
      console.warn('No database connection available, using sample data');
      return res.json([]);
    }
  } catch (error) {
    console.error('Error fetching executive orders:', error);
    return res.status(500).json({ error: 'Error fetching executive orders' });
  }
});

// API endpoint for natural language queries
app.post('/api/query', async (req, res) => {
  try {
    const { question, queryType = 'auto' } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // Database querying only available if database is enabled
    if ((queryType === 'sql' || queryType === 'auto') && config.database.enabled) {
      // Convert question to SQL
      const sqlQuery = await nlToSql(question);
      
      if (!sqlQuery) {
        return res.status(500).json({ error: 'Failed to generate SQL query' });
      }
      
      // Execute SQL query
      const queryResult = await client.query(sqlQuery);
      
      // Format results
      const formattedAnswer = await formatQueryResults(question, queryResult.rows, sqlQuery);
      
      return res.json({
        question,
        answer: formattedAnswer,
        sqlQuery,
        rawResults: queryResult.rows
      });
    } else if (queryType === 'context' || !config.database.enabled) {
      // Use context to answer
      const contextAnswer = await answerWithContext(question);
      
      return res.json({
        question,
        answer: contextAnswer
      });
    } else {
      // Default to using both methods when database is enabled
      const sqlQuery = await nlToSql(question);
      let sqlAnswer = 'Could not generate SQL query.';
      let rawResults = [];
      
      if (sqlQuery) {
        const queryResult = await client.query(sqlQuery);
        sqlAnswer = await formatQueryResults(question, queryResult.rows, sqlQuery);
        rawResults = queryResult.rows;
      }
      
      const contextAnswer = await answerWithContext(question);
      
      return res.json({
        question,
        sqlAnswer,
        contextAnswer,
        sqlQuery,
        rawResults
      });
    }
  } catch (error) {
    console.error('Error processing query:', error);
    return res.status(500).json({ error: 'Error processing query: ' + error.message });
  }
});

// API endpoint for administrative operations
app.post('/api/admin/refresh-context', async (req, res) => {
  try {
    if (config.database.enabled) {
      await generateContextFromDatabase();
    } else {
      await loadContextFromFile();
    }
    return res.json({ success: true, message: 'Context data refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing context:', error);
    return res.status(500).json({ error: 'Error refreshing context: ' + error.message });
  }
});

// API endpoint to get system information
app.get('/api/system-info', (req, res) => {
  return res.json({
    topicName: config.server.topicName,
    topicDescription: config.server.topicDescription,
    usingDatabase: config.database.enabled,
    databaseType: sqliteDb ? 'SQLite' : 'None',
    apiProvider: config.api.provider,
    model: config.api.model,
    lastUpdated: new Date().toISOString(),
    orderCount: 100 // Default count for interface display
  });
});

// API endpoint for statistics
app.get('/api/statistics', async (req, res) => {
  try {
    if (config.database.enabled && sqliteDb) {
      // Helper function for SQLite queries
      function sqliteQuery(query, params = []) {
        return new Promise((resolve, reject) => {
          sqliteDb.all(query, params, (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          });
        });
      }
      
      // Get impact level statistics
      const impactLevelsQuery = `
        SELECT impact_level, COUNT(*) as count
        FROM executive_orders
        GROUP BY impact_level
        ORDER BY
          CASE impact_level
            WHEN 'Critical' THEN 1
            WHEN 'High' THEN 2
            WHEN 'Medium' THEN 3
            WHEN 'Low' THEN 4
            ELSE 5
          END
      `;
      const impactLevels = await sqliteQuery(impactLevelsQuery);
      
      // Get university impact area statistics
      const universityImpactAreasQuery = `
        SELECT uia.name, COUNT(DISTINCT ouia.order_id) as count
        FROM university_impact_areas uia
        JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
        GROUP BY uia.name
        ORDER BY count DESC
      `;
      const universityImpactAreas = await sqliteQuery(universityImpactAreasQuery);
      
      // Get category statistics
      const categoriesQuery = `
        SELECT c.name, COUNT(DISTINCT oc.order_id) as count
        FROM categories c
        JOIN order_categories oc ON c.id = oc.category_id
        GROUP BY c.name
        ORDER BY count DESC
        LIMIT 10
      `;
      const categories = await sqliteQuery(categoriesQuery);
      
      // Get timeline statistics (by month) - SQLite version
      const timelineQuery = `
        SELECT 
          strftime('%Y-%m', signing_date) AS month,
          COUNT(*) as count
        FROM executive_orders
        WHERE signing_date IS NOT NULL
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `;
      const timeline = await sqliteQuery(timelineQuery);
      
      return res.json({
        impactLevels: impactLevels,
        universityImpactAreas: universityImpactAreas,
        categories: categories,
        timeline: timeline
      });
    } else {
      // Return dummy statistics
      return res.json({
        impactLevels: [
          { impact_level: 'Critical', count: 5 },
          { impact_level: 'High', count: 15 },
          { impact_level: 'Medium', count: 25 },
          { impact_level: 'Low', count: 10 }
        ],
        universityImpactAreas: [
          { name: 'Research Funding', count: 18 },
          { name: 'Administrative Compliance', count: 16 },
          { name: 'Student Aid & Higher Education Finance', count: 12 },
          { name: 'Workforce & Employment Policy', count: 10 },
          { name: 'Public-Private Partnerships', count: 8 }
        ],
        categories: [
          { name: 'Finance', count: 25 },
          { name: 'Technology', count: 18 },
          { name: 'Education', count: 15 },
          { name: 'Research', count: 12 },
          { name: 'National Security', count: 10 },
          { name: 'Environment', count: 8 },
          { name: 'Healthcare', count: 6 },
          { name: 'Diversity', count: 5 },
          { name: 'Immigration', count: 4 },
          { name: 'Industry', count: 3 }
        ],
        timeline: [
          { month: '2023-12', count: 3 },
          { month: '2023-11', count: 2 },
          { month: '2023-10', count: 5 },
          { month: '2023-09', count: 1 },
          { month: '2023-08', count: 3 },
          { month: '2023-07', count: 4 },
          { month: '2023-06', count: 2 },
          { month: '2023-05', count: 6 },
          { month: '2023-04', count: 3 },
          { month: '2023-03', count: 2 },
          { month: '2023-02', count: 1 },
          { month: '2023-01', count: 4 }
        ]
      });
    }
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return res.status(500).json({ error: 'Error fetching statistics: ' + error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 8080; // Use environment variable for port

// Helper function to close SQLite database
function closeSqliteDb() {
  if (sqliteDb) {
    sqliteDb.close((err) => {
      if (err) {
        console.error('Error closing SQLite database:', err.message);
      } else {
        console.log('SQLite connection closed');
      }
    });
  }
}

// Try to initialize and start server without exiting on failure
(async () => {
  try {
    await initialize();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Topic: ${config.server.topicName}`);
      console.log(`API Provider: ${config.api.provider}`);
      console.log(`Database Enabled: ${config.database.enabled}`);
      console.log(`Database Type: ${sqliteDb ? 'SQLite' : 'None'}`);
    });
    
    // Handle server shutdown
    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      closeSqliteDb();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      closeSqliteDb();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    console.log('Using default context and continuing...');
    contextData = createDefaultContext();
    
    // Start server anyway
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (with limited functionality)`);
      console.log(`Topic: ${config.server.topicName}`);
      console.log(`API Provider: ${config.api.provider}`);
      console.log(`Database Enabled: false`);
    });
    
    // Handle server shutdown
    process.on('SIGINT', () => {
      console.log('SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  }
})();