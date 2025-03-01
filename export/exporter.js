/**
 * exporter.js
 * 
 * This module exports data from the database to JSON files.
 * It uses the formatters to ensure consistent output formats.
 */

const fs = require('fs').promises;
const path = require('path');
const Database = require('../utils/database');
const formatters = require('./formatters');

class Exporter {
  /**
   * Constructor for Exporter
   * @param {Object} options - Configuration options
   * @param {string} options.outputDir - Output directory for JSON files
   * @param {string} options.institutionId - Institution identifier (e.g., 'yale')
   */
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(__dirname, '..', 'public', 'data');
    this.institutionId = options.institutionId || '';
    this.db = new Database();
  }
  
  /**
   * Initialize the exporter
   */
  async initialize() {
    try {
      // Connect to database
      await this.db.connect();
      
      // Ensure output directory exists
      await this.ensureOutputDir();
      
      return true;
    } catch (err) {
      console.error('Error initializing exporter:', err);
      return false;
    }
  }
  
  /**
   * Ensure output directory exists
   */
  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      console.log(`Created output directory: ${this.outputDir}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating output directory:', err);
        throw err;
      }
    }
  }
  
  /**
   * Export all data to JSON files
   */
  async exportAll() {
    try {
      await this.initialize();
      
      // Export reference data
      const categories = await this.exportCategories();
      const impactAreas = await this.exportImpactAreas();
      const universityImpactAreas = await this.exportUniversityImpactAreas();
      
      // Export metadata
      await this.exportMetadata(categories, impactAreas, universityImpactAreas);
      
      // Export main data
      await this.exportExecutiveOrders();
      await this.exportStatistics();
      await this.exportSystemInfo();
      
      // Export institution-specific data if applicable
      if (this.institutionId) {
        await this.exportInstitutionSpecificData(this.institutionId);
      }
      
      console.log('All data successfully exported to JSON files.');
      
      return true;
    } catch (err) {
      console.error('Error exporting data:', err);
      return false;
    } finally {
      await this.close();
    }
  }
  
  /**
   * Export categories to JSON file
   */
  async exportCategories() {
    try {
      const categories = await this.db.all('SELECT * FROM categories ORDER BY name');
      const outputPath = path.join(this.outputDir, 'categories.json');
      await fs.writeFile(outputPath, JSON.stringify(categories, null, 2));
      console.log(`Exported ${categories.length} categories to ${outputPath}`);
      return categories;
    } catch (err) {
      console.error('Error exporting categories:', err);
      throw err;
    }
  }
  
  /**
   * Export impact areas to JSON file
   */
  async exportImpactAreas() {
    try {
      const impactAreas = await this.db.all('SELECT * FROM impact_areas ORDER BY name');
      const outputPath = path.join(this.outputDir, 'impact_areas.json');
      await fs.writeFile(outputPath, JSON.stringify(impactAreas, null, 2));
      console.log(`Exported ${impactAreas.length} impact areas to ${outputPath}`);
      return impactAreas;
    } catch (err) {
      console.error('Error exporting impact areas:', err);
      throw err;
    }
  }
  
  /**
   * Export university impact areas to JSON file
   */
  async exportUniversityImpactAreas() {
    try {
      const universityImpactAreas = await this.db.all('SELECT * FROM university_impact_areas ORDER BY name');
      const outputPath = path.join(this.outputDir, 'university_impact_areas.json');
      await fs.writeFile(outputPath, JSON.stringify(universityImpactAreas, null, 2));
      console.log(`Exported ${universityImpactAreas.length} university impact areas to ${outputPath}`);
      return universityImpactAreas;
    } catch (err) {
      console.error('Error exporting university impact areas:', err);
      throw err;
    }
  }
  
  /**
   * Export executive orders to JSON files
   */
  async exportExecutiveOrders() {
    try {
      // Get all executive orders
      const orders = await this.db.all(`
        SELECT * FROM executive_orders ORDER BY signing_date DESC
      `);
      
      // Process each order
      const processedOrders = await Promise.all(orders.map(async (order) => {
        // Get full order with relations
        const fullOrder = await this.db.getOrderWithRelations(order.id);
        
        // Format the order according to core schema
        const formattedOrder = formatters.formatExecutiveOrder(fullOrder);
        
        // Add institution-specific extensions if applicable
        if (this.institutionId) {
          formattedOrder.extensions = formatters.createInstitutionExtensions(fullOrder, this.institutionId);
        }
        
        return formattedOrder;
      }));
      
      // Write complete orders to file
      const outputPath = path.join(this.outputDir, 'executive_orders.json');
      await fs.writeFile(outputPath, JSON.stringify(processedOrders, null, 2));
      console.log(`Exported ${processedOrders.length} executive orders to ${outputPath}`);
      
      // Write processed orders file with minimized duplication
      const processedOutputPath = path.join(this.outputDir, 'processed_executive_orders.json');
      const minimalOrders = processedOrders.map(order => {
        const { plain_language_summary, executive_brief, comprehensive_analysis, ...minimalOrder } = order;
        return minimalOrder;
      });
      await fs.writeFile(processedOutputPath, JSON.stringify(minimalOrders, null, 2));
      console.log(`Exported ${minimalOrders.length} processed orders to ${processedOutputPath}`);
      
      // Export individual order files
      const individualDir = path.join(this.outputDir, 'orders');
      await fs.mkdir(individualDir, { recursive: true });
      
      for (const order of processedOrders) {
        const orderPath = path.join(individualDir, `${order.id}.json`);
        await fs.writeFile(orderPath, JSON.stringify(order, null, 2));
      }
      console.log(`Exported ${processedOrders.length} individual order files to ${individualDir}`);
      
      // Export summary HTML files
      await this.exportSummaryFiles(orders);
      
      return processedOrders;
    } catch (err) {
      console.error('Error exporting executive orders:', err);
      throw err;
    }
  }
  
  /**
   * Export summary HTML files
   * @param {Array} orders - Array of executive orders
   */
  async exportSummaryFiles(orders) {
    try {
      // Create directories for summary files
      const summariesDir = path.join(this.outputDir, 'summaries');
      const executiveBriefsDir = path.join(this.outputDir, 'executive_briefs');
      const comprehensiveAnalysesDir = path.join(this.outputDir, 'comprehensive_analyses');
      
      await fs.mkdir(summariesDir, { recursive: true });
      await fs.mkdir(executiveBriefsDir, { recursive: true });
      await fs.mkdir(comprehensiveAnalysesDir, { recursive: true });
      
      // Export summary files for each order
      for (const order of orders) {
        const fullOrder = await this.db.getOrder(order.id);
        
        // Export plain language summary
        if (fullOrder.plain_language_summary) {
          const summaryPath = path.join(summariesDir, `${order.id}.html`);
          await fs.writeFile(summaryPath, fullOrder.plain_language_summary);
        }
        
        // Export executive brief
        if (fullOrder.executive_brief) {
          const briefPath = path.join(executiveBriefsDir, `${order.id}.html`);
          await fs.writeFile(briefPath, fullOrder.executive_brief);
        }
        
        // Export comprehensive analysis
        if (fullOrder.comprehensive_analysis) {
          const analysisPath = path.join(comprehensiveAnalysesDir, `${order.id}.html`);
          await fs.writeFile(analysisPath, fullOrder.comprehensive_analysis);
        }
      }
      
      console.log(`Exported summary files to ${summariesDir}, ${executiveBriefsDir}, and ${comprehensiveAnalysesDir}`);
    } catch (err) {
      console.error('Error exporting summary files:', err);
      throw err;
    }
  }
  
  /**
   * Export statistics to JSON file
   */
  async exportStatistics() {
    try {
      // Get impact level statistics
      const impactLevels = await this.db.all(`
        SELECT impact_level, COUNT(*) as count
        FROM executive_orders
        GROUP BY impact_level
        ORDER BY 
          CASE 
            WHEN impact_level = 'Critical' THEN 1
            WHEN impact_level = 'High' THEN 2
            WHEN impact_level = 'Medium' THEN 3
            WHEN impact_level = 'Low' THEN 4
            ELSE 5
          END
      `);
      
      // Get university impact area statistics
      const universityImpactAreas = await this.db.all(`
        SELECT uia.name, COUNT(*) as count
        FROM university_impact_areas uia
        JOIN order_university_impact_areas ouia ON uia.id = ouia.university_impact_area_id
        GROUP BY uia.name
        ORDER BY count DESC
      `);
      
      // Get category statistics
      const categories = await this.db.all(`
        SELECT c.name, COUNT(*) as count
        FROM categories c
        JOIN order_categories oc ON c.id = oc.category_id
        GROUP BY c.name
        ORDER BY count DESC
      `);
      
      // Get timeline statistics
      const timeline = await this.db.all(`
        SELECT 
          strftime('%Y-%m', signing_date) as month,
          COUNT(*) as count
        FROM executive_orders
        WHERE signing_date IS NOT NULL
        GROUP BY month
        ORDER BY month
      `);
      
      // Format statistics according to schema
      const statistics = formatters.formatStatistics({
        impactLevels,
        universityImpactAreas,
        categories,
        timeline
      });
      
      // Write statistics to file
      const outputPath = path.join(this.outputDir, 'statistics.json');
      await fs.writeFile(outputPath, JSON.stringify(statistics, null, 2));
      console.log(`Exported statistics to ${outputPath}`);
      
      return statistics;
    } catch (err) {
      console.error('Error exporting statistics:', err);
      throw err;
    }
  }
  
  /**
   * Export system info to JSON file
   */
  async exportSystemInfo() {
    try {
      const orderCount = (await this.db.get('SELECT COUNT(*) as count FROM executive_orders')).count;
      
      // Create raw system info
      const rawInfo = {
        topicName: 'Executive Order Analysis',
        topicDescription: 'Analysis of executive orders and their impact',
        orderCount,
        version: '3.0.0',
        lastUpdated: new Date().toISOString(),
        isStaticVersion: true
      };
      
      // Customize for institution if applicable
      if (this.institutionId === 'yale') {
        rawInfo.topicName = 'Yale University Executive Order Analysis';
        rawInfo.topicDescription = 'Analysis of executive orders and their impact on Yale University';
        rawInfo.primaryFocus = 'Yale University';
      }
      
      // Format system info according to schema
      const systemInfo = formatters.formatSystemInfo(rawInfo);
      
      // Add institution-specific data if applicable
      if (this.institutionId) {
        try {
          // Get institution-specific data
          if (this.institutionId === 'yale') {
            const departments = await this.db.all('SELECT * FROM yale_departments ORDER BY name');
            systemInfo.yale_departments = departments;
          }
        } catch (err) {
          console.log(`Institution-specific tables for ${this.institutionId} not found or not available`);
        }
      }
      
      // Write system info to file
      const outputPath = path.join(this.outputDir, 'system_info.json');
      await fs.writeFile(outputPath, JSON.stringify(systemInfo, null, 2));
      console.log(`Exported system info to ${outputPath}`);
      
      return systemInfo;
    } catch (err) {
      console.error('Error exporting system info:', err);
      throw err;
    }
  }
  
  /**
   * Export metadata to JSON file
   * @param {Array} categories - Categories
   * @param {Array} impactAreas - Impact areas
   * @param {Array} universityImpactAreas - University impact areas
   */
  async exportMetadata(categories, impactAreas, universityImpactAreas) {
    try {
      // Initialize metadata
      const metadata = {
        categories,
        impactAreas,
        universityImpactAreas,
        applicationVersion: '3.0.0'
      };
      
      // Add institution-specific metadata if applicable
      if (this.institutionId) {
        try {
          // Get institution-specific data
          if (this.institutionId === 'yale') {
            const yaleImpactAreas = await this.db.all(`
              SELECT y.*, u.name as related_r1_area_name 
              FROM yale_impact_areas y
              LEFT JOIN university_impact_areas u ON y.related_r1_area_id = u.id
              ORDER BY y.id
            `);
            
            const yaleStakeholders = await this.db.all('SELECT * FROM yale_stakeholders ORDER BY name');
            
            metadata.yaleImpactAreas = yaleImpactAreas;
            metadata.yaleStakeholders = yaleStakeholders;
            metadata.primaryFocus = 'Yale University';
            metadata.yaleSpecificFocus = true;
            metadata.yaleFocusVersion = '3.0.0';
          }
        } catch (err) {
          console.log(`Institution-specific tables for ${this.institutionId} not found or not available`);
        }
      }
      
      // Write metadata to file
      const outputPath = path.join(this.outputDir, 'metadata.json');
      await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
      console.log(`Exported metadata to ${outputPath}`);
      
      return metadata;
    } catch (err) {
      console.error('Error exporting metadata:', err);
      throw err;
    }
  }
  
  /**
   * Export institution-specific data to JSON files
   * @param {string} institutionId - Institution identifier (e.g., 'yale')
   */
  async exportInstitutionSpecificData(institutionId) {
    // Only export Yale-specific data for now
    if (institutionId === 'yale') {
      try {
        // Export Yale impact areas
        const yaleImpactAreas = await this.db.all(`
          SELECT y.*, u.name as related_r1_area_name 
          FROM yale_impact_areas y
          LEFT JOIN university_impact_areas u ON y.related_r1_area_id = u.id
          ORDER BY y.id
        `);
        
        if (yaleImpactAreas.length > 0) {
          const outputPath = path.join(this.outputDir, 'yale_impact_areas.json');
          await fs.writeFile(outputPath, JSON.stringify(yaleImpactAreas, null, 2));
          console.log(`Exported ${yaleImpactAreas.length} Yale-specific impact areas to ${outputPath}`);
        }
        
        // Export Yale stakeholders
        const yaleStakeholders = await this.db.all('SELECT * FROM yale_stakeholders ORDER BY name');
        
        if (yaleStakeholders.length > 0) {
          const outputPath = path.join(this.outputDir, 'yale_stakeholders.json');
          await fs.writeFile(outputPath, JSON.stringify(yaleStakeholders, null, 2));
          console.log(`Exported ${yaleStakeholders.length} Yale stakeholders to ${outputPath}`);
        }
      } catch (err) {
        console.log('Yale-specific tables not found or not available:', err.message);
      }
    }
  }
  
  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = Exporter;