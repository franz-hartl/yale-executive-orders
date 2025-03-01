#!/bin/bash
# update_and_deploy.sh - A script to automate the Yale-specific executive orders update and deployment process

# Set error handling
set -e

echo "===== Yale University Executive Orders Analysis Tool ====="
echo "This script will update the Yale-specific database, generate Yale-focused summaries, export static files, and prepare for deployment."
echo "Yale-Specific Focus Version 2.0.0"
echo ""

# Check if Yale data structure exists
echo "Step 1: Checking if Yale-specific data structure exists..."
if [ ! -d "yale_specific_data" ]; then
  mkdir -p yale_specific_data
  echo "⚠️ Yale-specific data directory did not exist and was created."
  echo "Please add Yale-specific data files before continuing."
  exit 1
fi

# Update the database with Yale structure
echo "Step 2: Updating the SQLite database with Yale-specific structure..."
node database_setup.js
echo "✅ Yale-specific database updated successfully."

# Generate Yale-specific summaries for any new orders
echo "Step 3: Generating Yale-specific summaries for executive orders..."
node generate_plain_summaries.js
echo "✅ Yale-specific summaries generated successfully."

# Export data to Yale-focused static JSON files
echo "Step 4: Exporting Yale-specific database to static JSON files..."
node export_to_json.js
echo "✅ Yale-specific data exported successfully to public/data/ directory."

# Copy static files to docs folder for GitHub Pages
echo "Step 5: Copying Yale-specific files to docs/ folder for GitHub Pages..."
mkdir -p docs/data
cp -r public/data/* docs/data/
echo "✅ Yale-specific files copied successfully."

# Rename static HTML file if needed
if [ -f docs/index-static.html ] && [ ! -f docs/index.html ]; then
  echo "Renaming index-static.html to index.html..."
  cp docs/index-static.html docs/index.html
fi

echo "Step 6: Testing Yale-specific site locally..."
echo "Starting a local server. Press Ctrl+C to stop after testing."
echo "Navigate to http://localhost:8080 in your browser."
echo ""

# Start a local server for testing
cd docs
npx http-server -p 8080

echo ""
echo "===== Yale-Specific Deployment Instructions ====="
echo "To deploy the Yale-focused site to GitHub Pages:"
echo "1. Commit all changes: git add docs yale_specific_data && git commit -m 'Update Yale-specific executive orders data'"
echo "2. Push to GitHub: git push origin main"
echo "3. Configure GitHub Pages to serve from the docs/ folder in your repository settings"
echo ""
echo "For detailed Yale implementation information, see YALE_FOCUS.md"
echo "For general deployment instructions, see GITHUB_PAGES_INSTRUCTIONS.md"