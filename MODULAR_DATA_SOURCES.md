# Modular Data Source Adapters

This document describes the modular data source adapter architecture for the Yale Executive Orders system. This architecture isolates different data sources, allowing the system to continue functioning even when some sources fail.

## Core Design Principles

1. **Source Isolation**: Each data source is completely isolated from others, with failures contained to a single source
2. **Standardized Interface**: All sources implement the same interface, making them interchangeable
3. **Consistent Error Handling**: Each source handles its own errors and provides clear failure information
4. **Data Normalization**: All sources transform their specific data formats into a common, standardized format
5. **Registry Pattern**: A central registry manages sources while preserving their independence

## System Components

### 1. Base Source

The `BaseSource` class provides the foundation for all source adapters, defining:

- A standard interface that all sources must implement
- Common validation and data standardization functions
- Error handling and logging mechanisms
- Lifecycle management (initialization and cleanup)

### 2. Source Implementations

Each source adapter handles a specific data source:

- **FederalRegisterSource**: Fetches data from the official Federal Register API
- **WhiteHouseSource**: Fetches data directly from the White House website
- **LocalFileSource**: Uses local JSON files as a data source
- **DatabaseSource**: Reads from and writes to a SQLite database

### 3. Source Registry

The `SourceRegistry` manages all data sources while preserving their independence:

- Registers and tracks available sources
- Enables or disables individual sources
- Provides a unified interface for fetching from multiple sources
- Handles source initialization and cleanup
- De-duplicates results from multiple sources

## Data Flow

1. **Registration**: Sources are registered with the Source Registry
2. **Initialization**: Each source is initialized, setting up necessary resources
3. **Fetching**: Data is fetched from each source independently
4. **Transformation**: Each source transforms data into a standard format
5. **Consolidation**: Results from all sources are combined and de-duplicated
6. **Storage**: Consolidated data is stored for later use
7. **Cleanup**: Sources release their resources

## Error Handling

Each source implements robust error handling:

1. **Local Containment**: Errors in one source don't affect others
2. **Consistent Logging**: All errors are logged with source context
3. **Graceful Degradation**: The system continues functioning with partial data
4. **Retry Logic**: Sources can implement their own retry strategies
5. **Health Reporting**: Sources report their health status to the registry

## Using Source Adapters

### Creating a New Source

To create a new source adapter:

1. Create a new class that extends `BaseSource`
2. Implement the required methods: `fetchOrders()` and `fetchOrderById()`
3. Add source-specific logic for connecting to the data source
4. Implement data transformation to the standard format
5. Add appropriate error handling

```javascript
class MyNewSource extends BaseSource {
  constructor(options = {}) {
    super({
      name: 'My New Source',
      description: 'Description of my new source',
      ...options
    });
  }
  
  async fetchOrders(options = {}) {
    // Implement source-specific fetching logic
  }
  
  async fetchOrderById(identifier) {
    // Implement source-specific fetching logic
  }
}
```

### Fetching Data from Multiple Sources

To fetch data from all registered sources:

```javascript
// Register sources
const federalRegisterSource = new FederalRegisterSource({ id: 'federal-register' });
sourceRegistry.registerSource(federalRegisterSource);

const whiteHouseSource = new WhiteHouseSource({ id: 'whitehouse' });
sourceRegistry.registerSource(whiteHouseSource);

// Initialize sources
await sourceRegistry.initializeAllSources();

// Fetch from all sources
const fetchResults = await sourceRegistry.fetchFromAllSources({
  fromDate: '2023-01-01',
  includeFullText: true
});

// Work with combined results
console.log(`Fetched ${fetchResults.orders.length} total orders`);

// Clean up
await sourceRegistry.cleanupAllSources();
```

### Fetching from a Specific Source

To fetch data from a specific source:

```javascript
const source = sourceRegistry.getSource('federal-register');
const orders = await source.fetchOrders({ fromDate: '2023-01-01' });
```

## Benefits of This Approach

1. **Resilience**: If one source fails, others continue working
2. **Flexibility**: Easy to add new sources or modify existing ones
3. **Maintainability**: Each source is self-contained and focused
4. **Testability**: Sources can be tested independently
5. **Clear Boundaries**: Well-defined interfaces between components
6. **Extensibility**: New sources can be added without changing existing code

## Directory Structure

```
yale-executive-orders/
├── sources/                   # Data source adapters
│   ├── base_source.js         # Base class for all sources
│   ├── federal_register_source.js  # Federal Register API source
│   ├── whitehouse_source.js   # White House website source
│   ├── local_file_source.js   # Local file source
│   ├── database_source.js     # SQLite database source
│   └── source_registry.js     # Registry for managing sources
│
├── utils/                     # Shared utilities
│   ├── http.js                # HTTP request utilities
│   ├── common.js              # Common utility functions
│   └── logger.js              # Logging framework
│
├── fetch_eo_data.js           # Main script for fetching data
│
└── MODULAR_DATA_SOURCES.md    # This documentation
```

## Future Enhancements

1. **Caching Layer**: Add caching to reduce redundant fetches
2. **Health Monitoring**: Implement more detailed source health checks
3. **Priority Ordering**: Allow sources to be prioritized for deduplication
4. **Incremental Fetching**: Only fetch new or changed orders
5. **Parallel Fetching**: Fetch from multiple sources simultaneously
6. **Adaptive Retry**: Implement exponential backoff for transient failures