const fs = require('fs');
const path = require('path');

// Read the package.json file
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add new test scripts if they don't exist
if (\!packageJson.scripts['test:nih']) {
  packageJson.scripts['test:nih'] = 'node test_nih_fetch.js';
}

if (\!packageJson.scripts['test:integration']) {
  packageJson.scripts['test:integration'] = 'node test_nih_integration.js';
}

if (\!packageJson.scripts['fetch:external']) {
  packageJson.scripts['fetch:external'] = 'node fetch_external_sources.js';
}

// Write back the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Updated package.json with new scripts');
