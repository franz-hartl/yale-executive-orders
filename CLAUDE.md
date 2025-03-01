# Yale Executive Orders Analysis Guide

## Design Philosophy: "Essential Simplicity"
- Prioritize complexity reduction over feature addition
- Flatten nested structures and eliminate unnecessary layers
- Design for universal relevance with natural Yale specificity
- "Do One Thing Well": Create focused modules with clear responsibilities
- "Write Programs to Work Together": Design composable components that can be chained
- "Make Each Program Do One Thing Well": Favor single-purpose tools over monolithic solutions
- Use resources efficiently (AI tokens, computation)
- "Simplicity, Clarity, Generality": Prefer simple solutions that generalize well
- Make maintenance-focused decisions
- Preserve essential value while removing incidental complexity
- Apply schema consistency throughout the pipeline

## Commands
- `node database_setup.js` - Initialize/update SQLite database
- `node generate_plain_summaries.js` - Generate summaries for executive orders
- `node export_to_json.js` - Export DB data to static JSON files 
- `cd docs && npx http-server` - Test static site locally
- `node update_and_deploy.sh` - Update data and deploy to GitHub Pages

## Code Style Guidelines
- Use ES6+ features with CommonJS module system
- Apply flat data structures that minimize nesting and complexity
- "Write Simple Parts Connected by Clean Interfaces": Create modular, composable code
- Error handling: Try/catch blocks with specific error messages
- Prefer async/await over callbacks when possible
- Use consistent camelCase for variables and functions
- Include JSDoc-style comments for functions
- "Make It Clear": Prioritize readable, self-documenting code
- Keep code modular with single-responsibility functions
- Leverage established libraries: sqlite3, axios, cheerio
- Remove institution-specific conditionals in favor of universal approaches
- "Design for Simplicity": Choose simple approaches over clever complexity
- Prioritize maintainability and simplicity in all design decisions