# Yale Executive Orders Database Migration Guide

This guide explains how to migrate from the old database structure to the new, cleaner schema while preserving all existing data.

## Migration Process

The database migration process has been designed to be minimally disruptive and preserve all existing data. Here's what happens during migration:

1. A backup of your existing database is automatically created
2. A new database with the updated schema is created
3. All data from the old database is migrated to the new one
4. The old database is replaced with the new one

## Running the Migration

To perform the migration, run:

```bash
node migrator.js
```

The script will provide detailed progress information as it runs. A backup of your original database will be created with a timestamp in the filename, e.g., `executive_orders_backup_1649276354321.db`.

## Post-Migration Steps

After migration, you should update your code to use the new Database API:

1. Replace direct SQLite usage with the Database class
2. Update scripts to use the new clean versions:
   - Use `database_setup_clean.js` instead of `database_setup.js`
   - Use `export_to_json_clean.js` instead of `export_to_json.js`
   - Use `generate_plain_summaries_clean.js` instead of `generate_plain_summaries.js`

For example:

```javascript
// Old code
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./executive_orders.db');

// New code
const Database = require('./utils/database');
const db = new Database();
await db.connect();
```

## Schema Changes

The database schema has been centralized in `schema.js` and follows a more explicit structure:

- Core tables (executive_orders, categories, etc.)
- Junction tables for relationships
- Yale-specific tables
- FTS (full-text search) configuration
- Reference data

The schema now includes explicit foreign key relationships, making the data model clearer and preventing orphaned records.

## Benefits of the New Database API

The new Database API (`utils/database.js`) provides several advantages:

1. **Connection management**: Automatic handling of connections
2. **Promisified methods**: All database operations return Promises
3. **Transaction support**: Easy way to run multiple operations in a transaction
4. **Error handling**: Improved error handling and recovery
5. **Order-specific methods**: Specialized methods for working with executive orders
6. **FTS integration**: Built-in full-text search support

## Troubleshooting

If you encounter any issues during migration:

1. **Restore from backup**: If needed, you can restore from the backup created during migration
2. **Check logs**: Review error messages for specific problems
3. **Verify tables**: Use SQLite tools to verify table structure after migration
4. **Test queries**: Run test queries against the new database to verify functionality

If problems persist, the migration can be re-run safely as it always creates a new backup.

## Next Steps

Once migration is complete, consider:

1. Updating other scripts to use the new Database API
2. Adding more comprehensive tests for database operations
3. Enhancing the schema with additional indices for performance
4. Implementing additional database utility functions for common operations