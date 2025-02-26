const { Client } = require('pg');
const fs = require('fs').promises;

class DatabaseSetup {
  constructor() {
    // PostgreSQL configuration
    this.pgConfig = {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || 'executive_orders',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres'
    };
  }

  async initPostgres() {
    console.log('Initializing PostgreSQL database...');
    const client = new Client(this.pgConfig);
    
    try {
      await client.connect();
      
      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS executive_orders (
          id SERIAL PRIMARY KEY,
          order_number VARCHAR(20) UNIQUE,
          title TEXT NOT NULL,
          signing_date DATE,
          publication_date DATE,
          president VARCHAR(100),
          summary TEXT,
          financial_impact TEXT,
          full_text TEXT,
          url TEXT,
          content_for_mcp TEXT, -- Store processed text for MCP context
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_categories (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES executive_orders(id) ON DELETE CASCADE,
          primary_category VARCHAR(100),
          UNIQUE(order_id)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_secondary_categories (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES executive_orders(id) ON DELETE CASCADE,
          category VARCHAR(100) NOT NULL,
          UNIQUE(order_id, category)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_economic_sectors (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES executive_orders(id) ON DELETE CASCADE,
          sector VARCHAR(100) NOT NULL,
          UNIQUE(order_id, sector)
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_policy_tags (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES executive_orders(id) ON DELETE CASCADE,
          tag VARCHAR(100) NOT NULL,
          UNIQUE(order_id, tag)
        );
      `);
      
      // Create indexes for common query patterns
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_executive_orders_president ON executive_orders(president);
        CREATE INDEX IF NOT EXISTS idx_executive_orders_signing_date ON executive_orders(signing_date);
        CREATE INDEX IF NOT EXISTS idx_order_categories_primary_category ON order_categories(primary_category);
      `);
      
      // Create a function to update the updated_at timestamp
      await client.query(`
        CREATE OR REPLACE FUNCTION update_modified_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // Create a trigger to update the updated_at timestamp
      await client.query(`
        DROP TRIGGER IF EXISTS update_executive_orders_modtime ON executive_orders;
        CREATE TRIGGER update_executive_orders_modtime
        BEFORE UPDATE ON executive_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
      `);
      
      // Create a full-text search index
      await client.query(`
        ALTER TABLE executive_orders
        ADD COLUMN IF NOT EXISTS search_vector tsvector;
        
        CREATE INDEX IF NOT EXISTS idx_executive_orders_search
        ON executive_orders
        USING GIN(search_vector);
        
        CREATE OR REPLACE FUNCTION executive_orders_search_trigger()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.search_vector = 
            setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(NEW.financial_impact, '')), 'C') ||
            setweight(to_tsvector('english', COALESCE(NEW.president, '')), 'D');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS executive_orders_search_update ON executive_orders;
        CREATE TRIGGER executive_orders_search_update
        BEFORE INSERT OR UPDATE ON executive_orders
        FOR EACH ROW
        EXECUTE FUNCTION executive_orders_search_trigger();
      `);
      
      console.log('PostgreSQL schema initialized successfully');
    } catch (error) {
      console.error('Error initializing PostgreSQL schema:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async prepareContentForMCP(order) {
    // Format all the order data in a consistent way that works well for LLM context
    const fields = [
      `EXECUTIVE ORDER ${order.number || '[No Number]'}`,
      `TITLE: ${order.title || '[No Title]'}`,
      `DATE: ${order.date || '[No Date]'}`,
      `PRESIDENT: ${order.president || '[Unknown]'}`,
      `SUMMARY: ${order.summary || '[No Summary]'}`,
      `FINANCIAL IMPACT: ${order.financialImpact || '[No Financial Impact Information]'}`
    ];
    
    // Add categories if available
    if (order.primaryCategory) {
      fields.push(`PRIMARY CATEGORY: ${order.primaryCategory}`);
    }
    
    if (order.secondaryCategories && Array.isArray(order.secondaryCategories) && order.secondaryCategories.length > 0) {
      fields.push(`SECONDARY CATEGORIES: ${order.secondaryCategories.join(', ')}`);
    }
    
    if (order.economicSectors && Array.isArray(order.economicSectors) && order.economicSectors.length > 0) {
      fields.push(`ECONOMIC SECTORS: ${order.economicSectors.join(', ')}`);
    }
    
    if (order.policyTags && Array.isArray(order.policyTags) && order.policyTags.length > 0) {
      fields.push(`POLICY TAGS: ${order.policyTags.join(', ')}`);
    }
    
    // Add full text if available (truncated to avoid extremely large content)
    if (order.fullText) {
      const truncatedText = order.fullText.length > 5000 
        ? order.fullText.substring(0, 5000) + '... [truncated]' 
        : order.fullText;
      fields.push(`FULL TEXT:\n${truncatedText}`);
    }
    
    return fields.join('\n\n');
  }

  async importDataToPostgres(filePath = './processed_financial_eo_readable.json') {
    console.log(`Importing data from ${filePath} to PostgreSQL...`);
    const client = new Client(this.pgConfig);
    
    try {
      await client.connect();
      
      // Read processed data
      const rawData = await fs.readFile(filePath, 'utf8');
      const orders = JSON.parse(rawData);
      
      console.log(`Importing ${orders.length} records to PostgreSQL...`);
      
      // Begin transaction
      await client.query('BEGIN');
      
      for (const order of orders) {
        // Prepare content for MCP
        const contentForMCP = await this.prepareContentForMCP(order);
        
        // Insert executive order
        const orderInsertResult = await client.query(`
          INSERT INTO executive_orders
          (order_number, title, signing_date, publication_date, president, summary, 
           financial_impact, url, content_for_mcp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (order_number) 
          DO UPDATE SET 
            title = EXCLUDED.title,
            signing_date = EXCLUDED.signing_date,
            publication_date = EXCLUDED.publication_date,
            president = EXCLUDED.president,
            summary = EXCLUDED.summary,
            financial_impact = EXCLUDED.financial_impact,
            url = EXCLUDED.url,
            content_for_mcp = EXCLUDED.content_for_mcp,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `, [
          order.number,
          order.title,
          order.date,
          order.publication_date || order.date,
          order.president,
          order.summary,
          order.financialImpact,
          order.url,
          contentForMCP
        ]);
        
        const orderId = orderInsertResult.rows[0].id;
        
        // Insert primary category
        if (order.primaryCategory) {
          await client.query(`
            INSERT INTO order_categories (order_id, primary_category)
            VALUES ($1, $2)
            ON CONFLICT (order_id) 
            DO UPDATE SET primary_category = EXCLUDED.primary_category
          `, [orderId, order.primaryCategory]);
        }
        
        // Insert secondary categories
        if (order.secondaryCategories && Array.isArray(order.secondaryCategories)) {
          // First delete existing categories
          await client.query(`
            DELETE FROM order_secondary_categories WHERE order_id = $1
          `, [orderId]);
          
          // Then insert new ones
          for (const category of order.secondaryCategories) {
            await client.query(`
              INSERT INTO order_secondary_categories (order_id, category)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [orderId, category]);
          }
        }
        
        // Insert economic sectors
        if (order.economicSectors && Array.isArray(order.economicSectors)) {
          // First delete existing sectors
          await client.query(`
            DELETE FROM order_economic_sectors WHERE order_id = $1
          `, [orderId]);
          
          // Then insert new ones
          for (const sector of order.economicSectors) {
            await client.query(`
              INSERT INTO order_economic_sectors (order_id, sector)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [orderId, sector]);
          }
        }
        
        // Insert policy tags
        if (order.policyTags && Array.isArray(order.policyTags)) {
          // First delete existing tags
          await client.query(`
            DELETE FROM order_policy_tags WHERE order_id = $1
          `, [orderId]);
          
          // Then insert new ones
          for (const tag of order.policyTags) {
            await client.query(`
              INSERT INTO order_policy_tags (order_id, tag)
              VALUES ($1, $2)
              ON CONFLICT DO NOTHING
            `, [orderId, tag]);
          }
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      console.log('Data import to PostgreSQL completed successfully');
      
      // Create MCP content file
      await this.createMCPContextFile(client);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error importing data to PostgreSQL:', error);
      throw error;
    } finally {
      await client.end();
    }
  }
  
  async createMCPContextFile(client) {
    console.log('Creating MCP context file...');
    
    try {
      // Get all executive orders with their MCP content
      const result = await client.query(`
        SELECT order_number, content_for_mcp 
        FROM executive_orders 
        ORDER BY signing_date DESC
      `);
      
      // Prepare content for MCP context file
      let contextContent = '# Financial Executive Orders Database\n\n';
      contextContent += 'This file contains information about executive orders related to finance and economics.\n\n';
      
      for (const row of result.rows) {
        contextContent += '---\n\n';
        contextContent += row.content_for_mcp;
        contextContent += '\n\n';
      }
      
      // Write to file
      await fs.writeFile('./financial_eo_mcp_context.md', contextContent);
      console.log('MCP context file created successfully');
      
    } catch (error) {
      console.error('Error creating MCP context file:', error);
      throw error;
    }
  }

  async setup() {
    try {
      console.log('Starting database setup...');
      
      // Initialize database schema
      await this.initPostgres();
      
      // Import data
      await this.importDataToPostgres();
      
      console.log('Database setup completed successfully');
    } catch (error) {
      console.error('Error during database setup:', error);
      process.exit(1);
    }
  }
}

// Run setup
const setup = new DatabaseSetup();
setup.setup();
