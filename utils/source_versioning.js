/**
 * source_versioning.js
 * 
 * Utilities for tracking and managing source versions, including
 * functions for creating new versions, comparing contents, and
 * managing source version history.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Create a named logger
const versionLogger = logger.createJobLogger('SourceVersioning');

/**
 * Generate a hash for content to detect changes
 * @param {string|Object} content Content to hash (string or object)
 * @returns {string} SHA-256 hash of the content
 */
function generateContentHash(content) {
  let contentString = content;
  
  // If content is an object, convert to JSON string
  if (typeof content === 'object') {
    contentString = JSON.stringify(content);
  }
  
  // Create SHA-256 hash
  return crypto
    .createHash('sha256')
    .update(contentString)
    .digest('hex');
}

/**
 * Check if content has changed by comparing hashes
 * @param {string} newHash Hash of new content
 * @param {string} oldHash Hash of old content
 * @returns {boolean} True if content has changed
 */
function hasContentChanged(newHash, oldHash) {
  // If either hash is missing, consider it changed
  if (!newHash || !oldHash) {
    return true;
  }
  
  return newHash !== oldHash;
}

/**
 * Create a version record for a source update
 * @param {Object} db Database connection
 * @param {string} sourceId ID of the source
 * @param {string} versionNumber Version number for this update
 * @param {string} changeDescription Description of what changed
 * @param {string} changeType Type of change (schema, content, configuration)
 * @param {Object} metadata Additional metadata for this version
 * @returns {Promise<number>} ID of the created version record
 */
async function createVersionRecord(db, sourceId, versionNumber, changeDescription, changeType, metadata = {}) {
  try {
    // Get the most recent version for this source
    const previousVersion = await db.get(
      'SELECT id FROM source_version WHERE source_id = ? ORDER BY version_date DESC LIMIT 1',
      [sourceId]
    );
    
    const previousVersionId = previousVersion ? previousVersion.id : null;
    const metadataString = JSON.stringify(metadata);
    
    // Insert the new version record
    const result = await db.run(
      `INSERT INTO source_version (
        source_id, version_number, change_description, change_type, 
        previous_version_id, changed_by, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sourceId, versionNumber, changeDescription, changeType, previousVersionId, 'system', metadataString]
    );
    
    versionLogger.info(`Created version record ${versionNumber} for source ${sourceId}`);
    return result.lastID;
  } catch (error) {
    versionLogger.error(`Failed to create version record: ${error.message}`, error);
    throw error;
  }
}

/**
 * Store a backup copy of source content
 * @param {string} sourceId ID of the source
 * @param {string} contentId ID of the content
 * @param {string|Object} content Content to back up
 * @param {string} versionNumber Version number
 * @returns {string} Path to backup file
 */
function storeContentBackup(sourceId, contentId, content, versionNumber) {
  try {
    // Ensure backup directory exists
    const backupDir = path.join(process.cwd(), 'backups', 'sources', sourceId);
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupFilename = `${contentId}_${versionNumber}_${timestamp}.json`;
    const backupPath = path.join(backupDir, backupFilename);
    
    // Convert content to string if it's an object
    const contentString = typeof content === 'object' 
      ? JSON.stringify(content, null, 2) 
      : content;
    
    // Write to backup file
    fs.writeFileSync(backupPath, contentString);
    
    versionLogger.info(`Stored backup of content ${contentId} at ${backupPath}`);
    return backupPath;
  } catch (error) {
    versionLogger.error(`Failed to store content backup: ${error.message}`, error);
    // Don't throw, just return null - backup failure shouldn't stop processing
    return null;
  }
}

/**
 * Get version history for a source
 * @param {Object} db Database connection
 * @param {string} sourceId ID of the source
 * @param {number} limit Maximum number of versions to retrieve (default 10)
 * @returns {Promise<Array>} Array of version records
 */
async function getVersionHistory(db, sourceId, limit = 10) {
  try {
    const versions = await db.all(
      `SELECT * FROM source_version 
       WHERE source_id = ? 
       ORDER BY version_date DESC 
       LIMIT ?`,
      [sourceId, limit]
    );
    
    return versions;
  } catch (error) {
    versionLogger.error(`Failed to get version history: ${error.message}`, error);
    throw error;
  }
}

/**
 * Generate a new version number based on the previous version
 * @param {string} previousVersion Previous version number (e.g., "1.2.3")
 * @param {string} changeType Type of change (major, minor, patch)
 * @returns {string} New version number
 */
function generateVersionNumber(previousVersion = '0.0.0', changeType = 'patch') {
  // Parse the previous version
  const versionParts = previousVersion.split('.').map(Number);
  
  // Default to 0.0.0 if the version can't be parsed
  const major = versionParts[0] || 0;
  const minor = versionParts[1] || 0;
  const patch = versionParts[2] || 0;
  
  // Update the version based on the change type
  switch (changeType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

module.exports = {
  generateContentHash,
  hasContentChanged,
  createVersionRecord,
  storeContentBackup,
  getVersionHistory,
  generateVersionNumber
};