/**
 * export_data.js
 * 
 * Main entry point for exporting data to JSON files.
 * This script uses the Exporter class from the export module,
 * providing a clean interface between processing and presentation.
 */

const Exporter = require('./export/exporter');
const path = require('path');

// Configuration
const outputDir = path.join(__dirname, 'public', 'data');

/**
 * Export data with optional institution-specific extensions
 * @param {Object} options - Export options
 * @param {string} options.outputDir - Output directory
 * @param {string} options.institutionId - Institution identifier (e.g., 'yale')
 */
async function exportData(options = {}) {
  const exporter = new Exporter({
    outputDir: options.outputDir || outputDir,
    institutionId: options.institutionId || 'yale'
  });
  
  try {
    console.log('Starting data export process...');
    const success = await exporter.exportAll();
    
    if (success) {
      console.log('Data export completed successfully.');
    } else {
      console.error('Data export completed with errors.');
    }
    
    return success;
  } catch (err) {
    console.error('Error exporting data:', err);
    return false;
  }
}

// Run the export process when script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      options.outputDir = args[i + 1];
      i++;
    } else if (args[i] === '--institution' && i + 1 < args.length) {
      options.institutionId = args[i + 1];
      i++;
    }
  }
  
  exportData(options).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { exportData };