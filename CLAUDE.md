# Yale Executive Orders Analysis Guide

## Design Philosophy: "Essential Simplicity"
- Prioritize complexity reduction over feature addition
- Flatten nested structures and eliminate unnecessary layers
- Design for universal relevance with natural Yale specificity
- "Do One Thing Well": Create focused modules with clear responsibilities
- "Write Programs to Work Together": Design composable components that can be chained
- "Make Each Program Do One Thing Well": Favor single-purpose tools over monolithic solutions
- "Configuration over Hardcoding": Use central configuration files for changeable aspects
- "Divide and Conquer": Break large problems (like long texts) into smaller, manageable pieces
- Use resources efficiently (AI tokens, computation)
- "Simplicity, Clarity, Generality": Prefer simple solutions that generalize well
- Make maintenance-focused decisions
- Preserve essential value while removing incidental complexity
- Apply schema consistency throughout the pipeline
- "Test-Driven Quality": Write tests that validate both correctness and design principles
- "Stay Within Scope": Build only what is requested, maintain focus on the task at hand

## Commands
- `npm run setup` - Initialize/update SQLite database
- `npm run export` - Export DB data to static JSON files 
- `npm run scrape` - Run the AI-powered web scraper
- `npm run docs:server` - Test static site locally
- `npm run test` - Run all Jest tests
- `npm test -- -t "pattern"` - Run tests matching pattern
- `npm test -- path/to/test.js` - Run specific test file
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:scraper` - Run scraper configuration tests
- `npm run lint` - Run ESLint on codebase

## Code Style Guidelines
- Use ES6+ features with CommonJS module system
- Apply flat data structures that minimize nesting and complexity
- "Write Simple Parts Connected by Clean Interfaces": Create modular, composable code
- Error handling: Try/catch blocks with contextual error messages
- Prefer async/await over callbacks when possible
- Use consistent camelCase for variables and functions
- Include JSDoc-style comments for functions
- "Make It Clear": Prioritize readable, self-documenting code
- Keep code modular with single-responsibility functions
- Write tests for all new functionality with meaningful assertions
- Use jest.mock() for mocking dependencies in tests
- Follow AAA pattern in tests: Arrange, Act, Assert
- Leverage established libraries: sqlite3, axios, cheerio
- "Design for Simplicity": Choose simple approaches over clever complexity
- Prioritize maintainability and simplicity in all design decisions