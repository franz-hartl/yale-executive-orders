/**
 * db.js
 * 
 * Shared database utilities for the Yale Executive Orders project
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '..', 'executive_orders.db');

/**
 * Creates and returns a database connection
 * @returns {sqlite3.Database} Database connection object
 */
function getDbConnection() {
  return new sqlite3.Database(dbPath);
}

/**
 * Promisified database run operation
 * @param {sqlite3.Database} db Database connection
 * @param {string} sql SQL query
 * @param {Array} params Query parameters
 * @returns {Promise} Promise resolving to the result
 */
function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * Promisified database get operation (returns single row)
 * @param {sqlite3.Database} db Database connection
 * @param {string} sql SQL query
 * @param {Array} params Query parameters
 * @returns {Promise} Promise resolving to the row
 */
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Promisified database all operation (returns multiple rows)
 * @param {sqlite3.Database} db Database connection
 * @param {string} sql SQL query
 * @param {Array} params Query parameters
 * @returns {Promise} Promise resolving to the rows
 */
function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Safely closes a database connection
 * @param {sqlite3.Database} db Database connection
 * @returns {Promise} Promise that resolves when connection is closed
 */
function closeDbConnection(db) {
  return new Promise((resolve, reject) => {
    db.close(err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  getDbConnection,
  dbRun,
  dbGet,
  dbAll,
  closeDbConnection
};