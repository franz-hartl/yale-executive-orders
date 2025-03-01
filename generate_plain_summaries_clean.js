/**
 * generate_plain_summaries_clean.js
 * 
 * Clean version of the summary generator that uses the new database API.
 * Generates plain language summaries for executive orders in the database.
 */

const path = require('path');
const axios = require('axios');
const Database = require('./utils/database');
require('dotenv').config();

// Initialize database
const db = new Database();

// Check if all summary columns exist, add if not
async function setupDatabase() {
  try {
    await db.connect();
    
    // Check if the plain_language_summary column exists
    const tableInfo = await db.all("PRAGMA table_info(executive_orders)");
    const columns = tableInfo.map(column => column.name);
    
    if (!columns.includes('plain_language_summary')) {
      console.log('Adding plain_language_summary column to executive_orders table...');
      await db.run('ALTER TABLE executive_orders ADD COLUMN plain_language_summary TEXT');
    }
    
    if (!columns.includes('executive_brief')) {
      console.log('Adding executive_brief column to executive_orders table...');
      await db.run('ALTER TABLE executive_orders ADD COLUMN executive_brief TEXT');
    }
    
    if (!columns.includes('comprehensive_analysis')) {
      console.log('Adding comprehensive_analysis column to executive_orders table...');
      await db.run('ALTER TABLE executive_orders ADD COLUMN comprehensive_analysis TEXT');
    }
    
    console.log('Database setup completed.');
  } catch (err) {
    console.error('Error setting up database:', err);
    throw err;
  }
}

// Generate a plain language summary
async function generatePlainSummary(order) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found in environment. Please set OPENAI_API_KEY.');
    }
    
    console.log(`Generating plain summary for order ${order.order_number}: ${order.title}`);
    
    // Prepare the API request
    const prompt = `You are a helpful AI assistant to a higher education professional. 
Your task is to create a plain language summary of the following executive order, 
focusing on how it affects higher education institutions, especially Yale University.

Executive Order: ${order.order_number}
Title: ${order.title}
Date: ${order.signing_date}
President: ${order.president}

Summary: ${order.summary}

Please provide:
1. A brief plain language explanation of what this executive order does (2-3 sentences)
2. The potential impacts on higher education institutions, focusing on research universities like Yale
3. Any action items that university administrators should consider
4. Format the output as HTML, with appropriate headers and paragraphs

Keep your language straightforward and avoid jargon. Don't mention that you're an AI.`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (err) {
    console.error(`Error generating summary for order ${order.order_number}:`, err);
    throw err;
  }
}

// Main function to generate summaries for all orders
async function generateAllSummaries() {
  try {
    await setupDatabase();
    
    // Get orders without plain language summaries
    const orders = await db.all(`
      SELECT id, order_number, title, signing_date, president, summary, url, impact_level 
      FROM executive_orders 
      WHERE plain_language_summary IS NULL OR plain_language_summary = ''
      ORDER BY signing_date DESC
    `);
    
    console.log(`Found ${orders.length} orders without plain language summaries.`);
    
    for (const order of orders) {
      try {
        // Generate summary
        const summary = await generatePlainSummary(order);
        
        // Update the database
        await db.run(
          'UPDATE executive_orders SET plain_language_summary = ? WHERE id = ?',
          [summary, order.id]
        );
        
        console.log(`Updated order ${order.order_number} with plain language summary.`);
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        console.error(`Error processing order ${order.order_number}:`, err);
      }
    }
    
    console.log('All summaries generated successfully!');
  } catch (err) {
    console.error('Error generating summaries:', err);
  } finally {
    await db.close();
  }
}

// Run the generator
if (require.main === module) {
  generateAllSummaries().catch(err => {
    console.error('Summary generation failed:', err);
    process.exit(1);
  });
}

module.exports = { generateAllSummaries };