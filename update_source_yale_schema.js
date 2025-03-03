/**
 * update_source_yale_schema.js
 * 
 * This script updates the database schema to support Yale taxonomy integration
 * for external sources. It adds columns for yale_impact_areas and yale_stakeholders
 * to the source schema.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbFile = path.join(__dirname, 'executive_orders.db');

// Connect to the database
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');
});

// Promisify database operations
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Add Yale taxonomy columns to source_metadata and source_content tables
 */
async function updateSourceSchema() {
  try {
    console.log('Updating source schema to support Yale taxonomy integration...');
    
    // First, check if the source_metadata table exists
    const sourceMetadataExists = await dbGet(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='source_metadata'"
    );
    
    if (!sourceMetadataExists) {
      console.error('source_metadata table does not exist. Please run setup_source_management.js first.');
      return;
    }
    
    // Check if the columns already exist to avoid duplicate columns
    const columns = await dbAll("PRAGMA table_info(source_metadata)");
    const columnNames = columns.map(c => c.name);
    
    // Add yale_impact_areas and yale_stakeholders columns to source_metadata if they don't exist
    if (!columnNames.includes('yale_impact_areas')) {
      console.log('Adding yale_impact_areas column to source_metadata table...');
      await dbRun("ALTER TABLE source_metadata ADD COLUMN yale_impact_areas TEXT");
    } else {
      console.log('yale_impact_areas column already exists in source_metadata table.');
    }
    
    if (!columnNames.includes('yale_stakeholders')) {
      console.log('Adding yale_stakeholders column to source_metadata table...');
      await dbRun("ALTER TABLE source_metadata ADD COLUMN yale_stakeholders TEXT");
    } else {
      console.log('yale_stakeholders column already exists in source_metadata table.');
    }
    
    // Check if the source_content table exists
    const sourceContentExists = await dbGet(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='source_content'"
    );
    
    if (!sourceContentExists) {
      console.error('source_content table does not exist. Please run setup_source_management.js first.');
      return;
    }
    
    // Check if the columns already exist in source_content
    const contentColumns = await dbAll("PRAGMA table_info(source_content)");
    const contentColumnNames = contentColumns.map(c => c.name);
    
    // Add yale_impact_areas and yale_stakeholders columns to source_content if they don't exist
    if (!contentColumnNames.includes('yale_impact_areas')) {
      console.log('Adding yale_impact_areas column to source_content table...');
      await dbRun("ALTER TABLE source_content ADD COLUMN yale_impact_areas TEXT");
    } else {
      console.log('yale_impact_areas column already exists in source_content table.');
    }
    
    if (!contentColumnNames.includes('yale_stakeholders')) {
      console.log('Adding yale_stakeholders column to source_content table...');
      await dbRun("ALTER TABLE source_content ADD COLUMN yale_stakeholders TEXT");
    } else {
      console.log('yale_stakeholders column already exists in source_content table.');
    }
    
    // Add order_sources table mapping if it doesn't exist
    const orderSourcesExists = await dbGet(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='order_sources'"
    );
    
    if (!orderSourcesExists) {
      console.log('Creating order_sources table...');
      await dbRun(`
        CREATE TABLE IF NOT EXISTS order_sources (
          order_id INTEGER,
          source_id TEXT,
          external_reference_id TEXT,
          source_specific_data TEXT,
          fetch_date TEXT,
          yale_impact_areas TEXT,
          yale_stakeholders TEXT,
          PRIMARY KEY (order_id, source_id),
          FOREIGN KEY (order_id) REFERENCES executive_orders(id),
          FOREIGN KEY (source_id) REFERENCES source_metadata(id)
        )
      `);
    } else {
      // If order_sources table exists, check if the Yale taxonomy columns exist
      const osColumns = await dbAll("PRAGMA table_info(order_sources)");
      const osColumnNames = osColumns.map(c => c.name);
      
      if (!osColumnNames.includes('yale_impact_areas')) {
        console.log('Adding yale_impact_areas column to order_sources table...');
        await dbRun("ALTER TABLE order_sources ADD COLUMN yale_impact_areas TEXT");
      } else {
        console.log('yale_impact_areas column already exists in order_sources table.');
      }
      
      if (!osColumnNames.includes('yale_stakeholders')) {
        console.log('Adding yale_stakeholders column to order_sources table...');
        await dbRun("ALTER TABLE order_sources ADD COLUMN yale_stakeholders TEXT");
      } else {
        console.log('yale_stakeholders column already exists in order_sources table.');
      }
    }
    
    // Create indexes for the new columns
    console.log('Creating indexes for Yale taxonomy columns...');
    
    // Create indexes for source_metadata
    await dbRun("CREATE INDEX IF NOT EXISTS idx_source_metadata_yale_impact_areas ON source_metadata(yale_impact_areas)");
    await dbRun("CREATE INDEX IF NOT EXISTS idx_source_metadata_yale_stakeholders ON source_metadata(yale_stakeholders)");
    
    // Create indexes for order_sources
    await dbRun("CREATE INDEX IF NOT EXISTS idx_order_sources_yale_impact_areas ON order_sources(yale_impact_areas)");
    await dbRun("CREATE INDEX IF NOT EXISTS idx_order_sources_yale_stakeholders ON order_sources(yale_stakeholders)");
    
    console.log('Source schema successfully updated with Yale taxonomy support.');
  } catch (err) {
    console.error('Error updating source schema:', err);
    throw err;
  }
}

/**
 * Update base_source.js to properly handle Yale taxonomy fields
 */
async function updateBaseSource() {
  try {
    console.log('Updating base_source.js to handle Yale taxonomy fields...');
    
    const baseSourcePath = path.join(__dirname, 'sources', 'base_source.js');
    
    // Check if the file exists
    if (!fs.existsSync(baseSourcePath)) {
      console.error('base_source.js not found at', baseSourcePath);
      return;
    }
    
    // Read the current file content
    let baseSourceContent = fs.readFileSync(baseSourcePath, 'utf8');
    
    // Check if the file already has the Yale taxonomy fields
    if (baseSourceContent.includes('yaleImpactAreas: order.yaleImpactAreas')) {
      console.log('base_source.js already supports Yale taxonomy fields.');
      return;
    }
    
    // Find the standardizeOrder method and update it to include Yale taxonomy fields
    const standardizeOrderRegex = /standardizeOrder\s*\(order\)\s*{[^}]*}/s;
    
    if (!standardizeOrderRegex.test(baseSourceContent)) {
      console.error('Could not find standardizeOrder method in base_source.js');
      return;
    }
    
    // Extract the standardizeOrder method
    const standardizeOrderMatch = baseSourceContent.match(standardizeOrderRegex);
    const standardizeOrderMethod = standardizeOrderMatch[0];
    
    // Create the updated standardizeOrder method with Yale taxonomy fields
    const updatedMethod = standardizeOrderMethod.replace(
      /(\s+source: this\.name,\s+categories: order\.categories \|\| \[\],\s+universityImpactAreas: order\.universityImpactAreas \|\| \[\],)/,
      `$1
      yaleImpactAreas: order.yaleImpactAreas || [],
      yaleStakeholders: order.yaleStakeholders || [],`
    );
    
    baseSourceContent = baseSourceContent.replace(standardizeOrderMethod, updatedMethod);
    
    // Write the updated content back to the file
    fs.writeFileSync(baseSourcePath, baseSourceContent);
    
    console.log('base_source.js successfully updated to handle Yale taxonomy fields.');
  } catch (err) {
    console.error('Error updating base_source.js:', err);
    throw err;
  }
}

/**
 * Update export_to_json.js to include Yale taxonomy fields in exported JSON
 */
async function updateExportToJson() {
  try {
    console.log('Updating export_to_json.js to include Yale taxonomy fields...');
    
    const exportToJsonPath = path.join(__dirname, 'export_to_json.js');
    
    // Check if the file exists
    if (!fs.existsSync(exportToJsonPath)) {
      console.error('export_to_json.js not found at', exportToJsonPath);
      return;
    }
    
    // Read the current file content
    let exportToJsonContent = fs.readFileSync(exportToJsonPath, 'utf8');
    
    // Check if the sources processing section already includes Yale taxonomy fields
    if (exportToJsonContent.includes('yale_impact_areas:') && 
        exportToJsonContent.includes('yale_stakeholders:')) {
      console.log('export_to_json.js already includes Yale taxonomy fields.');
      return;
    }
    
    // Find the normalizeSourceAttribution function and update it to include Yale taxonomy fields
    const normalizeSourceAttributionRegex = /function normalizeSourceAttribution\s*\(sources\)\s*{[^}]*}/s;
    
    if (!normalizeSourceAttributionRegex.test(exportToJsonContent)) {
      console.error('Could not find normalizeSourceAttribution function in export_to_json.js');
      return;
    }
    
    const normalizeSourceAttributionMatch = exportToJsonContent.match(normalizeSourceAttributionRegex);
    const normalizeSourceAttributionFunc = normalizeSourceAttributionMatch[0];
    
    const updatedFunc = normalizeSourceAttributionFunc.replace(
      /return {[^}]*};/s,
      `return {
      name: source.source_name,
      abbreviation: getSourceAbbreviation(source.source_name),
      url: source.source_url,
      reference_id: source.external_reference_id,
      fetch_date: source.fetch_date,
      data: source.specificData || null,
      yale_impact_areas: source.yale_impact_areas ? JSON.parse(source.yale_impact_areas) : [],
      yale_stakeholders: source.yale_stakeholders ? JSON.parse(source.yale_stakeholders) : []
    };`
    );
    
    exportToJsonContent = exportToJsonContent.replace(normalizeSourceAttributionFunc, updatedFunc);
    
    // Find the query to get external sources data and update it to include Yale taxonomy fields
    const sourcesQueryRegex = /const sources = await dbAll\(\s*`\s*SELECT[^`]*`[^)]*/s;
    
    if (!sourcesQueryRegex.test(exportToJsonContent)) {
      console.error('Could not find sources query in export_to_json.js');
      return;
    }
    
    const sourcesQueryMatch = exportToJsonContent.match(sourcesQueryRegex);
    const sourcesQuery = sourcesQueryMatch[0];
    
    const updatedQuery = sourcesQuery.replace(
      /SELECT[^`]*/s,
      `SELECT sm.source_name, sm.source_url, os.external_reference_id, 
               os.source_specific_data, os.fetch_date, os.yale_impact_areas, os.yale_stakeholders`
    );
    
    exportToJsonContent = exportToJsonContent.replace(sourcesQuery, updatedQuery);
    
    // Write the updated content back to the file
    fs.writeFileSync(exportToJsonPath, exportToJsonContent);
    
    console.log('export_to_json.js successfully updated to include Yale taxonomy fields.');
  } catch (err) {
    console.error('Error updating export_to_json.js:', err);
    throw err;
  }
}

// Main function
async function main() {
  try {
    console.log('Starting Yale taxonomy integration for external sources...');
    
    // Update the database schema
    await updateSourceSchema();
    
    // Update base_source.js to handle Yale taxonomy fields
    await updateBaseSource();
    
    // Update export_to_json.js to include Yale taxonomy fields in exported JSON
    await updateExportToJson();
    
    console.log('Yale taxonomy integration for external sources completed successfully.');
  } catch (err) {
    console.error('Error in Yale taxonomy integration:', err);
  } finally {
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
}

// Run the main function
main();