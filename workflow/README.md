# Yale Executive Orders Workflow System

This workflow system provides a structured, automated pipeline for fetching, processing, analyzing, and exporting executive order data for Yale administrators. It follows the "Essential Simplicity" design philosophy, creating a straightforward workflow with clear responsibilities.

## Overview

The workflow system automates the following process:

1. **Fetch**: Collect executive order data from various authoritative sources
2. **Process**: Store and organize data in the SQLite database
3. **Analyze**: Generate Yale-specific plain language summaries and impact assessments
4. **Export**: Create static JSON files for the website
5. **Deploy**: (Optional) Copy files to GitHub Pages directory

## Components

### Core Components

- **Controller**: Manages workflow execution and state tracking
- **Pipeline**: Defines the sequence of steps in the workflow
- **Logging**: Provides structured logging for workflow events
- **Configuration**: Manages settings for all workflow components

### Directory Structure

```
workflow/
  ├── controller.js    # Main workflow controller
  ├── pipeline.js      # Pipeline step definitions
  ├── logging.js       # Workflow-specific logging
  ├── index.js         # Module exports
  └── README.md        # Documentation
config/
  ├── default.js       # Default configuration
  └── index.js         # Configuration loader
```

## Usage

### Basic Usage

Run the standard workflow:

```bash
npm run workflow
```

Or directly:

```bash
node run_workflow.js
```

### Workflow Variants

Run a minimal workflow (fetch, process, export only):

```bash
npm run workflow:minimal
```

Run without saving state:

```bash
npm run workflow:nocache
```

### Command Line Options

The `run_workflow.js` script accepts several command line options:

```
Options:
  -w, --workflow <name>    Specify workflow name (standard, minimal)
                           Default: standard
  -n, --no-save            Don't save workflow state
  -s, --state-file <file>  Specify state file path
                           Default: ./workflow-state.json
  -h, --help               Show this help message
```

## Extending the Workflow

### Adding a New Pipeline Step

1. Create a new class that extends `PipelineStep` in `pipeline.js`:

```javascript
class MyNewStep extends PipelineStep {
  constructor(options = {}) {
    super('my-step-name', options);
  }
  
  async execute(context) {
    try {
      this.logger.info('Starting my new step');
      
      // Implement step logic here
      
      return {
        ...context,
        myStepResults: {
          success: true,
          // Additional data...
        },
        myStepTimestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('My step failed', error);
      throw error;
    }
  }
}
```

2. Add the step to the appropriate pipeline in `pipeline.js`:

```javascript
const customPipeline = [
  new FetchStep(),
  new ProcessStep(),
  new MyNewStep(),  // Add your new step here
  new ExportStep()
];
```

3. Update the `getPipeline` function to return your custom pipeline:

```javascript
function getPipeline(pipelineName = 'standard') {
  switch (pipelineName.toLowerCase()) {
    case 'custom':
      return customPipeline;
    // Other cases...
  }
}
```

### Customizing Configuration

1. Create an environment-specific configuration file in the `config` directory (e.g., `development.js`):

```javascript
module.exports = {
  // Override only the settings you want to change
  logging: {
    level: 'debug'
  },
  sources: {
    nsf: {
      enabled: false
    }
  }
};
```

2. Run with the specific environment:

```bash
NODE_ENV=development npm run workflow
```

## Error Handling

The workflow system provides robust error handling:

- Each step has its own error handling and logging
- Failed required steps stop the workflow
- Failed optional steps are logged but don't stop the workflow
- The workflow state is saved after each step
- Detailed error information is stored in the workflow state

## Workflow State

The workflow maintains state in a JSON file (`workflow-state.json` by default), which includes:

- Overall workflow status
- Per-step execution status and timing
- Error information
- Last run timestamp

This state can be used to resume workflows or analyze performance.

## Logging

The workflow system uses a structured logging approach:

- Each step has its own named logger
- Log messages include step name, timestamp, and level
- Logs are written to the configured log file and console
- Log levels can be configured per environment

## Dependencies

The workflow system depends on the following project files:

- `utils/logger.js` - Base logging functionality
- `config/default.js` - Default configuration
- Existing scripts like `fetch_orders.js`, `database_setup.js`, etc.

## Future Enhancements

Potential enhancements to the workflow system:

1. Add parallel execution of independent steps
2. Implement a checkpoint system for large workflows
3. Add a web dashboard for monitoring workflow status
4. Create a notification system for workflow completion or errors
5. Add support for scheduled workflow runs