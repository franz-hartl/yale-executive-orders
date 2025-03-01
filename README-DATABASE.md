# Yale Executive Orders Database API

This document provides guidelines for interacting with the Yale Executive Orders database.

## Basic Usage

```javascript
const Database = require('./utils/database');

async function example() {
  const db = new Database();
  
  try {
    await db.connect();
    
    // Get all executive orders
    const orders = await db.getAllOrders({ limit: 10 });
    console.log(orders);
    
    // Get an order with all related data
    const order = await db.getOrderWithRelations(1);
    console.log(order);
    
    // Search for orders
    const searchResults = await db.searchOrders('climate change');
    console.log(searchResults);
    
  } finally {
    await db.close();
  }
}

example();
```

## Schema Structure

The database schema is defined in `schema.js` and follows the "Essential Simplicity" design philosophy with flat data structures and clear relationships.

### Core Tables
- `executive_orders`: The main table containing executive order data
- `categories`: Categories for classifying executive orders
- `impact_areas`: Areas impacted by executive orders
- `university_impact_areas`: University-specific impact areas

### Yale-Specific Tables
- `yale_departments`: Yale University departments
- `yale_impact_areas`: Yale-specific impact areas
- `yale_compliance_actions`: Required compliance actions for Yale
- `yale_impact_mapping`: Mapping of impacts to Yale departments

## Database API Methods

### Connection Management
- `connect()`: Connect to the database
- `close()`: Close the database connection
- `transaction(operations)`: Execute multiple operations in a transaction

### Basic Operations
- `run(sql, params)`: Execute a SQL query
- `get(sql, params)`: Get a single row from a query
- `all(sql, params)`: Get all rows from a query

### Order Management
- `getOrder(id)`: Get an order by ID
- `getOrderByNumber(orderNumber)`: Get an order by its order number
- `createOrder(orderData)`: Create a new order
- `updateOrder(id, orderData)`: Update an existing order
- `getAllOrders(options)`: Get all orders with pagination
- `searchOrders(query)`: Search orders using full-text search
- `getOrderWithRelations(id)`: Get an order with all related data

### Database Setup
- `createTables()`: Create database tables from schema
- `initializeReferenceData()`: Initialize reference data

## Best Practices

1. Always use the Database API instead of direct SQLite access
2. Use transactions for multi-step operations
3. Close database connections when done
4. Use parameterized queries to prevent SQL injection
5. Handle Yale-specific tables conditionally, as they might not exist in all deployments

## Migration

To migrate from the old database structure to the new one, use the `migrator.js` script:

```bash
node migrator.js
```

This will:
1. Create a backup of your existing database
2. Create a new database with the updated schema
3. Migrate all data from the old database to the new one
4. Replace the old database with the new one

The original database is backed up with a timestamp in the filename.

## Schema Definition

The schema is defined in `schema.js` using a JavaScript object structure that makes it easy to understand and modify. The structure separates:

- Core tables
- Junction tables 
- Yale-specific tables
- Full-text search configuration
- Reference data

This separation makes it clear which parts of the schema are essential and which are specific to Yale's implementation.