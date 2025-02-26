#!/bin/bash

# Check if the database file exists
if [ ! -f "./executive_orders.db" ]; then
  echo "Database file does not exist. Setting up the database first..."
  node sqlite_setup.js
else
  echo "Database file found. Starting the API server..."
fi

# Start the API server with PORT=3001
PORT=3001 node api_server.js