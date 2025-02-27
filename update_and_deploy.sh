#!/bin/bash
# update_and_deploy.sh - A script to automate the executive orders update and deployment process

# Set error handling
set -e

echo "===== Yale Executive Orders Update and Deployment Tool ====="
echo "This script will update the database, generate summaries, export static files, and prepare for deployment."
echo ""

# Update the database
echo "Step 1: Updating the SQLite database with executive order data..."
node database_setup.js
echo "✅ Database updated successfully."

# Generate plain language summaries for any new orders
echo "Step 2: Generating plain language summaries for new executive orders..."
node generate_plain_summaries.js
echo "✅ Summaries generated successfully."

# Export data to static JSON files
echo "Step 3: Exporting database to static JSON files..."
node export_to_json.js
echo "✅ Data exported successfully to public/data/ directory."

# Copy static files to docs folder for GitHub Pages
echo "Step 4: Copying static files to docs/ folder for GitHub Pages..."
mkdir -p docs/data
cp -r public/data/* docs/data/
echo "✅ Static files copied successfully."

# Rename static HTML file if needed
if [ -f docs/index-static.html ] && [ ! -f docs/index.html ]; then
  echo "Renaming index-static.html to index.html..."
  cp docs/index-static.html docs/index.html
fi

echo "Step 5: Testing static site locally..."
echo "Starting a local server. Press Ctrl+C to stop after testing."
echo "Navigate to http://localhost:8080 in your browser."
echo ""

# Start a local server for testing
cd docs
npx http-server -p 8080

echo ""
echo "===== Deployment Instructions ====="
echo "To deploy to GitHub Pages:"
echo "1. Commit all changes: git add docs && git commit -m 'Update executive orders data'"
echo "2. Push to GitHub: git push origin main"
echo "3. Configure GitHub Pages to serve from the docs/ folder in your repository settings"
echo ""
echo "For detailed instructions, see GITHUB_PAGES_INSTRUCTIONS.md"