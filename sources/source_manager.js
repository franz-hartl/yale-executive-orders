/**
 * source_manager.js
 * 
 * Central management system for source data in the Yale Executive Orders project.
 * This module handles the registration, tracking, and access to different data sources,
 * ensuring consistent source metadata and versioning.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite3').verbose();
const logger = require('../utils/logger');
const sourceRegistry = require('./source_registry');
const { 
  generateContentHash, 
  hasContentChanged, 
  createVersionRecord, 
  storeContentBackup 
} = require('../utils/source_versioning');
const { 
  sourceMetadataSchema, 
  sourceContentSchema, 
  sourceVersionSchema 
} = require('../models/source_schema');

// Create a named logger
const sourceManagerLogger = logger.createNamedLogger('SourceManager');

/**
 * Source Manager class for handling source data
 */
class SourceManager {
  /**
   * Constructor
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(process.cwd(), 'executive_orders.db');
    this.contentStoragePath = options.contentStoragePath || path.join(process.cwd(), 'data', 'source_content');
    this.sourceRegistry = sourceRegistry;
    this.db = null;
    this.isInitialized = false;
    
    // Create content storage directory if it doesn't exist
    fs.mkdirSync(this.contentStoragePath, { recursive: true });
  }
  
  /**
   * Initialize the source manager and database tables
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      sourceManagerLogger.info('Initializing Source Manager');
      
      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });
      
      // Enable foreign keys
      await this.db.run('PRAGMA foreign_keys = ON');
      
      // Create tables if they don't exist
      await this._createTables();
      
      // Register existing sources from database
      await this._registerExistingSources();
      
      this.isInitialized = true;
      sourceManagerLogger.info('Source Manager initialized successfully');
    } catch (error) {
      sourceManagerLogger.error(`Failed to initialize Source Manager: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Create database tables for source management
   * @returns {Promise<void>}
   * @private
   */
  async _createTables() {
    sourceManagerLogger.info('Creating/verifying database tables');
    
    try {
      // Create source_metadata table
      let columns = Object.entries(sourceMetadataSchema)
        .map(([column, type]) => `${column} ${type}`)
        .join(', ');
      
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS source_metadata (
          ${columns}
        )
      `);
      
      // Create source_content table
      columns = Object.entries(sourceContentSchema)
        .map(([column, type]) => `${column} ${type}`)
        .join(', ');
      
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS source_content (
          ${columns},
          FOREIGN KEY(source_id) REFERENCES source_metadata(id) ON DELETE CASCADE
        )
      `);
      
      // Create source_version table
      columns = Object.entries(sourceVersionSchema)
        .map(([column, type]) => `${column} ${type}`)
        .join(', ');
      
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS source_version (
          ${columns},
          FOREIGN KEY(source_id) REFERENCES source_metadata(id) ON DELETE CASCADE,
          FOREIGN KEY(previous_version_id) REFERENCES source_version(id) ON DELETE SET NULL
        )
      `);
      
      // Create indexes for performance
      await this.db.run('CREATE INDEX IF NOT EXISTS idx_source_content_source_id ON source_content(source_id)');
      await this.db.run('CREATE INDEX IF NOT EXISTS idx_source_content_order_number ON source_content(order_number)');
      await this.db.run('CREATE INDEX IF NOT EXISTS idx_source_content_document_number ON source_content(document_number)');
      await this.db.run('CREATE INDEX IF NOT EXISTS idx_source_version_source_id ON source_version(source_id)');
      
      sourceManagerLogger.info('Database tables created/verified successfully');
    } catch (error) {
      sourceManagerLogger.error(`Failed to create tables: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Register existing sources from the database
   * @returns {Promise<void>}
   * @private
   */
  async _registerExistingSources() {
    try {
      sourceManagerLogger.info('Registering existing sources from database');
      
      // Get all sources from the database
      const sources = await this.db.all('SELECT * FROM source_metadata');
      
      // Register each source with the registry
      for (const source of sources) {
        // Get the adapter class for this source type
        const sourceType = source.source_type;
        let SourceAdapter;
        
        try {
          // Try to dynamically require the adapter class
          SourceAdapter = require(`./${sourceType}_source.js`);
        } catch (error) {
          sourceManagerLogger.warn(`Could not load adapter for source type ${sourceType}: ${error.message}`);
          continue;
        }
        
        // Parse the config if it exists
        const config = source.config ? JSON.parse(source.config) : {};
        
        // Create a new instance of the adapter
        const sourceInstance = new SourceAdapter({
          id: source.id,
          name: source.name,
          description: source.description,
          enabled: source.is_enabled === 1,
          ...config
        });
        
        // Register the source
        this.sourceRegistry.registerSource(sourceInstance);
        sourceManagerLogger.info(`Registered existing source: ${source.name} (${source.id})`);
      }
      
      const registeredCount = this.sourceRegistry.getAllSources().length;
      sourceManagerLogger.info(`Registered ${registeredCount} existing sources`);
    } catch (error) {
      sourceManagerLogger.error(`Failed to register existing sources: ${error.message}`, error);
      // Don't throw - we can continue without existing sources
    }
  }
  
  /**
   * Register a new source
   * @param {string} sourceType Type of source (e.g., 'federal_register', 'cogr', 'nsf')
   * @param {Object} sourceConfig Configuration for the source
   * @returns {Promise<string>} ID of the registered source
   */
  async registerSource(sourceType, sourceConfig) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      sourceManagerLogger.info(`Registering new source of type ${sourceType}`);
      
      // Generate a unique ID for the source
      const sourceId = crypto.randomUUID();
      
      // Create source metadata record
      const now = new Date().toISOString();
      const configJson = JSON.stringify(sourceConfig);
      
      await this.db.run(
        `INSERT INTO source_metadata (
          id, name, description, source_type, base_url,
          version, last_fetch_date, fetch_frequency_hours,
          auth_required, api_key_required, is_enabled, is_primary,
          priority, config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sourceId,
          sourceConfig.name || `${sourceType.toUpperCase()} Source`,
          sourceConfig.description || `Source adapter for ${sourceType}`,
          sourceType,
          sourceConfig.baseUrl || '',
          '1.0.0',
          now,
          sourceConfig.fetchFrequencyHours || 24,
          sourceConfig.authRequired ? 1 : 0,
          sourceConfig.apiKeyRequired ? 1 : 0,
          sourceConfig.enabled !== false ? 1 : 0,
          sourceConfig.isPrimary ? 1 : 0,
          sourceConfig.priority || 5,
          configJson
        ]
      );
      
      // Create initial version record
      await createVersionRecord(
        this.db,
        sourceId,
        '1.0.0',
        'Initial source registration',
        'configuration',
        { config: sourceConfig }
      );
      
      // Try to instantiate and register the source adapter
      try {
        const SourceAdapter = require(`./${sourceType}_source.js`);
        const sourceInstance = new SourceAdapter({
          id: sourceId,
          ...sourceConfig
        });
        
        this.sourceRegistry.registerSource(sourceInstance);
      } catch (adapterError) {
        sourceManagerLogger.warn(`Could not instantiate adapter for source ${sourceType}: ${adapterError.message}`);
        // Continue even if adapter registration fails - we can try again later
      }
      
      sourceManagerLogger.info(`Successfully registered source with ID ${sourceId}`);
      return sourceId;
    } catch (error) {
      sourceManagerLogger.error(`Failed to register source: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Update source configuration
   * @param {string} sourceId ID of the source to update
   * @param {Object} updates Updates to apply
   * @returns {Promise<boolean>} Whether the update was successful
   */
  async updateSourceConfig(sourceId, updates) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      sourceManagerLogger.info(`Updating configuration for source ${sourceId}`);
      
      // Get current source metadata
      const source = await this.db.get('SELECT * FROM source_metadata WHERE id = ?', [sourceId]);
      
      if (!source) {
        sourceManagerLogger.warn(`Source with ID ${sourceId} not found`);
        return false;
      }
      
      // Parse current config
      const currentConfig = source.config ? JSON.parse(source.config) : {};
      
      // Create updated config
      const updatedConfig = { ...currentConfig, ...updates };
      const configJson = JSON.stringify(updatedConfig);
      
      // Calculate version changes
      const previousVersion = source.version || '1.0.0';
      const versionChange = updates.majorChange ? 'major' : (updates.minorChange ? 'minor' : 'patch');
      const newVersion = require('../utils/source_versioning').generateVersionNumber(previousVersion, versionChange);
      
      // Update the source metadata
      await this.db.run(
        `UPDATE source_metadata SET
          name = ?,
          description = ?,
          base_url = ?,
          version = ?,
          fetch_frequency_hours = ?,
          auth_required = ?,
          api_key_required = ?,
          is_enabled = ?,
          is_primary = ?,
          priority = ?,
          config = ?,
          contact_info = ?,
          support_url = ?
        WHERE id = ?`,
        [
          updates.name || source.name,
          updates.description || source.description,
          updates.baseUrl || source.base_url,
          newVersion,
          updates.fetchFrequencyHours || source.fetch_frequency_hours,
          updates.authRequired !== undefined ? (updates.authRequired ? 1 : 0) : source.auth_required,
          updates.apiKeyRequired !== undefined ? (updates.apiKeyRequired ? 1 : 0) : source.api_key_required,
          updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : source.is_enabled,
          updates.isPrimary !== undefined ? (updates.isPrimary ? 1 : 0) : source.is_primary,
          updates.priority || source.priority,
          configJson,
          updates.contactInfo || source.contact_info,
          updates.supportUrl || source.support_url,
          sourceId
        ]
      );
      
      // Create version record
      await createVersionRecord(
        this.db,
        sourceId,
        newVersion,
        updates.changeDescription || 'Configuration update',
        'configuration',
        { updates }
      );
      
      // Update the source in the registry if it's registered
      const registeredSource = this.sourceRegistry.getSource(sourceId);
      if (registeredSource) {
        // Update basic properties
        if (updates.name) registeredSource.name = updates.name;
        if (updates.description) registeredSource.description = updates.description;
        if (updates.enabled !== undefined) {
          updates.enabled ? registeredSource.enable() : registeredSource.disable();
        }
        
        // Update options
        registeredSource.options = { ...registeredSource.options, ...updates };
      }
      
      sourceManagerLogger.info(`Successfully updated source ${sourceId} to version ${newVersion}`);
      return true;
    } catch (error) {
      sourceManagerLogger.error(`Failed to update source config: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Store content from a source
   * @param {string} sourceId ID of the source
   * @param {Object} content Content to store
   * @param {Object} options Storage options
   * @returns {Promise<string>} ID of the stored content
   */
  async storeSourceContent(sourceId, content, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      // Generate a content ID if not provided
      const contentId = options.contentId || crypto.randomUUID();
      sourceManagerLogger.info(`Storing content ${contentId} from source ${sourceId}`);
      
      // Determine storage type and prepare content
      const storageType = options.storageType || 'inline';
      let storedContent = '';
      let filePath = '';
      let externalUrl = '';
      
      // Generate content hash for change detection
      const contentHash = generateContentHash(content);
      
      // Check if content already exists
      const existingContent = await this.db.get(
        'SELECT * FROM source_content WHERE id = ?',
        [contentId]
      );
      
      // If content exists, check if it has changed
      if (existingContent) {
        const changed = hasContentChanged(contentHash, existingContent.content_hash);
        
        if (!changed && !options.forceUpdate) {
          sourceManagerLogger.info(`Content ${contentId} has not changed, skipping update`);
          return contentId;
        }
        
        // Store backup of previous content if it has changed
        if (changed) {
          let previousContent;
          
          if (existingContent.storage_type === 'inline') {
            previousContent = existingContent.content;
          } else if (existingContent.storage_type === 'file') {
            try {
              previousContent = fs.readFileSync(existingContent.file_path, 'utf8');
            } catch (readError) {
              sourceManagerLogger.warn(`Could not read previous content from file: ${readError.message}`);
            }
          }
          
          if (previousContent) {
            storeContentBackup(
              sourceId,
              contentId,
              previousContent,
              existingContent.content_hash.substr(0, 8)
            );
          }
        }
      }
      
      // Handle different storage types
      switch (storageType) {
        case 'file':
          // Store content in a file
          const contentDir = path.join(this.contentStoragePath, sourceId);
          fs.mkdirSync(contentDir, { recursive: true });
          
          // Create filename with content ID and timestamp
          const timestamp = new Date().toISOString().replace(/:/g, '-');
          const filename = `${contentId}_${timestamp}.json`;
          filePath = path.join(contentDir, filename);
          
          // Write content to file
          const contentString = typeof content === 'object' 
            ? JSON.stringify(content, null, 2) 
            : content;
          
          fs.writeFileSync(filePath, contentString);
          break;
        
        case 'external_url':
          // Store URL to external content
          externalUrl = options.externalUrl || '';
          break;
        
        case 'inline':
        default:
          // Store content inline
          storedContent = typeof content === 'object' 
            ? JSON.stringify(content) 
            : content;
          break;
      }
      
      // Prepare metadata
      const metadataJson = options.metadata 
        ? JSON.stringify(options.metadata) 
        : '{}';
      
      // Get date from content or use current date
      const contentDate = options.contentDate || new Date().toISOString();
      
      // Insert or update content record
      if (existingContent) {
        await this.db.run(
          `UPDATE source_content SET
            source_id = ?,
            order_number = ?,
            document_number = ?,
            content_type = ?,
            title = ?,
            fetch_date = CURRENT_TIMESTAMP,
            content_date = ?,
            storage_type = ?,
            content = ?,
            file_path = ?,
            external_url = ?,
            content_hash = ?,
            previous_content_hash = ?,
            is_valid = ?,
            validation_message = ?,
            processing_status = ?,
            parent_id = ?,
            references = ?,
            metadata = ?
          WHERE id = ?`,
          [
            sourceId,
            options.orderNumber || existingContent.order_number,
            options.documentNumber || existingContent.document_number,
            options.contentType || existingContent.content_type,
            options.title || existingContent.title,
            contentDate,
            storageType,
            storedContent,
            filePath,
            externalUrl,
            contentHash,
            existingContent.content_hash, // Store previous hash
            options.isValid !== undefined ? (options.isValid ? 1 : 0) : 1,
            options.validationMessage || '',
            options.processingStatus || 'pending',
            options.parentId || existingContent.parent_id,
            options.references ? JSON.stringify(options.references) : existingContent.references,
            metadataJson,
            contentId
          ]
        );
      } else {
        await this.db.run(
          `INSERT INTO source_content (
            id, source_id, order_number, document_number, content_type,
            title, content_date, storage_type, content, file_path,
            external_url, content_hash, is_valid, validation_message,
            processing_status, parent_id, references, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contentId,
            sourceId,
            options.orderNumber || null,
            options.documentNumber || null,
            options.contentType || 'unknown',
            options.title || '',
            contentDate,
            storageType,
            storedContent,
            filePath,
            externalUrl,
            contentHash,
            options.isValid !== undefined ? (options.isValid ? 1 : 0) : 1,
            options.validationMessage || '',
            options.processingStatus || 'pending',
            options.parentId || null,
            options.references ? JSON.stringify(options.references) : '[]',
            metadataJson
          ]
        );
      }
      
      sourceManagerLogger.info(`Successfully stored content ${contentId} from source ${sourceId}`);
      return contentId;
    } catch (error) {
      sourceManagerLogger.error(`Failed to store source content: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Retrieve content from a source
   * @param {string} contentId ID of the content to retrieve
   * @returns {Promise<Object>} Content and metadata
   */
  async getSourceContent(contentId) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      sourceManagerLogger.info(`Retrieving content ${contentId}`);
      
      // Get content record
      const contentRecord = await this.db.get(
        'SELECT * FROM source_content WHERE id = ?',
        [contentId]
      );
      
      if (!contentRecord) {
        sourceManagerLogger.warn(`Content with ID ${contentId} not found`);
        return null;
      }
      
      // Get source metadata
      const source = await this.db.get(
        'SELECT * FROM source_metadata WHERE id = ?',
        [contentRecord.source_id]
      );
      
      // Retrieve content based on storage type
      let content;
      
      switch (contentRecord.storage_type) {
        case 'file':
          // Read from file
          try {
            const fileContent = fs.readFileSync(contentRecord.file_path, 'utf8');
            try {
              // Try to parse as JSON
              content = JSON.parse(fileContent);
            } catch (parseError) {
              // If not JSON, return as string
              content = fileContent;
            }
          } catch (fileError) {
            sourceManagerLogger.error(`Failed to read content file: ${fileError.message}`);
            return null;
          }
          break;
        
        case 'external_url':
          // Return the URL and let caller handle retrieval
          content = { 
            url: contentRecord.external_url,
            note: 'Content stored at external URL. Use the URL to retrieve it.'
          };
          break;
        
        case 'inline':
        default:
          // Parse inline content if it's JSON
          try {
            content = JSON.parse(contentRecord.content);
          } catch (parseError) {
            // If not JSON, return as string
            content = contentRecord.content;
          }
          break;
      }
      
      // Parse metadata
      let metadata = {};
      try {
        metadata = JSON.parse(contentRecord.metadata);
      } catch (metadataError) {
        sourceManagerLogger.warn(`Could not parse content metadata: ${metadataError.message}`);
      }
      
      // Parse references
      let references = [];
      try {
        references = contentRecord.references ? JSON.parse(contentRecord.references) : [];
      } catch (referencesError) {
        sourceManagerLogger.warn(`Could not parse content references: ${referencesError.message}`);
      }
      
      // Compile result
      const result = {
        id: contentRecord.id,
        sourceId: contentRecord.source_id,
        sourceName: source ? source.name : 'Unknown',
        orderNumber: contentRecord.order_number,
        documentNumber: contentRecord.document_number,
        contentType: contentRecord.content_type,
        title: contentRecord.title,
        fetchDate: contentRecord.fetch_date,
        contentDate: contentRecord.content_date,
        storageType: contentRecord.storage_type,
        filePath: contentRecord.file_path,
        externalUrl: contentRecord.external_url,
        contentHash: contentRecord.content_hash,
        isValid: contentRecord.is_valid === 1,
        validationMessage: contentRecord.validation_message,
        processingStatus: contentRecord.processing_status,
        parentId: contentRecord.parent_id,
        references,
        metadata,
        content
      };
      
      sourceManagerLogger.info(`Successfully retrieved content ${contentId}`);
      return result;
    } catch (error) {
      sourceManagerLogger.error(`Failed to retrieve source content: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Search for source content
   * @param {Object} criteria Search criteria
   * @param {Object} options Search options
   * @returns {Promise<Array>} Matching content records
   */
  async searchSourceContent(criteria = {}, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      sourceManagerLogger.info('Searching for source content');
      
      // Build WHERE clauses
      const whereClauses = [];
      const params = [];
      
      if (criteria.sourceId) {
        whereClauses.push('c.source_id = ?');
        params.push(criteria.sourceId);
      }
      
      if (criteria.orderNumber) {
        whereClauses.push('c.order_number = ?');
        params.push(criteria.orderNumber);
      }
      
      if (criteria.documentNumber) {
        whereClauses.push('c.document_number = ?');
        params.push(criteria.documentNumber);
      }
      
      if (criteria.contentType) {
        whereClauses.push('c.content_type = ?');
        params.push(criteria.contentType);
      }
      
      if (criteria.title) {
        whereClauses.push('c.title LIKE ?');
        params.push(`%${criteria.title}%`);
      }
      
      if (criteria.isValid !== undefined) {
        whereClauses.push('c.is_valid = ?');
        params.push(criteria.isValid ? 1 : 0);
      }
      
      if (criteria.processingStatus) {
        whereClauses.push('c.processing_status = ?');
        params.push(criteria.processingStatus);
      }
      
      // Add content date range if provided
      if (criteria.fromDate) {
        whereClauses.push('c.content_date >= ?');
        params.push(criteria.fromDate);
      }
      
      if (criteria.toDate) {
        whereClauses.push('c.content_date <= ?');
        params.push(criteria.toDate);
      }
      
      // Build the query
      let query = `
        SELECT 
          c.*,
          m.name AS source_name,
          m.source_type
        FROM 
          source_content c
        LEFT JOIN 
          source_metadata m ON c.source_id = m.id
      `;
      
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      // Add ordering
      query += ` ORDER BY ${options.orderBy || 'c.fetch_date DESC'}`;
      
      // Add limit and offset
      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
        
        if (options.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }
      
      // Execute the query
      const results = await this.db.all(query, params);
      
      sourceManagerLogger.info(`Found ${results.length} matching content records`);
      
      // Process results
      return results.map(record => ({
        id: record.id,
        sourceId: record.source_id,
        sourceName: record.source_name,
        sourceType: record.source_type,
        orderNumber: record.order_number,
        documentNumber: record.document_number,
        contentType: record.content_type,
        title: record.title,
        fetchDate: record.fetch_date,
        contentDate: record.content_date,
        storageType: record.storage_type,
        isValid: record.is_valid === 1,
        processingStatus: record.processing_status,
        // Don't include actual content for search results to keep response small
        contentAvailable: Boolean(record.content || record.file_path || record.external_url)
      }));
    } catch (error) {
      sourceManagerLogger.error(`Failed to search source content: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Record source fetch attempt
   * @param {string} sourceId ID of the source
   * @param {boolean} success Whether the fetch was successful
   * @param {string} error Error message if fetch failed
   * @returns {Promise<void>}
   */
  async recordSourceFetch(sourceId, success, error = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      const now = new Date().toISOString();
      
      if (success) {
        // Update successful fetch
        await this.db.run(
          `UPDATE source_metadata SET 
            last_fetch_date = ?, 
            last_successful_fetch_date = ?,
            error_count = 0,
            last_error = NULL,
            last_error_date = NULL
          WHERE id = ?`,
          [now, now, sourceId]
        );
        
        sourceManagerLogger.info(`Recorded successful fetch for source ${sourceId}`);
      } else {
        // Update failed fetch
        await this.db.run(
          `UPDATE source_metadata SET 
            last_fetch_date = ?, 
            error_count = error_count + 1,
            last_error = ?,
            last_error_date = ?
          WHERE id = ?`,
          [now, error || 'Unknown error', now, sourceId]
        );
        
        sourceManagerLogger.warn(`Recorded failed fetch for source ${sourceId}: ${error || 'Unknown error'}`);
      }
    } catch (error) {
      sourceManagerLogger.error(`Failed to record source fetch: ${error.message}`, error);
      // Don't throw - recording fetch status shouldn't stop processing
    }
  }
  
  /**
   * Get all registered sources
   * @param {boolean} includeDisabled Whether to include disabled sources
   * @returns {Promise<Array>} Array of source metadata
   */
  async getAllSources(includeDisabled = false) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    try {
      let query = 'SELECT * FROM source_metadata';
      
      if (!includeDisabled) {
        query += ' WHERE is_enabled = 1';
      }
      
      query += ' ORDER BY priority ASC, name ASC';
      
      const sources = await this.db.all(query);
      
      // Parse config for each source
      return sources.map(source => ({
        ...source,
        config: source.config ? JSON.parse(source.config) : {},
        isEnabled: source.is_enabled === 1,
        isPrimary: source.is_primary === 1,
        authRequired: source.auth_required === 1,
        apiKeyRequired: source.api_key_required === 1
      }));
    } catch (error) {
      sourceManagerLogger.error(`Failed to get all sources: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      try {
        await this.db.close();
        this.db = null;
        this.isInitialized = false;
        sourceManagerLogger.info('Source Manager database connection closed');
      } catch (error) {
        sourceManagerLogger.error(`Failed to close database connection: ${error.message}`);
      }
    }
  }
}

// Create singleton instance
const sourceManager = new SourceManager();

module.exports = sourceManager;