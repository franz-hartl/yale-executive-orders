/**
 * source_schema.js
 * 
 * Defines the schema for source metadata and content storage.
 * This schema helps standardize how source data is stored and tracked.
 */

/**
 * Schema for source metadata
 */
const sourceMetadataSchema = {
  // Core source metadata
  id: 'TEXT PRIMARY KEY', // Unique identifier for the source
  name: 'TEXT NOT NULL', // Display name of the source
  description: 'TEXT', // Description of what this source provides
  source_type: 'TEXT NOT NULL', // Type of source (e.g., 'federal_register', 'cogr', 'nsf', 'nih', 'ace', 'yale')
  base_url: 'TEXT', // Base URL for the source's API or website
  
  // Source versioning and update tracking
  version: 'TEXT', // Version of the source data format
  last_fetch_date: 'TIMESTAMP', // When data was last fetched from this source
  last_successful_fetch_date: 'TIMESTAMP', // When data was last successfully fetched
  fetch_frequency_hours: 'INTEGER', // How often this source should be checked (in hours)
  
  // Access configuration
  auth_required: 'INTEGER DEFAULT 0', // Whether authentication is required (0=false, 1=true)
  api_key_required: 'INTEGER DEFAULT 0', // Whether an API key is required (0=false, 1=true)
  
  // Source status
  is_enabled: 'INTEGER DEFAULT 1', // Whether this source is enabled (0=false, 1=true)
  is_primary: 'INTEGER DEFAULT 0', // Whether this is a primary source (0=false, 1=true)
  priority: 'INTEGER DEFAULT 5', // Priority (1-10, 1 being highest)
  
  // Contact information
  contact_info: 'TEXT', // Contact information for the source administrator
  support_url: 'TEXT', // URL for support or documentation
  
  // Additional configuration
  config: 'TEXT', // JSON-encoded configuration for this source
  
  // Error tracking
  error_count: 'INTEGER DEFAULT 0', // Number of consecutive errors
  last_error: 'TEXT', // Last error message
  last_error_date: 'TIMESTAMP' // When the last error occurred
};

/**
 * Schema for source content
 */
const sourceContentSchema = {
  id: 'TEXT PRIMARY KEY', // Unique identifier for this content item
  source_id: 'TEXT NOT NULL', // Reference to source metadata
  order_number: 'TEXT', // Executive order number
  document_number: 'TEXT', // Document identifier
  
  // Content information
  content_type: 'TEXT NOT NULL', // Type of content (e.g., 'order', 'analysis', 'implementation_guide')
  title: 'TEXT', // Title of the content
  fetch_date: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', // When this content was fetched
  content_date: 'TIMESTAMP', // Original publication/update date of the content
  
  // Storage information
  storage_type: 'TEXT NOT NULL', // How the content is stored ('inline', 'file', 'external_url')
  content: 'TEXT', // Content if stored inline (e.g., JSON or text)
  file_path: 'TEXT', // Path to file if stored on disk
  external_url: 'TEXT', // URL to external content if not stored locally
  
  // Content hash for change detection
  content_hash: 'TEXT', // Hash of the content for change detection
  previous_content_hash: 'TEXT', // Previous hash for tracking changes
  
  // Validation information
  is_valid: 'INTEGER DEFAULT 1', // Whether this content is valid (0=false, 1=true)
  validation_message: 'TEXT', // Validation error message if not valid
  
  // Processing status
  processing_status: 'TEXT DEFAULT "pending"', // Status of content processing (pending, processed, failed)
  last_processed_date: 'TIMESTAMP', // When this content was last processed
  
  // References to other content
  parent_id: 'TEXT', // If this is a child of another content item
  references: 'TEXT', // JSON array of other content this references
  
  // Content metadata
  metadata: 'TEXT' // JSON-encoded metadata for this content
};

/**
 * Schema for source versioning
 */
const sourceVersionSchema = {
  id: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  source_id: 'TEXT NOT NULL', // Reference to source metadata
  version_number: 'TEXT NOT NULL', // Version identifier
  version_date: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP', // When this version was created
  change_description: 'TEXT', // Description of what changed
  change_type: 'TEXT', // Type of change (schema, content, configuration)
  changed_by: 'TEXT', // Who made the change
  
  // Reference to previous version
  previous_version_id: 'INTEGER', // Reference to previous version
  
  // Version metadata
  metadata: 'TEXT' // JSON-encoded metadata for this version
};

/**
 * Table relationships
 */
const relationships = {
  source_content: [
    { column: 'source_id', references: 'source_metadata(id)', onDelete: 'CASCADE' }
  ],
  source_version: [
    { column: 'source_id', references: 'source_metadata(id)', onDelete: 'CASCADE' },
    { column: 'previous_version_id', references: 'source_version(id)', onDelete: 'SET NULL' }
  ]
};

module.exports = {
  sourceMetadataSchema,
  sourceContentSchema,
  sourceVersionSchema,
  relationships
};