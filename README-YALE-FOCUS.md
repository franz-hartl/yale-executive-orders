# Yale Executive Orders Analysis - Yale-Specific Focus

This project has been refocused to serve Yale University exclusively, streamlining the database schema and export process to focus on Yale's organizational structure and needs.

## Yale-Specific Implementation

### Key Changes

1. **Simplified Database Schema**
   - Removed generic institution types tables
   - Added Yale department structure
   - Created direct mapping between executive orders and Yale departments

2. **Yale Impact Areas**
   - Updated impact areas to be Yale-specific
   - Each impact area maps to primary and secondary Yale departments
   - Added Yale-unique domains (Arts & Museums, Yale College Experience, etc.)

3. **Yale Department Structure**
   - Implemented Yale's actual organizational hierarchy
   - Included reporting relationships between departments
   - Added contact information for each department

4. **Simplified JSON Export**
   - Eliminated multi-institution complexity
   - Streamlined data structures for Yale-specific use
   - Added Yale department guidance to the export

### Files Created/Modified

- `database_setup.js`: Modified to create Yale-specific tables
- `export_to_json.js`: Updated to export Yale-centric data
- `yale_specific_data/yale_impact_areas.json`: Updated to map to Yale departments
- `YALE_FOCUS.md`: Documentation of Yale-specific implementation

## Running the Application

1. **Database Setup**
   ```
   node database_setup.js
   ```
   This will create the database with Yale-specific tables and import Yale departments.

2. **Generate Summaries**
   ```
   node generate_plain_summaries.js
   ```
   Processes executive orders with Yale-specific context.

3. **Export to JSON**
   ```
   node export_to_json.js
   ```
   Exports Yale-specific data to JSON files for the static site.

4. **Run the Static Site**
   ```
   cd docs && npx http-server
   ```
   View the site locally with Yale-specific data.

## Yale-Specific Data Structure

The exported JSON now includes Yale-specific structure:

```json
{
  "yale_guidance": {
    "yale_university": {
      "relevance_score": 8,
      "affected_departments": ["Office of Research", "General Counsel"],
      "primary_departments": [...],
      "secondary_departments": [...],
      "action_items": [...]
    }
  }
}
```

## Yale Impact Areas

The Yale-specific impact areas include:

- Research Funding & Security
- Advanced Research Programs
- International Collaboration
- Endowment Management
- Graduate Education
- Public-Private Partnerships
- Administrative Compliance
- Arts & Cultural Heritage
- Global Education
- Medical & Clinical Operations
- Yale College Experience
- Athletics & Student Activities

Each impact area is mapped to Yale departments, creating direct connections between executive orders and the responsible Yale units.

## Detailed Documentation

For more information on the Yale-specific implementation, see:

- `YALE_FOCUS.md`: Detailed implementation plan
- `database_setup.js`: Database schema changes
- `export_to_json.js`: Yale-specific export format