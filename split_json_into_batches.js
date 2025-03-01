/**
 * Script to split the large executive orders JSON file into smaller batch files
 * This improves loading performance by allowing progressive loading of data
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_FILE = 'docs/data/processed_executive_orders.json';
const OUTPUT_DIR = 'docs/data/batches';
const BATCH_SIZE = 50; // Number of orders per batch
const INDEX_FILE = 'docs/data/orders_index.json';

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read the source file
console.log(`Reading source file: ${SOURCE_FILE}`);
const orders = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));

// Calculate number of batches
const totalOrders = orders.length;
const totalBatches = Math.ceil(totalOrders / BATCH_SIZE);

console.log(`Found ${totalOrders} orders, creating ${totalBatches} batches of ${BATCH_SIZE} orders each`);

// Create each batch file
for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
  const startIndex = (batchNum - 1) * BATCH_SIZE;
  const endIndex = Math.min(startIndex + BATCH_SIZE, totalOrders);
  
  const batchData = orders.slice(startIndex, endIndex);
  const outputFile = path.join(OUTPUT_DIR, `orders_batch_${batchNum}.json`);
  
  fs.writeFileSync(outputFile, JSON.stringify(batchData, null, 2));
  console.log(`Created batch ${batchNum}/${totalBatches}: ${outputFile} with ${batchData.length} orders`);
}

// Create the index file
const indexData = {
  total: totalOrders,
  batchSize: BATCH_SIZE,
  lastUpdated: new Date().toISOString(),
  version: "1.0.0",
  description: "Index file for batched executive orders data"
};

fs.writeFileSync(INDEX_FILE, JSON.stringify(indexData, null, 2));
console.log(`Created index file: ${INDEX_FILE}`);

console.log('Done!');