# Yale Executive Orders Analysis App - Debug Guide

This guide provides troubleshooting information and development tips for the Yale Executive Orders Analysis application.

## Common Issues and Solutions

### 1. API Connection Issues

**Symptoms:** 
- "Error loading executive orders" message in the UI
- Fetch errors in browser console

**Solutions:**
- Ensure the API server is running (`node api_server.js`)
- Verify the port isn't in use by another application (default: 3001)
- Check the API key in your .env file is valid

### 2. Database Issues

**Symptoms:**
- Database errors in console logs
- Missing or incomplete data in the UI

**Solutions:**
- Verify the SQLite database file (`executive_orders.db`) exists
- Re-initialize the database: `node sqlite_setup.js`
- Check file permissions on the database file

### 3. Plain Language Summaries Not Available

**Symptoms:**
- "No Plain Language Summary Available" message when viewing orders
- Summary tab is empty or shows an error

**Solutions:**
- Run the summary generation tool: `node generate_plain_summaries.js`
- Ensure your Claude API key is valid (check .env file)
- Verify the plain_language_summary column exists in the database

### 4. AI Categorization Failures

**Symptoms:**
- Categorization fails with error messages
- Categories remain empty after running the categorization process

**Solutions:**
- Check your Claude API key in the .env file
- Ensure you're connected to the internet
- Look at the API error response for specific error details

## Startup Configuration

### Server Options

The application provides multiple server implementations:

1. **API Server (Recommended):**
   ```
   node api_server.js
   ```
   Full-featured REST API for executive order data

2. **Simplified Server:**
   ```
   node simplified_server.js
   ```
   Lightweight server with minimal functionality

3. **Basic Server:**
   ```
   node basic_server.js
   ```
   Simple static file server

4. **MCP Server:**
   ```
   node mcp_server.js
   ```
   Advanced server with Model Context Provider integration

5. **Combined Server (with command-line arguments):**
   ```
   node start_server.js [mode]
   ```
   Where mode is 'simple', 'basic', 'mcp', or 'full' (default)

### Environment Configuration

Create a `.env` file in the project root with the following variables:

```
# Required for AI functionality
ANTHROPIC_API_KEY=your_claude_api_key_here

# Optional configuration
PORT=3001
```

### Setting Up the Database

The application uses SQLite, which requires no separate database server:

1. To initialize/reset the database:
   ```
   node sqlite_setup.js
   ```

2. To populate with executive order data:
   ```
   node fetch_orders.js
   ```

## Development Tips

### UI Customization

The main UI is in `public/index.html` and uses:
- Tailwind CSS for styling
- Vanilla JavaScript for interactivity
- RESTful API calls to fetch data

### Adding New Executive Orders

You can add orders in several ways:

1. **Automatic fetch from sources:**
   ```
   node fetch_orders.js
   ```

2. **CSV import:**
   Add data to `financial_executive_orders.csv` and run:
   ```
   node sqlite_setup.js
   ```

3. **API endpoint:**
   ```
   POST /api/executive-orders
   ```
   with appropriate JSON payload

### Generating Plain Language Summaries

To create plain language summaries:

```
node generate_plain_summaries.js
```

This script:
- Identifies orders without summaries
- Uses Claude to generate summaries (~400 words each)
- Formats with Yale's color scheme and structure
- Stores in the database (HTML format)

### Log Files

Check these logs for troubleshooting:
- Server logs are output to the console
- Some operations might create a `server.log` file

## Complete Server Setup

For a complete setup that includes all functionality:

1. Start the API server:
   ```
   node api_server.js
   ```

2. Access the web interface:
   ```
   http://localhost:3001/index.html
   ```

3. Fetch latest executive orders:
   - Click "Fetch New Orders" button in UI, or
   - Run `node fetch_orders.js` from command line

4. Generate plain language summaries:
   ```
   node generate_plain_summaries.js
   ```