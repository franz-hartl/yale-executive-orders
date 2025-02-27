# Converting Yale Executive Orders Application to GitHub Pages

This document provides step-by-step instructions for deploying the Yale Executive Orders Analysis application to GitHub Pages as a static website.

## Overview

Converting this application from a dynamic Node.js app with SQLite database to a static GitHub Pages site requires:

1. Exporting the database content to static JSON files
2. Modifying the frontend to use these static JSON files instead of API calls
3. Creating a proper GitHub Pages project structure
4. Setting up the deployment workflow

## Phase 0: Backup and Environment Setup

### Create a full backup of your current system

```bash
# Export the database to JSON (this will be useful for reference)
node export_to_json.js

# Create a ZIP archive of your project
zip -r yale_executive_orders_backup.zip .

# Store the backup in a secure location
```

### Set up GitHub repository

1. Create a new repository on GitHub
   - Repository name: `yale-executive-orders`
   - Description: `Yale University Executive Order Analysis Assistant`
   - Initialize with README and choose the MIT license
   - Add a Node.js `.gitignore` file

2. Clone the repository to your local machine
   ```bash
   git clone https://github.com/yourusername/yale-executive-orders.git
   cd yale-executive-orders
   ```

3. Copy your project files to the new repository directory
   ```bash
   # Copy all files except node_modules, .git and the database file
   cp -r ../executive_orders_finance/* .
   # Optional: Remove unnecessary server files if you prefer a clean repo
   ```

## Phase 1: Data Export

### Execute the JSON export script

The `export_to_json.js` script has been created to export all relevant data from your SQLite database to JSON files:

```bash
# Make sure you have the required dependencies
npm install

# Run the export script
node export_to_json.js
```

This will create the following files in the `public/data` directory:
- `executive_orders.json`: All executive orders with their relationships
- `categories.json`: All categories
- `impact_areas.json`: All impact areas
- `university_impact_areas.json`: All university impact areas
- `metadata.json`: Combined metadata for easy access
- `statistics.json`: Pre-calculated statistics
- `system_info.json`: System information
- `orders/`: Directory with individual order JSON files
- `summaries/`: Directory with HTML files for plain language summaries

### Verify the exported data

```bash
# Check that all necessary files were created
ls -la public/data/

# Inspect a few files to verify their contents
cat public/data/system_info.json
cat public/data/metadata.json
```

## Phase 2: Create Static Frontend

### Use the static HTML version

The `index-static.html` file has already been created with all necessary modifications to work with static JSON files instead of API calls:

```bash
# Rename it to index.html to be the main entry point
cp public/index-static.html public/index.html
```

### Test the static version locally

```bash
# Install a simple static file server if needed
npm install -g http-server

# Start the server in the public directory
cd public
http-server

# Navigate to http://localhost:8080 in your browser
```

Verify that:
- Executive orders load and display correctly
- Filtering and sorting work as expected
- Detail view shows all information
- Plain language summaries load if available

## Phase 3: Configure GitHub Pages

### Set up your GitHub Pages branch structure

GitHub Pages can serve from:
- The root of the `main` branch
- The `/docs` folder in the `main` branch
- A dedicated `gh-pages` branch

For simplicity, we'll use the `/docs` folder approach:

```bash
# Create a docs directory
mkdir -p docs

# Copy all contents from public/ to docs/
cp -r public/* docs/

# Add .nojekyll to prevent GitHub's Jekyll processing
touch docs/.nojekyll
```

### Prepare the repository for GitHub Pages

```bash
# Make sure the docs folder contains all required files
ls -la docs/

# Add all files to git
git add .
git commit -m "Prepare for GitHub Pages deployment"
git push origin main
```

### Configure GitHub Pages in repository settings

1. Go to your repository on GitHub
2. Navigate to Settings > Pages
3. Under "Source", select "Deploy from a branch"
4. Select the "main" branch and "/docs" folder
5. Click "Save"

GitHub will provide a URL where your site is published (usually `https://yourusername.github.io/yale-executive-orders/`).

## Phase 4: Establish Update Workflow

### Process for updating data

When you need to update the data in the future:

1. Run your local database setup with the updated executive orders
   ```bash
   # Import new data into the local database
   node sqlite_setup.js
   ```

2. Generate new plain language summaries if needed
   ```bash
   node generate_plain_summaries.js
   ```

3. Export the updated data to JSON
   ```bash
   node export_to_json.js
   ```

4. Copy the updated data to the docs folder
   ```bash
   cp -r public/data/* docs/data/
   ```

5. Commit and push the changes
   ```bash
   git add docs/data/
   git commit -m "Update executive order data"
   git push origin main
   ```

### Optional: Automate with GitHub Actions

To automate updates, you could create a GitHub Actions workflow:

1. Create a file at `.github/workflows/update-data.yml`:

```yaml
name: Update Executive Orders Data

on:
  workflow_dispatch:  # Allows manual triggering
  schedule:
    - cron: '0 0 * * 1'  # Run weekly on Mondays at midnight

jobs:
  update-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm install
        
      - name: Export data to JSON
        run: node export_to_json.js
        
      - name: Copy data to docs folder
        run: cp -r public/data/* docs/data/
        
      - name: Commit and push changes
        uses: EndBug/add-and-commit@v9
        with:
          message: 'Update executive orders data'
          add: 'docs/data'
```

Note: For this to work fully automated, you would need to adjust your export script to fetch data from external sources rather than the local database, or include the database in your repository.

## Additional Tips

### SEO Optimization

1. Add proper `<meta>` tags to your `index.html`:
   ```html
   <meta name="description" content="Yale University Executive Order Analysis Assistant - Tracking and analyzing executive orders that impact university operations and compliance">
   <meta name="keywords" content="Yale, executive orders, university impact, higher education, compliance, research funding">
   ```

2. Create a `sitemap.xml` file in the `docs` directory for better indexing

### Enhance URL Routing

The static version includes basic URL parameter handling but you could enhance it:

1. Add a proper routing library like `navigo` for more complex navigation
2. Create separate HTML files for main sections if needed
3. Implement a service worker for offline capability

### Performance Optimizations

1. Minify your HTML, CSS, and JavaScript files
2. Optimize images if you add any
3. Implement lazy loading for large datasets
4. Add caching headers via `.htaccess` or similar

## Troubleshooting

### Common Issues

1. **Data not displaying**: Check browser console for errors; verify JSON paths are correct
2. **Plain language summaries not loading**: Ensure HTML files are properly exported to `/docs/data/summaries/`
3. **GitHub Pages not updating**: It may take a few minutes for changes to propagate

### Getting Help

If you encounter issues, check:
- GitHub Pages documentation: https://docs.github.com/en/pages
- GitHub Community forums
- Stack Overflow with the [github-pages] tag