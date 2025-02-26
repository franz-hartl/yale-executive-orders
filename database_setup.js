const { Client } = require('pg');
const fs = require('fs').promises;
const { PineconeClient } = require('@pinecone-database/pinecone');

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
    
    // Pinecone configuration for vector embeddings
    this.pineconeApiKey = process.env.PINECONE_API_KEY;
    this.pineconeEnvironment = process.env.PINECONE_ENVIRONMENT || 'us-west1-gcp';
    this.pineconeIndex = process.env.PINECONE_INDEX || 'executive-orders';
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

  async initPinecone() {
    if (!this.pineconeApiKey) {
      console.warn('Pinecone API key not provided, skipping vector database setup');
      return;
    }
    
    console.log('Initializing Pinecone vector database...');
    
    try {
      const pinecone = new PineconeClient();
      await pinecone.init({
        apiKey: this.pineconeApiKey,
        environment: this.pineconeEnvironment
      });
      
      // Check if the index exists
      const indexesList = await pinecone.listIndexes();
      
      if (!indexesList.includes(this.pineconeIndex)) {
        console.log(`Creating new Pinecone index: ${this.pineconeIndex}`);
        
        await pinecone.createIndex({
          name: this.pineconeIndex,
          dimension: 1536, // Dimension for text-embedding-ada-002
          metric: 'cosine'
        });
        
        // Wait for index initialization
        await new Promise(resolve => setTimeout(resolve, 30000));
        console.log('Pinecone index created successfully');
      } else {
        console.log(`Pinecone index ${this.pineconeIndex} already exists`);
      }
    } catch (error) {
      console.error('Error initializing Pinecone:', error);
      throw error;
    }
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
        // Insert executive order
        const orderInsertResult = await client.query(`
          INSERT INTO executive_orders
          (order_number, title, signing_date, publication_date, president, summary, financial_impact, url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (order_number) 
          DO UPDATE SET 
            title = EXCLUDED.title,
            signing_date = EXCLUDED.signing_date,
            publication_date = EXCLUDED.publication_date,
            president = EXCLUDED.president,
            summary = EXCLUDED.summary,
            financial_impact = EXCLUDED.financial_impact,
            url = EXCLUDED.url,
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
          order.url
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
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error importing data to PostgreSQL:', error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async importDataToPinecone(filePath = './processed_financial_eo.json') {
    if (!this.pineconeApiKey) {
      console.warn('Pinecone API key not provided, skipping vector database import');
      return;
    }
    
    console.log(`Importing data from ${filePath} to Pinecone...`);
    
    try {
      // Read processed data with embeddings
      const rawData = await fs.readFile(filePath, 'utf8');
      const orders = JSON.parse(rawData);
      
      console.log(`Importing ${orders.length} records with embeddings to Pinecone...`);
      
      const pinecone = new PineconeClient();
      await pinecone.init({
        apiKey: this.pineconeApiKey,
        environment: this.pineconeEnvironment
      });
      
      const index = pinecone.Index(this.pineconeIndex);
      
      // Prepare vectors for upsert
      const vectors = orders.map(order => {
        if (!order.embedding) {
          console.warn(`Order ${order.number} has no embedding, skipping`);
          return null;
        }
        
        return {
          id: order.number || `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          values: order.embedding,
          metadata: {
            title: order.title,
            number: order.number,
            date: order.date,
            president: order.president,
            summary: order.summary,
            financialImpact: order.financialImpact,
            primaryCategory: order.primaryCategory,
            secondaryCategories: order.secondaryCategories,
            economicSectors: order.economicSectors
          }
        };
      }).filter(Boolean);
      
      // Upsert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        await index.upsert({
          upsertRequest: {
            vectors: batch,
            namespace: ''
          }
        });
        console.log(`Upserted batch ${i/batchSize + 1} of ${Math.ceil(vectors.length/batchSize)}`);
      }
      
      console.log('Data import to Pinecone completed successfully');
    } catch (error) {
      console.error('Error importing data to Pinecone:', error);
      throw error;
    }
  }

  async setup() {
    try {
      console.log('Starting database setup...');
      
      // Initialize database schemas
      await this.initPostgres();
      await this.initPinecone();
      
      // Import data
      await this.importDataToPostgres();
      await this.importDataToPinecone();
      
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
