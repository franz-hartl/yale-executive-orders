/**
 * test_enhanced_export.js
 * 
 * This script tests the enhanced JSON export functionality with integrated source data.
 * It verifies that the new fields are correctly populated and structured.
 */

const fs = require('fs').promises;
const path = require('path');

// Location of the exported files
const dataDir = path.join(__dirname, 'public', 'data');
const ordersPath = path.join(dataDir, 'executive_orders.json');
const metadataPath = path.join(dataDir, 'metadata.json');
const systemInfoPath = path.join(dataDir, 'system_info.json');

async function testEnhancedExport() {
  try {
    console.log("Testing Enhanced JSON Export...");

    // Check if export files exist
    const filesExist = await checkFilesExist();
    if (!filesExist) {
      console.error("Required files missing. Please run export_to_json.js first.");
      process.exit(1);
    }

    // Read exported files
    console.log("Reading exported files...");
    const orders = JSON.parse(await fs.readFile(ordersPath, 'utf8'));
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    const systemInfo = JSON.parse(await fs.readFile(systemInfoPath, 'utf8'));

    // Test system info
    console.log("\nTesting System Info...");
    testSystemInfo(systemInfo);

    // Test metadata
    console.log("\nTesting Metadata...");
    testMetadata(metadata);

    // Test orders
    console.log("\nTesting Executive Orders...");
    testOrders(orders);

    console.log("\nEnhanced JSON export tests completed successfully! ✅");
  } catch (err) {
    console.error("Error testing enhanced export:", err);
    process.exit(1);
  }
}

async function checkFilesExist() {
  try {
    await fs.access(ordersPath);
    await fs.access(metadataPath);
    await fs.access(systemInfoPath);
    console.log("All required export files found.");
    return true;
  } catch (err) {
    return false;
  }
}

function testSystemInfo(systemInfo) {
  // Check version
  if (systemInfo.version !== '1.2.0') {
    console.error("ERROR: System info version is not 1.2.0");
    process.exit(1);
  }

  // Check external sources
  if (!systemInfo.externalSources || !Array.isArray(systemInfo.externalSources)) {
    console.error("ERROR: System info missing externalSources array");
    process.exit(1);
  }

  // Check source abbreviations
  const hasAbbreviations = systemInfo.externalSources.every(source => 
    source.abbreviation && typeof source.abbreviation === 'string');
  
  if (!hasAbbreviations) {
    console.error("ERROR: System info external sources missing abbreviations");
    process.exit(1);
  }
  
  console.log("  ✓ System info has correct version and source structure");
}

function testMetadata(metadata) {
  // Check source integration version
  if (metadata.sourceIntegrationVersion !== '1.2.0') {
    console.error("ERROR: Metadata sourceIntegrationVersion is not 1.2.0");
    process.exit(1);
  }

  // Check source integration features
  if (!metadata.sourceIntegrationFeatures || 
      !Array.isArray(metadata.sourceIntegrationFeatures) ||
      metadata.sourceIntegrationFeatures.length < 4) {
    console.error("ERROR: Metadata missing sourceIntegrationFeatures array");
    process.exit(1);
  }
  
  // Check external sources
  if (!metadata.externalSources || !Array.isArray(metadata.externalSources)) {
    console.error("ERROR: Metadata missing externalSources array");
    process.exit(1);
  }

  // Check source abbreviations
  const hasAbbreviations = metadata.externalSources.every(source => 
    source.abbreviation && typeof source.abbreviation === 'string');
  
  if (!hasAbbreviations) {
    console.error("ERROR: Metadata external sources missing abbreviations");
    process.exit(1);
  }
  
  console.log("  ✓ Metadata has correct version and source integration features");
}

function testOrders(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    console.error("ERROR: No orders found in export");
    process.exit(1);
  }
  
  // Check each order for enhanced fields
  let ordersWithSourceData = 0;
  let ordersWithEnhancedFields = 0;
  
  for (const order of orders) {
    // Check normalized sources
    if (order.sources && Array.isArray(order.sources)) {
      const hasProperSources = order.sources.every(source => 
        source.name && 
        source.abbreviation && 
        typeof source.abbreviation === 'string');
      
      if (hasProperSources && order.sources.length > 0) {
        ordersWithSourceData++;
        
        // Check for all enhanced fields
        if (order.integrated_analysis && 
            order.source_aware_impact_analysis && 
            order.institution_specific_guidance) {
          ordersWithEnhancedFields++;
        }
      }
    }
  }
  
  console.log(`  ✓ Found ${orders.length} orders in export`);
  console.log(`  ✓ Found ${ordersWithSourceData} orders with source data`);
  console.log(`  ✓ Found ${ordersWithEnhancedFields} orders with enhanced integration fields`);
  
  // If we have any orders with source data, perform deeper validation
  if (ordersWithSourceData > 0) {
    // Find an order with source data for detailed testing
    const orderWithSources = orders.find(order => 
      order.sources && 
      Array.isArray(order.sources) && 
      order.sources.length > 0);
    
    if (orderWithSources) {
      // Test institution_specific_guidance structure
      if (!orderWithSources.institution_specific_guidance) {
        console.error("ERROR: Missing institution_specific_guidance in order");
        process.exit(1);
      }
      
      // Test source_aware_impact_analysis structure
      if (!orderWithSources.source_aware_impact_analysis) {
        console.error("ERROR: Missing source_aware_impact_analysis in order");
        process.exit(1);
      }
      
      // Test integrated_analysis structure
      if (!orderWithSources.integrated_analysis) {
        console.error("ERROR: Missing integrated_analysis in order");
        process.exit(1);
      }
      
      console.log(`  ✓ Order #${orderWithSources.id} has valid enhanced data structure`);
    }
  }
}

// Run the tests
testEnhancedExport();