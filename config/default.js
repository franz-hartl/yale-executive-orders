/**
 * default.js
 * 
 * Default configuration for the Yale Executive Orders workflow system.
 * This file defines settings and parameters for various workflow components.
 */

module.exports = {
  // Database settings
  database: {
    path: 'executive_orders.db',
    backupEnabled: true,
    backupInterval: 86400000, // 24 hours in milliseconds
    backupPath: './backups/'
  },
  
  // Workflow settings
  workflow: {
    // Default steps in the workflow pipeline
    defaultSteps: [
      'fetch',
      'process',
      'analyze',
      'export'
    ],
    
    // Retry settings
    maxRetries: 3,
    retryDelay: 5000, // milliseconds
    
    // Throttling to prevent API rate limiting
    throttleDelay: 1000 // milliseconds between API calls
  },
  
  // Source settings
  sources: {
    // Federal Register settings
    federalRegister: {
      enabled: true,
      baseUrl: 'https://www.federalregister.gov/api/v1'
    },
    
    // Council on Governmental Relations (COGR)
    cogr: {
      enabled: true,
      updateFrequency: 'weekly'
    },
    
    // National Science Foundation (NSF)
    nsf: {
      enabled: true,
      updateFrequency: 'weekly'
    },
    
    // National Institutes of Health (NIH)
    nih: {
      enabled: true,
      updateFrequency: 'weekly'
    },
    
    // American Council on Education (ACE)
    ace: {
      enabled: true,
      updateFrequency: 'weekly'
    }
  },
  
  // Analysis settings
  analysis: {
    // Claude API settings
    claude: {
      enabled: true,
      maxTokens: 100000,
      temperature: 0.0,
      useCache: true,
      cacheExpiration: 604800000 // 7 days in milliseconds
    },
    
    // Summary types to generate
    summaryTypes: [
      'executive_brief',
      'standard_summary',
      'comprehensive_analysis'
    ]
  },
  
  // Export settings
  export: {
    // Output paths
    paths: {
      jsonOutput: './public/data/',
      siteOutput: './docs/data/'
    },
    
    // Files to export
    files: [
      'executive_orders.json',
      'categories.json',
      'impact_areas.json',
      'university_impact_areas.json',
      'yale_impact_areas.json',
      'yale_stakeholders.json',
      'statistics.json',
      'metadata.json'
    ],
    
    // Format settings
    prettyPrint: true,
    includeSources: true
  },
  
  // Logging settings
  logging: {
    level: 'info',          // error, warn, info, debug
    file: './workflow.log', // Log to this file
    console: true,          // Also log to console
    format: 'detailed',     // simple, detailed
    includeTimestamp: true
  },
  
  // Yale-specific settings
  yale: {
    enabledDepartments: [
      'Office of the President',
      'Office of the Provost',
      'General Counsel',
      'Office of Research Administration',
      'Finance & Administration',
      'Human Resources',
      'Student Affairs',
      'International Affairs',
      'Yale College',
      'Graduate School',
      'Yale School of Medicine',
      'Yale Arts & Museums'
    ],
    
    // Yale-specific impact domains to analyze
    impactDomains: [
      'Research Compliance',
      'Financial Operations',
      'Academic Programs',
      'International Programs',
      'Student Services',
      'Employment Practices',
      'Campus Operations'
    ]
  }
};