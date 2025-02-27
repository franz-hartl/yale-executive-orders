# Yale Executive Order Analysis Project Structure

This document outlines the structure of the Yale Executive Order Analysis project, focusing on the local preprocessing and static website aspects.

## Project Overview

The project follows a preprocessing-to-static deployment model:
1. Data collection and preprocessing happen locally
2. Processed data is exported to static JSON files
3. The static website is deployed to GitHub Pages

This approach provides several benefits:
- Simple deployment with no server maintenance
- Fast and responsive user experience
- Reliable operation with no dependencies on backend services
- Easy updates through a well-defined pipeline

## Key Directories

- `/`: Root directory containing configuration and main processing scripts
- `/docs/`: The GitHub Pages website directory (deployed to production)
- `/public/`: Development version of the static website
- `/data/`: Directory for raw data files

## Important Files

### Core Scripts

- `database_setup.js`: Sets up the SQLite database with executive order data
- `generate_plain_summaries.js`: Creates AI-generated plain language summaries
- `export_to_json.js`: Exports database content to static JSON files
- `update_and_deploy.sh`: Shell script to automate the update and deployment process

### Data Collection Scripts

- `fetch_orders.js`: Main script for fetching executive orders
- `fetch_recent_orders.js`: Fetches only recent executive orders
- `fetch_historical_orders.js`: Fetches historical executive orders
- `fetch_whitehouse_orders.js`: Fetches orders directly from whitehouse.gov

### Database Files

- `executive_orders.db`: SQLite database containing all processed data
- `financial_executive_orders.csv`: Raw CSV data for import

### Static Website Files

- `docs/index.html`: Main entry point for the static website
- `docs/data/*.json`: Static JSON files with executive order data
- `docs/data/summaries/*.html`: HTML files with plain language summaries

## Data Flow

The data flows through the system in these stages:

1. **Collection**: Raw data is gathered from various sources using fetch_*.js scripts
2. **Storage**: Data is stored in the SQLite database (executive_orders.db)
3. **Processing**: AI processing adds summaries and categorization
4. **Export**: Processed data is exported to static JSON files
5. **Deployment**: Static files are copied to the docs/ folder and pushed to GitHub

## Development Workflow

1. **Local Development**:
   - Modify database_setup.js or other processing scripts as needed
   - Run individual scripts to test changes
   - Update the local database with new executive orders

2. **Testing**:
   - Export data to static files with export_to_json.js
   - Test the static website locally using a tool like http-server

3. **Deployment**:
   - Run update_and_deploy.sh to perform all steps automatically
   - Commit changes to the docs/ folder
   - Push to GitHub to update the live site

## Additional Notes

- The static website is designed to work entirely in the browser with no server-side dependencies
- All data processing happens during the preprocessing phase, not at runtime
- The project is organized to separate data processing from presentation
- The AI pipeline uses Claude API for generating summaries and categorizing orders