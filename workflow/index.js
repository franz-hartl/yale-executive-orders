/**
 * index.js
 * 
 * Main entry point for the Yale Executive Orders workflow system.
 * Exports the workflow controller and pipeline components.
 */

const WorkflowController = require('./controller');
const pipeline = require('./pipeline');
const logging = require('./logging');

module.exports = {
  WorkflowController,
  pipeline,
  logging
};