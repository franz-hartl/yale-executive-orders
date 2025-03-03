/**
 * Yale Executive Orders MCP Server
 * 
 * This server implements the Model Context Protocol (MCP) to provide executive order data
 * to language models as contextual information.
 * 
 * The server exposes endpoints for:
 * 1. Retrieving all executive orders matching certain criteria
 * 2. Retrieving specific executive orders by ID or other identifiers
 * 3. Searching executive orders by content
 * 4. Getting related information like categories, impact areas, etc.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Create Express server
const app = express();
// Enhanced CORS configuration to allow external clients to access the server
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // Cache preflight requests for 24 hours
}));
app.use(bodyParser.json({ limit: '5mb' })); // Increased limit for document analysis

// Connect to SQLite database
const db = new sqlite3.Database('./executive_orders.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the executive orders database');
  }
});

// Helper functions
function formatResponse(message, data, success = true) {
  return {
    success,
    message,
    data,
    metadata: {
      source: "Yale Executive Orders Database",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    }
  };
}

/**
 * MCP Protocol implementation
 * The MCP protocol defines how context providers deliver information to LLMs
 */

// MCP Info endpoint - describes the capabilities of this server
app.get('/mcp/info', (req, res) => {
  const info = {
    name: "Yale Executive Orders MCP Provider",
    version: "1.0.0",
    description: "Provides executive order data and analysis for use as context in LLM applications",
    capabilities: [
      "executive_orders_search",
      "executive_orders_by_id",
      "executive_orders_by_category",
      "executive_orders_by_impact",
      "categories_list",
      "impact_areas_list",
      "university_impact_areas_list"
    ],
    authentication: {
      required: false
    },
    request_limits: {
      max_tokens_per_request: 100000,
      max_requests_per_minute: 60
    },
    contact: "support@example.edu"
  };
  
  res.json(formatResponse("MCP server information", info));
});

// MCP Search endpoint - handles search requests
app.post('/mcp/search', (req, res) => {
  const { query, filters = {}, limit = 10, offset = 0 } = req.body;
  
  let sqlQuery = `
    SELECT e.*, 
           group_concat(DISTINCT c.name) as categories,
           group_concat(DISTINCT ia.name) as impact_areas,
           group_concat(DISTINCT uia.name) as university_impact_areas
    FROM executive_orders e
    LEFT JOIN order_categories oc ON e.id = oc.order_id
    LEFT JOIN categories c ON oc.category_id = c.id
    LEFT JOIN order_impact_areas oia ON e.id = oia.order_id
    LEFT JOIN impact_areas ia ON oia.impact_area_id = ia.id
    LEFT JOIN order_university_impact_areas ouia ON e.id = ouia.order_id
    LEFT JOIN university_impact_areas uia ON ouia.university_impact_area_id = uia.id
  `;
  
  const whereConditions = [];
  const params = [];
  
  // Add full-text search if query is provided
  if (query && query.trim() !== '') {
    whereConditions.push(`(
      executive_orders_fts MATCH ?
      OR e.title LIKE ?
      OR e.summary LIKE ?
      OR e.full_text LIKE ?
    )`);
    params.push(query, `%${query}%`, `%${query}%`, `%${query}%`);
  }
  
  // Add filters for specific fields
  if (filters.president) {
    whereConditions.push('e.president = ?');
    params.push(filters.president);
  }
  
  if (filters.impact_level) {
    whereConditions.push('e.impact_level = ?');
    params.push(filters.impact_level);
  }
  
  if (filters.signing_date_from) {
    whereConditions.push('e.signing_date >= ?');
    params.push(filters.signing_date_from);
  }
  
  if (filters.signing_date_to) {
    whereConditions.push('e.signing_date <= ?');
    params.push(filters.signing_date_to);
  }
  
  if (filters.category) {
    whereConditions.push('c.name = ?');
    params.push(filters.category);
  }
  
  if (filters.impact_area) {
    whereConditions.push('ia.name = ?');
    params.push(filters.impact_area);
  }
  
  if (filters.university_impact_area) {
    whereConditions.push('uia.name = ?');
    params.push(filters.university_impact_area);
  }
  
  // Add WHERE clause if there are conditions
  if (whereConditions.length > 0) {
    sqlQuery += ' WHERE ' + whereConditions.join(' AND ');
  }
  
  // Add GROUP BY, ORDER BY, LIMIT and OFFSET
  sqlQuery += `
    GROUP BY e.id
    ORDER BY e.signing_date DESC
    LIMIT ? OFFSET ?
  `;
  
  params.push(limit, offset);
  
  // Execute the query
  db.all(sqlQuery, params, (err, rows) => {
    if (err) {
      console.error('Error executing search query:', err);
      return res.status(500).json(formatResponse("Error executing search", null, false));
    }
    
    // Process the results
    const results = rows.map(row => {
      return {
        ...row,
        categories: row.categories ? row.categories.split(',') : [],
        impact_areas: row.impact_areas ? row.impact_areas.split(',') : [],
        university_impact_areas: row.university_impact_areas ? row.university_impact_areas.split(',') : []
      };
    });
    
    res.json(formatResponse("Search results", {
      total: results.length,
      limit,
      offset,
      results
    }));
  });
});

// MCP Context endpoint - handles requests for specific context
app.post('/mcp/context', (req, res) => {
  const { context_type, context_id, detail_level = "standard" } = req.body;
  
  if (!context_type || !context_id) {
    return res.status(400).json(formatResponse("Missing required parameters", null, false));
  }
  
  switch (context_type) {
    case 'executive_order':
      getExecutiveOrderById(context_id, detail_level, (error, result) => {
        if (error) {
          return res.status(500).json(formatResponse(error, null, false));
        }
        res.json(formatResponse("Executive order details", result));
      });
      break;
      
    case 'category':
      getCategoryInfo(context_id, (error, result) => {
        if (error) {
          return res.status(500).json(formatResponse(error, null, false));
        }
        res.json(formatResponse("Category information", result));
      });
      break;
      
    case 'impact_area':
      getImpactAreaInfo(context_id, (error, result) => {
        if (error) {
          return res.status(500).json(formatResponse(error, null, false));
        }
        res.json(formatResponse("Impact area information", result));
      });
      break;
      
    default:
      res.status(400).json(formatResponse(`Unsupported context type: ${context_type}`, null, false));
  }
});

// Function to get executive order by ID
function getExecutiveOrderById(id, detailLevel, callback) {
  const sqlQuery = `
    SELECT e.*, 
           group_concat(DISTINCT c.name) as categories,
           group_concat(DISTINCT ia.name) as impact_areas,
           group_concat(DISTINCT uia.name) as university_impact_areas
    FROM executive_orders e
    LEFT JOIN order_categories oc ON e.id = oc.order_id
    LEFT JOIN categories c ON oc.category_id = c.id
    LEFT JOIN order_impact_areas oia ON e.id = oia.order_id
    LEFT JOIN impact_areas ia ON oia.impact_area_id = ia.id
    LEFT JOIN order_university_impact_areas ouia ON e.id = ouia.order_id
    LEFT JOIN university_impact_areas uia ON ouia.university_impact_area_id = uia.id
    WHERE e.id = ? OR e.order_number = ?
    GROUP BY e.id
  `;
  
  db.get(sqlQuery, [id, id], (err, row) => {
    if (err) {
      console.error('Error fetching executive order:', err);
      return callback("Error fetching executive order", null);
    }
    
    if (!row) {
      return callback("Executive order not found", null);
    }
    
    // Process the result based on detail level
    let result = {
      id: row.id,
      order_number: row.order_number,
      title: row.title,
      signing_date: row.signing_date,
      president: row.president,
      impact_level: row.impact_level,
      categories: row.categories ? row.categories.split(',') : [],
      impact_areas: row.impact_areas ? row.impact_areas.split(',') : [],
      university_impact_areas: row.university_impact_areas ? row.university_impact_areas.split(',') : []
    };
    
    if (detailLevel === "basic") {
      // Basic level has only the fields above
      return callback(null, result);
    }
    
    // Standard level includes summary and Yale-specific impacts
    result.summary = row.summary;
    result.yale_alert_level = row.yale_alert_level;
    result.core_impact = row.core_impact;
    result.yale_imperative = row.yale_imperative;
    
    if (detailLevel === "standard") {
      return callback(null, result);
    }
    
    // Comprehensive level includes everything
    result.full_text = row.full_text;
    result.url = row.url;
    result.status = row.status;
    result.implementation_phase = row.implementation_phase;
    result.effective_date = row.effective_date;
    result.confidence_rating = row.confidence_rating;
    result.what_changed = row.what_changed;
    
    // Include HTML summaries if available
    if (row.plain_language_summary) {
      result.plain_language_summary = row.plain_language_summary;
    }
    
    if (row.executive_brief) {
      result.executive_brief = row.executive_brief;
    }
    
    if (row.comprehensive_analysis) {
      result.comprehensive_analysis = row.comprehensive_analysis;
    }
    
    callback(null, result);
  });
}

// Function to get category information
function getCategoryInfo(categoryName, callback) {
  const sqlQuery = `
    SELECT c.*, COUNT(DISTINCT oc.order_id) as order_count
    FROM categories c
    LEFT JOIN order_categories oc ON c.id = oc.category_id
    WHERE c.name = ? OR c.id = ?
    GROUP BY c.id
  `;
  
  db.get(sqlQuery, [categoryName, categoryName], (err, row) => {
    if (err) {
      console.error('Error fetching category:', err);
      return callback("Error fetching category", null);
    }
    
    if (!row) {
      return callback("Category not found", null);
    }
    
    // Get orders in this category
    const ordersQuery = `
      SELECT e.id, e.order_number, e.title, e.signing_date, e.president, e.impact_level
      FROM executive_orders e
      JOIN order_categories oc ON e.id = oc.order_id
      JOIN categories c ON oc.category_id = c.id
      WHERE c.id = ?
      ORDER BY e.signing_date DESC
      LIMIT 10
    `;
    
    db.all(ordersQuery, [row.id], (err, orders) => {
      if (err) {
        console.error('Error fetching category orders:', err);
        return callback("Error fetching category orders", null);
      }
      
      const result = {
        id: row.id,
        name: row.name,
        description: row.description,
        order_count: row.order_count,
        recent_orders: orders
      };
      
      callback(null, result);
    });
  });
}

// Function to get impact area information
function getImpactAreaInfo(impactAreaName, callback) {
  const sqlQuery = `
    SELECT ia.*, COUNT(DISTINCT oia.order_id) as order_count
    FROM impact_areas ia
    LEFT JOIN order_impact_areas oia ON ia.id = oia.impact_area_id
    WHERE ia.name = ? OR ia.id = ?
    GROUP BY ia.id
  `;
  
  db.get(sqlQuery, [impactAreaName, impactAreaName], (err, row) => {
    if (err) {
      console.error('Error fetching impact area:', err);
      return callback("Error fetching impact area", null);
    }
    
    if (!row) {
      return callback("Impact area not found", null);
    }
    
    // Get orders in this impact area
    const ordersQuery = `
      SELECT e.id, e.order_number, e.title, e.signing_date, e.president, e.impact_level
      FROM executive_orders e
      JOIN order_impact_areas oia ON e.id = oia.order_id
      JOIN impact_areas ia ON oia.impact_area_id = ia.id
      WHERE ia.id = ?
      ORDER BY e.signing_date DESC
      LIMIT 10
    `;
    
    db.all(ordersQuery, [row.id], (err, orders) => {
      if (err) {
        console.error('Error fetching impact area orders:', err);
        return callback("Error fetching impact area orders", null);
      }
      
      const result = {
        id: row.id,
        name: row.name,
        description: row.description,
        order_count: row.order_count,
        recent_orders: orders
      };
      
      callback(null, result);
    });
  });
}

// Document Analysis Endpoints for External Clients

// Extract key terms from document text
app.post('/mcp/extract-terms', (req, res) => {
  const { document_text } = req.body;
  
  if (!document_text) {
    return res.status(400).json(formatResponse("Missing document_text parameter", null, false));
  }
  
  // Simple term extraction algorithm
  const extractKeyTerms = (text) => {
    // Common stop words to filter out
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
      'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
      'this', 'that', 'these', 'those', 'its', 'it', 'as', 'shall', 'may', 'would', 'could', 'which'
    ]);
    
    // Extract words and clean them
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with spaces
      .split(/\s+/)              // Split on whitespace
      .filter(word => word.length > 2 && !stopWords.has(word)); // Filter out stop words and short words
    
    // Count word frequencies
    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // Also extract multi-word phrases (bigrams and trigrams)
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      if (!stopWords.has(words[i]) && !stopWords.has(words[i+1])) {
        phrases.push(`${words[i]} ${words[i+1]}`);
      }
      
      if (i < words.length - 2 && !stopWords.has(words[i]) && !stopWords.has(words[i+2])) {
        phrases.push(`${words[i]} ${words[i+1]} ${words[i+2]}`);
      }
    }
    
    // Count phrase frequencies
    const phraseCount = {};
    phrases.forEach(phrase => {
      phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
    });
    
    // Combine words and phrases, sort by frequency
    const terms = [];
    
    // Add single words
    Object.entries(wordCount)
      .filter(([word, count]) => count > 1) // Only include words that appear more than once
      .forEach(([word, count]) => {
        terms.push({ term: word, score: count, type: 'word' });
      });
    
    // Add phrases that appear more than once
    Object.entries(phraseCount)
      .filter(([phrase, count]) => count > 1)
      .forEach(([phrase, count]) => {
        terms.push({ term: phrase, score: count * 1.5, type: 'phrase' }); // Boost phrases
      });
    
    // Sort by score (frequency) and take top results
    return terms
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map(item => item.term);
  };
  
  try {
    const terms = extractKeyTerms(document_text);
    
    res.json(formatResponse("Extracted terms from document", {
      total: terms.length,
      terms: terms
    }));
  } catch (error) {
    console.error('Error extracting terms:', error);
    res.status(500).json(formatResponse("Error processing document", null, false));
  }
});

// Enhanced search endpoint with relevance scoring
app.post('/mcp/search', (req, res) => {
  const { query, filters = {}, limit = 10, offset = 0, terms = [] } = req.body;
  
  let sqlQuery = `
    SELECT e.*, 
           group_concat(DISTINCT c.name) as categories,
           group_concat(DISTINCT ia.name) as impact_areas,
           group_concat(DISTINCT uia.name) as university_impact_areas
    FROM executive_orders e
    LEFT JOIN order_categories oc ON e.id = oc.order_id
    LEFT JOIN categories c ON oc.category_id = c.id
    LEFT JOIN order_impact_areas oia ON e.id = oia.order_id
    LEFT JOIN impact_areas ia ON oia.impact_area_id = ia.id
    LEFT JOIN order_university_impact_areas ouia ON e.id = ouia.order_id
    LEFT JOIN university_impact_areas uia ON ouia.university_impact_area_id = uia.id
  `;
  
  const whereConditions = [];
  const params = [];
  
  // Add full-text search if query is provided
  if (query && query.trim() !== '') {
    whereConditions.push(`(
      executive_orders_fts MATCH ?
      OR e.title LIKE ?
      OR e.summary LIKE ?
      OR e.full_text LIKE ?
    )`);
    params.push(query, `%${query}%`, `%${query}%`, `%${query}%`);
  }
  
  // Add search for multiple terms if provided
  if (terms && terms.length > 0) {
    const termConditions = terms.map(term => {
      params.push(`%${term}%`, `%${term}%`, `%${term}%`);
      return `(e.title LIKE ? OR e.summary LIKE ? OR e.full_text LIKE ?)`;
    });
    
    whereConditions.push(`(${termConditions.join(' OR ')})`);
  }
  
  // Add filters for specific fields
  if (filters.president) {
    whereConditions.push('e.president = ?');
    params.push(filters.president);
  }
  
  if (filters.impact_level) {
    whereConditions.push('e.impact_level = ?');
    params.push(filters.impact_level);
  }
  
  if (filters.signing_date_from) {
    whereConditions.push('e.signing_date >= ?');
    params.push(filters.signing_date_from);
  }
  
  if (filters.signing_date_to) {
    whereConditions.push('e.signing_date <= ?');
    params.push(filters.signing_date_to);
  }
  
  if (filters.category) {
    whereConditions.push('c.name = ?');
    params.push(filters.category);
  }
  
  if (filters.impact_area) {
    whereConditions.push('ia.name = ?');
    params.push(filters.impact_area);
  }
  
  if (filters.university_impact_area) {
    whereConditions.push('uia.name = ?');
    params.push(filters.university_impact_area);
  }
  
  // Add WHERE clause if there are conditions
  if (whereConditions.length > 0) {
    sqlQuery += ' WHERE ' + whereConditions.join(' AND ');
  }
  
  // Add GROUP BY, ORDER BY, LIMIT and OFFSET
  sqlQuery += `
    GROUP BY e.id
    ORDER BY e.signing_date DESC
    LIMIT ? OFFSET ?
  `;
  
  params.push(limit, offset);
  
  // Execute the query
  db.all(sqlQuery, params, (err, rows) => {
    if (err) {
      console.error('Error executing search query:', err);
      return res.status(500).json(formatResponse("Error executing search", null, false));
    }
    
    // Process the results and calculate relevance scores
    const results = rows.map(row => {
      // Calculate relevance score based on multiple factors
      let relevanceScore = 1.0; // Base score
      
      // Boost score based on impact level
      if (row.impact_level === 'Critical') relevanceScore *= 2.0;
      else if (row.impact_level === 'High') relevanceScore *= 1.5;
      else if (row.impact_level === 'Medium') relevanceScore *= 1.2;
      
      // Boost score based on recency (newer orders get higher scores)
      const orderDate = new Date(row.signing_date);
      const currentDate = new Date();
      const yearsDiff = (currentDate - orderDate) / (1000 * 60 * 60 * 24 * 365);
      const recencyBoost = Math.max(0.5, 1.0 - (yearsDiff * 0.1)); // Decrease score by 10% per year, minimum 0.5
      relevanceScore *= recencyBoost;
      
      // Boost score based on Yale-specific metrics if available
      if (row.yale_alert_level === 'High') relevanceScore *= 1.3;
      if (row.core_impact && row.core_impact.length > 100) relevanceScore *= 1.2;
      
      // If terms were provided, boost score based on term matches
      if (terms && terms.length > 0) {
        const text = `${row.title} ${row.summary} ${row.full_text || ''}`.toLowerCase();
        
        const matchCount = terms.reduce((count, term) => {
          const regex = new RegExp(term.toLowerCase(), 'g');
          const matches = text.match(regex);
          return count + (matches ? matches.length : 0);
        }, 0);
        
        const termBoost = Math.min(3.0, 1.0 + (matchCount * 0.1)); // Cap at 3x boost
        relevanceScore *= termBoost;
      }
      
      return {
        ...row,
        categories: row.categories ? row.categories.split(',') : [],
        impact_areas: row.impact_areas ? row.impact_areas.split(',') : [],
        university_impact_areas: row.university_impact_areas ? row.university_impact_areas.split(',') : [],
        relevance_score: parseFloat(relevanceScore.toFixed(2))
      };
    });
    
    // Sort by relevance score if terms were provided
    if (terms && terms.length > 0) {
      results.sort((a, b) => b.relevance_score - a.relevance_score);
    }
    
    res.json(formatResponse("Search results", {
      total: results.length,
      limit,
      offset,
      results
    }));
  });
});

// Other API endpoints

// Get list of categories
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name', [], (err, rows) => {
    if (err) {
      console.error('Error fetching categories:', err);
      return res.status(500).json(formatResponse("Error fetching categories", null, false));
    }
    
    res.json(formatResponse("Categories list", rows));
  });
});

// Get list of impact areas
app.get('/api/impact-areas', (req, res) => {
  db.all('SELECT * FROM impact_areas ORDER BY name', [], (err, rows) => {
    if (err) {
      console.error('Error fetching impact areas:', err);
      return res.status(500).json(formatResponse("Error fetching impact areas", null, false));
    }
    
    res.json(formatResponse("Impact areas list", rows));
  });
});

// Get list of university impact areas
app.get('/api/university-impact-areas', (req, res) => {
  db.all('SELECT * FROM university_impact_areas ORDER BY name', [], (err, rows) => {
    if (err) {
      console.error('Error fetching university impact areas:', err);
      return res.status(500).json(formatResponse("Error fetching university impact areas", null, false));
    }
    
    res.json(formatResponse("University impact areas list", rows));
  });
});

// System statistics endpoint
app.get('/api/statistics', (req, res) => {
  // This will fetch various statistics about the executive orders in the database
  const queries = {
    totalOrders: 'SELECT COUNT(*) as count FROM executive_orders',
    ordersByImpactLevel: 'SELECT impact_level, COUNT(*) as count FROM executive_orders GROUP BY impact_level',
    ordersByPresident: 'SELECT president, COUNT(*) as count FROM executive_orders GROUP BY president ORDER BY count DESC',
    ordersByYear: 'SELECT strftime("%Y", signing_date) as year, COUNT(*) as count FROM executive_orders GROUP BY year ORDER BY year',
    topCategories: `
      SELECT c.name, COUNT(oc.order_id) as count 
      FROM categories c
      JOIN order_categories oc ON c.id = oc.category_id
      GROUP BY c.name
      ORDER BY count DESC
      LIMIT 10
    `,
    topImpactAreas: `
      SELECT ia.name, COUNT(oia.order_id) as count 
      FROM impact_areas ia
      JOIN order_impact_areas oia ON ia.id = oia.impact_area_id
      GROUP BY ia.name
      ORDER BY count DESC
      LIMIT 10
    `,
    topUniversityImpactAreas: `
      SELECT uia.name, COUNT(ouia.order_id) as count 
      FROM university_impact_areas uia
      JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
      GROUP BY uia.name
      ORDER BY count DESC
      LIMIT 10
    `
  };
  
  const statistics = {};
  let queriesCompleted = 0;
  const totalQueries = Object.keys(queries).length;
  
  // Execute each query and gather results
  for (const [key, query] of Object.entries(queries)) {
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error(`Error executing ${key} query:`, err);
        statistics[key] = { error: err.message };
      } else {
        if (key === 'totalOrders' && rows.length > 0) {
          statistics[key] = rows[0].count;
        } else {
          statistics[key] = rows;
        }
      }
      
      queriesCompleted++;
      if (queriesCompleted === totalQueries) {
        res.json(formatResponse("System statistics", statistics));
      }
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
});

// Clean up on exit
process.on('exit', () => {
  db.close();
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});