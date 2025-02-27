// Script to update the summary_formats_available property in executive_orders.json
const fs = require('fs');
const path = require('path');

// Paths to JSON files
const paths = [
  path.join(__dirname, 'docs', 'data', 'executive_orders.json'),
  path.join(__dirname, 'public', 'data', 'executive_orders.json')
];

// Process each file
paths.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  try {
    // Read and parse JSON
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update each order
    data.forEach(order => {
      // Create summary_formats_available array based on available summaries
      order.summary_formats_available = [];
      
      if (order.executive_brief) {
        order.summary_formats_available.push('executive_brief');
      }
      
      if (order.plain_language_summary) {
        order.summary_formats_available.push('standard');
      }
      
      if (order.comprehensive_analysis) {
        order.summary_formats_available.push('comprehensive');
      }
    });
    
    // Write updated JSON back to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
});

console.log('Summary formats update completed.');