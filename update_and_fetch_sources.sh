#!/bin/bash

# update_and_fetch_sources.sh
#
# This script runs the external source fetching process and updates the database and static export.

echo "===== Starting External Sources Update Process ====="
echo "$(date)"
echo ""

# Ensure we have the right dependencies
echo "Checking dependencies..."
npm list axios cheerio jsdom > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Installing required dependencies..."
  npm install axios cheerio jsdom
fi

# Run the external sources fetcher
echo "Fetching data from external sources..."
node fetch_external_sources.js

# If successful, export to JSON for GitHub Pages
if [ $? -eq 0 ]; then
  echo "Generating static export files..."
  node export_to_json.js
  
  # Copy the output files to the docs directory for GitHub Pages
  echo "Copying export files to docs directory..."
  mkdir -p docs/data
  cp -r public/data/* docs/data/
  
  echo "External sources update complete!"
else
  echo "Error fetching external sources. Export not updated."
  exit 1
fi

echo ""
echo "===== External Sources Update Process Completed ====="
echo "$(date)"
echo ""
echo "Next Steps:"
echo "1. Review the data in docs/data/ directory"
echo "2. Commit and push changes to GitHub to update the GitHub Pages site"
echo ""