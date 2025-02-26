require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

// Get the mode from command-line arguments (default to 'full')
const mode = process.argv[2] || 'full';

// Choose the server file based on the mode
const serverFile = mode === 'simple' ? 'simplified_server.js' : 'mcp_server.js';

console.log(`Starting Yale Executive Order Analysis server in ${mode} mode...`);

// Spawn the server process
const server = spawn('node', [path.join(__dirname, serverFile)], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle process exit
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill('SIGINT');
  process.exit(0);
});