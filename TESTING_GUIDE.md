# Testing Guide for Yale Executive Orders Project

This guide outlines the testing approach and best practices for the Yale Executive Orders project. It provides a comprehensive plan for unit testing, integration testing, and end-to-end testing of the system.

## Testing Philosophy

The Yale Executive Orders project follows these testing principles:

1. **Essential Coverage**: Focus testing on critical paths and complex logic
2. **Component Isolation**: Test components independently with clear boundaries
3. **Representative Data**: Use realistic data samples for testing
4. **Failure Scenarios**: Test error handling and edge cases
5. **Maintainable Tests**: Write clear, self-documenting tests

## Test Framework Setup

### Installing Jest

Jest is the recommended testing framework for this project:

```bash
npm install --save-dev jest
```

### Configuring Jest

Create a `jest.config.js` file in the project root:

```javascript
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'extraction/**/*.js',
    'knowledge/**/*.js',
    'models/**/*.js',
    'sources/**/*.js',
    'templates/**/*.js',
    'workflow/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80
    }
  },
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true
};
```

### Package.json Configuration

Update `package.json` to include test scripts:

```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

## Test Directory Structure

Organize tests using the following structure:

```
yale-executive-orders/
├── extraction/
│   ├── __tests__/
│   │   ├── extraction_manager.test.js
│   │   └── extractors/
│   │       ├── date_extractor.test.js
│   │       ├── requirement_extractor.test.js
│   │       └── ...
├── knowledge/
│   ├── __tests__/
│   │   ├── knowledge_manager.test.js
│   │   └── fact.test.js
├── models/
│   ├── __tests__/
│   │   └── ...
└── ...
```

## Mocking Dependencies

### Database Mocking

For database operations, create a mock database module:

```javascript
// __mocks__/database.js
const mockDb = {
  query: jest.fn().mockResolvedValue([]),
  run: jest.fn().mockResolvedValue({ lastID: 1 }),
  get: jest.fn().mockResolvedValue(null),
  all: jest.fn().mockResolvedValue([]),
  exec: jest.fn().mockResolvedValue({ changes: 1 })
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockDb),
  close: jest.fn().mockResolvedValue(true)
};

module.exports = {
  getDb: jest.fn().mockResolvedValue(mockDb),
  getPool: jest.fn().mockReturnValue(mockPool),
  query: mockDb.query,
  run: mockDb.run,
  get: mockDb.get,
  all: mockDb.all,
  exec: mockDb.exec
};
```

### API Request Mocking

For API calls, use Jest's mocking capabilities:

```javascript
// Example: Mocking axios
jest.mock('axios');
const axios = require('axios');

// Mock specific response
axios.get.mockResolvedValue({
  data: {
    results: [/* mock data */]
  }
});
```

### File System Mocking

For file operations, mock the fs module:

```javascript
jest.mock('fs');
const fs = require('fs');

// Mock file reading
fs.readFileSync.mockReturnValue(JSON.stringify({ key: 'value' }));
```

## Unit Testing Plan

### 1. Extraction Layer

#### Extraction Manager Tests

```javascript
// extraction/__tests__/extraction_manager.test.js
describe('ExtractionManager', () => {
  test('should initialize with default extractors', () => {
    // Test initialization
  });
  
  test('should extract from a single order', async () => {
    // Test single extraction
  });
  
  test('should extract from multiple orders', async () => {
    // Test batch extraction
  });
  
  test('should retry failed extractions', async () => {
    // Test retry logic
  });
  
  test('should handle extraction errors gracefully', async () => {
    // Test error handling
  });
});
```

#### Specialized Extractor Tests

For each extractor (DateExtractor, RequirementExtractor, etc.):

```javascript
// extraction/__tests__/extractors/date_extractor.test.js
describe('DateExtractor', () => {
  test('should extract standard date formats', () => {
    // Test with various date formats
  });
  
  test('should extract date ranges', () => {
    // Test with date ranges
  });
  
  test('should extract relative dates', () => {
    // Test with relative dates (e.g., "30 days after")
  });
  
  test('should handle ambiguous dates', () => {
    // Test with ambiguous dates
  });
  
  test('should assign correct confidence scores', () => {
    // Test confidence scoring
  });
});
```

### 2. Knowledge Management System

#### Knowledge Manager Tests

```javascript
// knowledge/__tests__/knowledge_manager.test.js
describe('KnowledgeManager', () => {
  test('should initialize correctly', async () => {
    // Test initialization
  });
  
  test('should store facts', async () => {
    // Test fact storage
  });
  
  test('should retrieve facts by order', async () => {
    // Test fact retrieval by order
  });
  
  test('should update existing facts', async () => {
    // Test fact updates
  });
  
  test('should find contradictions', async () => {
    // Test contradiction detection
  });
  
  test('should handle database errors', async () => {
    // Test error handling
  });
});
```

#### Fact Model Tests

```javascript
// knowledge/__tests__/fact.test.js
describe('Fact', () => {
  test('should create a valid fact object', () => {
    // Test fact creation
  });
  
  test('should convert to database format', () => {
    // Test toDbObject method
  });
  
  test('should create from database record', () => {
    // Test fromDbRecord method
  });
  
  test('should handle relationships', () => {
    // Test relationship methods
  });
});
```

### 3. Data Models

#### Model Tests

For each model (ConflictRecord, ExtractedKnowledge, etc.):

```javascript
// models/__tests__/conflict_record.test.js
describe('ConflictRecord', () => {
  test('should create a valid conflict record', () => {
    // Test creation
  });
  
  test('should resolve conflicts', () => {
    // Test resolve method
  });
  
  test('should flag conflicts', () => {
    // Test flag method
  });
  
  test('should convert to database format', () => {
    // Test toDbObject method
  });
});
```

### 4. Source Management

#### Source Manager Tests

```javascript
// sources/__tests__/source_manager.test.js
describe('SourceManager', () => {
  test('should register sources', () => {
    // Test source registration
  });
  
  test('should retrieve sources', () => {
    // Test source retrieval
  });
  
  test('should fetch data from sources', async () => {
    // Test data fetching
  });
  
  test('should handle source errors', async () => {
    // Test error handling
  });
});
```

#### Source Implementation Tests

For each source (FederalRegisterSource, NIHSource, etc.):

```javascript
// sources/__tests__/federal_register_source.test.js
describe('FederalRegisterSource', () => {
  test('should fetch recent orders', async () => {
    // Test fetching recent orders
  });
  
  test('should fetch by order number', async () => {
    // Test fetching specific order
  });
  
  test('should normalize data format', async () => {
    // Test data normalization
  });
  
  test('should handle API errors', async () => {
    // Test error handling
  });
});
```

### 5. Template System

#### Template Manager Tests

```javascript
// templates/__tests__/template_manager.test.js
describe('TemplateManager', () => {
  test('should register templates', () => {
    // Test template registration
  });
  
  test('should retrieve templates', () => {
    // Test template retrieval
  });
  
  test('should render templates', async () => {
    // Test template rendering
  });
});
```

#### Renderer Tests

For each renderer (OrderRenderer, ConflictRenderer, etc.):

```javascript
// templates/__tests__/renderers/order_renderer.test.js
describe('OrderRenderer', () => {
  test('should render basic order data', () => {
    // Test basic rendering
  });
  
  test('should include Yale-specific sections', () => {
    // Test Yale customizations
  });
  
  test('should handle missing data', () => {
    // Test with incomplete data
  });
});
```

### 6. Workflow Pipeline

#### Pipeline Tests

```javascript
// workflow/__tests__/pipeline.test.js
describe('Pipeline', () => {
  test('should create pipeline steps', () => {
    // Test step creation
  });
  
  test('should execute steps in order', async () => {
    // Test sequential execution
  });
  
  test('should pass context between steps', async () => {
    // Test context passing
  });
  
  test('should handle step failures', async () => {
    // Test failure handling
  });
});
```

#### Controller Tests

```javascript
// workflow/__tests__/controller.test.js
describe('Controller', () => {
  test('should initialize workflow', () => {
    // Test initialization
  });
  
  test('should run complete workflow', async () => {
    // Test end-to-end workflow
  });
  
  test('should manage workflow context', async () => {
    // Test context management
  });
});
```

### 7. Utilities

#### Analysis Utility Tests

```javascript
// utils/__tests__/analysis.test.js
describe('Analysis Utilities', () => {
  test('should update order with analysis', async () => {
    // Test database updates
  });
  
  test('should generate analysis with Claude', async () => {
    // Test AI integration
  });
  
  test('should handle AI service errors', async () => {
    // Test error handling
  });
});
```

#### Common Utility Tests

```javascript
// utils/__tests__/common.test.js
describe('Common Utilities', () => {
  test('should format dates correctly', () => {
    // Test date formatting
  });
  
  test('should sanitize HTML', () => {
    // Test HTML sanitization
  });
  
  test('should normalize text', () => {
    // Test text normalization
  });
});
```

## Integration Testing

Integration tests verify that components work together correctly:

```javascript
// __tests__/integration/extraction_to_knowledge.test.js
describe('Extraction to Knowledge Integration', () => {
  test('should extract and store knowledge', async () => {
    // Test extraction and storage flow
  });
  
  test('should handle conflicts between sources', async () => {
    // Test conflict resolution flow
  });
});
```

## End-to-End Testing

End-to-end tests verify complete workflows:

```javascript
// __tests__/e2e/full_pipeline.test.js
describe('Full Pipeline', () => {
  test('should process an order from fetch to export', async () => {
    // Test complete processing
  });
  
  test('should handle all error conditions', async () => {
    // Test with various error scenarios
  });
});
```

## Test Data Management

### Sample Data Files

Create sample data files for testing:

```
yale-executive-orders/
├── __tests__/
│   ├── fixtures/
│   │   ├── executive_orders/
│   │   │   ├── eo13985.json  // Sample executive order
│   │   │   └── eo14008.json  // Sample executive order
│   │   ├── sources/
│   │   │   ├── federal_register_response.json
│   │   │   └── nih_response.json
│   │   └── expected_outputs/
│   │       ├── extracted_knowledge.json
│   │       └── rendered_templates.json
```

### Test Data Helpers

Create helpers for loading test data:

```javascript
// __tests__/helpers/load_fixtures.js
const fs = require('fs');
const path = require('path');

function loadFixture(fixtureName) {
  const fixturePath = path.join(__dirname, '../fixtures', fixtureName);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

module.exports = { loadFixture };
```

## Continuous Integration

Integrate testing with CI/CD using GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '14'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test
    - name: Upload coverage
      uses: codecov/codecov-action@v2
```

## Best Practices

### Writing Effective Tests

1. **Arrange, Act, Assert**: Structure tests with clear setup, action, and verification
2. **Single Assertion Per Test**: Each test should verify one specific behavior
3. **Descriptive Test Names**: Use names that describe the expected behavior
4. **Independent Tests**: Tests should not depend on each other's state

### Testing Edge Cases

1. **Empty or Null Inputs**: Test with empty strings, null, and undefined values
2. **Boundary Conditions**: Test at the boundaries of valid input ranges
3. **Error Conditions**: Test error handling and recovery
4. **Performance Extremes**: Test with very large inputs or many concurrent operations

### Test Documentation

1. **Test Purpose**: Document why each test exists
2. **Test Data**: Document the significance of test data
3. **Expected Behavior**: Document what constitutes a successful test

## Implementation Plan

### Phase 1: Core Utilities and Models

1. Set up Jest and basic testing infrastructure
2. Implement tests for utility functions
3. Implement tests for data models

### Phase 2: Knowledge and Extraction Components

1. Implement tests for knowledge management system
2. Implement tests for extraction components
3. Implement integration tests for knowledge extraction flow

### Phase 3: Sources and Templates

1. Implement tests for source management
2. Implement tests for template system
3. Implement integration tests for source to template flow

### Phase 4: Workflow and End-to-End

1. Implement tests for workflow pipeline
2. Implement end-to-end tests
3. Integrate with CI/CD

## Conclusion

Following this testing guide will ensure the Yale Executive Orders project maintains high quality and reliability. Regular testing as part of the development process will catch issues early and provide confidence in the system's functionality.