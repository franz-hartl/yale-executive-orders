#!/usr/bin/env node

/**
 * run_workflow.js
 * 
 * Command-line interface to run the Yale Executive Orders workflow.
 * This script provides a simple way to execute the workflow with various options.
 */

const { WorkflowController } = require('./workflow');
const config = require('./config');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  name: 'standard',
  saveStateEnabled: true,
  stateFile: './workflow-state.json'
};

// Process command line arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--workflow' || arg === '-w') {
    options.name = args[++i] || 'standard';
  } else if (arg === '--no-save' || arg === '-n') {
    options.saveStateEnabled = false;
  } else if (arg === '--state-file' || arg === '-s') {
    options.stateFile = args[++i] || options.stateFile;
  } else if (arg === '--help' || arg === '-h') {
    printHelp();
    process.exit(0);
  }
}

// Print help message
function printHelp() {
  console.log(`
Yale Executive Orders Workflow Runner

Usage: node run_workflow.js [options]

Options:
  -w, --workflow <name>    Specify workflow name (standard, minimal)
                           Default: standard
  -n, --no-save            Don't save workflow state
  -s, --state-file <file>  Specify state file path
                           Default: ./workflow-state.json
  -h, --help               Show this help message

Examples:
  node run_workflow.js
  node run_workflow.js --workflow minimal
  node run_workflow.js -w standard -s ./custom-state.json
  `);
}

// Display startup information
console.log(`
Yale Executive Orders Workflow Runner
----------------------------------------------
Workflow: ${options.name}
State File: ${options.saveStateEnabled ? options.stateFile : 'disabled'}
Log Level: ${config.logging.level}
`);

// Create and execute the workflow
async function runWorkflow() {
  try {
    const controller = new WorkflowController(options);
    await controller.initialize();
    
    console.log('Starting workflow execution...');
    const result = await controller.execute();
    
    if (result.success) {
      const summary = controller.getSummary();
      console.log('\nWorkflow completed successfully!');
      console.log('Summary:');
      console.log(`- Total Steps: ${summary.steps.total}`);
      console.log(`- Completed: ${summary.steps.completed}`);
      console.log(`- Failed: ${summary.steps.failed}`);
      console.log(`- Pending: ${summary.steps.pending}`);
      
      console.log('\nStep Details:');
      summary.stepSummaries.forEach(step => {
        const statusIcon = step.status === 'completed' ? '✓' : 
                           step.status === 'failed' ? '✗' : '○';
        console.log(`${statusIcon} ${step.name}: ${step.status} ${step.duration ? `(${step.duration})` : ''}`);
      });
    } else {
      console.error('\nWorkflow failed:');
      console.error(`- Error: ${result.error}`);
      console.error(`- Failed Step: ${controller.getState().currentStep}`);
    }
  } catch (error) {
    console.error('Workflow execution error:', error);
    process.exit(1);
  }
}

// Run the workflow
runWorkflow().catch(error => {
  console.error('Uncaught error:', error);
  process.exit(1);
});