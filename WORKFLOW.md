# Yale Executive Orders Analysis Workflow

This document outlines the workflow for updating and maintaining the Yale Executive Orders Analysis project.

## Overview

The project follows a preprocessing-to-static deployment workflow:

1. Data collection and preprocessing occur on your local machine
2. Processed data is exported to static files
3. Static files are deployed to GitHub Pages

## Complete Workflow

### Initial Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/yale-executive-orders.git
   cd yale-executive-orders
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (create a `.env` file):
   ```
   ANTHROPIC_API_KEY=your_api_key
   ```

### Update Workflow

Follow these steps to add new executive orders, process them, and deploy:

1. **Collect New Data**
   - Option 1: Add new orders to `financial_executive_orders.csv`
   - Option 2: Fetch new orders automatically:
     ```bash
     node fetch_recent_orders.js
     ```

2. **Update the Database**
   ```bash
   node database_setup.js
   ```

3. **Generate AI Summaries**
   ```bash
   node generate_plain_summaries.js
   ```

4. **Export to Static Files**
   ```bash
   node export_to_json.js
   ```

5. **Test Locally**
   ```bash
   # Copy to docs folder
   cp -r public/data/* docs/data/
   
   # Start local server
   cd docs
   npx http-server
   ```

6. **Deploy to GitHub Pages**
   ```bash
   # Add changes
   git add docs/
   
   # Commit
   git commit -m "Update executive orders data"
   
   # Push to GitHub
   git push origin main
   ```

### Automated Workflow

For convenience, use the `update_and_deploy.sh` script to automate steps 2-5:

```bash
./update_and_deploy.sh
```

## Customization Workflow

### Adding Custom Categories

1. Edit `database_setup.js` to add new categories:
   ```javascript
   // Lines ~107-117
   const categories = [
     'Technology', 
     'Education', 
     // Add your new category here
     'YourNewCategory'
   ];
   ```

2. Run the complete update workflow to apply changes.

### Adding University Impact Areas

1. Edit `database_setup.js` to add new university impact areas:
   ```javascript
   // Lines ~93-99
   const universityImpactAreas = [
     'Research Funding',
     // Add your new impact area here
     'Your New Impact Area'
   ];
   ```

2. Run the complete update workflow to apply changes.

### Customizing the Web Interface

1. Edit the HTML/CSS/JavaScript in `docs/index.html`.
2. Test locally as described above.
3. Commit and push changes to deploy.

## Data Flow Chart

```
[CSV/API Sources] → fetch_*.js → [SQLite Database] → generate_plain_summaries.js 
                                     ↓
                                export_to_json.js
                                     ↓
                               [Static JSON Files] → GitHub Pages → [Live Website]
```

## Maintenance Tips

1. **Keep the Database**: Do not delete `executive_orders.db` as it contains processed data.

2. **Regular Updates**: Schedule regular runs of the update workflow to keep the data current.

3. **Backup**: Regularly back up your database and environment:
   ```bash
   cp executive_orders.db executive_orders.db.backup
   ```

4. **Monitor API Usage**: Keep track of your Anthropic API usage if generating many summaries.

## Troubleshooting

- **Missing Summaries**: Run `node generate_plain_summaries.js` to create missing summaries.
- **JSON Export Errors**: Check database integrity with `sqlite3 executive_orders.db .schema`.
- **Deployment Issues**: Ensure GitHub Pages is configured to serve from the `docs/` folder.