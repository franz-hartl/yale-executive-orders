/**
 * ai_cache.js
 * 
 * Provides filesystem-based caching for AI API calls to reduce costs,
 * improve performance, and avoid hitting rate limits.
 */

const fs = require('fs');
const path = require('path');
const { generateContentHash } = require('./source_versioning');
const { ensureDirectoryExists } = require('./common');
const logger = require('./logger');
const config = require('../config');

// Create a named logger for the AI cache
const cacheLogger = logger.createNamedLogger('AICache');

class AICache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'cache', 'ai_responses');
    this.enabled = options.enabled !== undefined ? options.enabled : config.analysis.claude.useCache;
    this.expirationMs = options.expirationMs || config.analysis.claude.cacheExpiration;
    
    // Create cache directory if it doesn't exist
    ensureDirectoryExists(this.cacheDir);
    
    cacheLogger.info(`AI cache ${this.enabled ? 'enabled' : 'disabled'}, expiration: ${this.expirationMs / (1000 * 60 * 60)} hours`);
  }

  /**
   * Gets a cache key for a given request
   * @param {Object} request AI API request data
   * @returns {string} Cache key
   */
  getCacheKey(request) {
    // Generate a hash of the prompt, model, and other relevant parameters
    const relevantParams = {
      model: request.model,
      prompt: request.messages?.length ? request.messages[0].content : '',
      system: request.system,
      temperature: request.temperature
    };
    
    return generateContentHash(relevantParams);
  }

  /**
   * Gets the path for a cache file
   * @param {string} cacheKey The cache key
   * @returns {string} Path to the cache file
   */
  getCacheFilePath(cacheKey) {
    return path.join(this.cacheDir, `${cacheKey}.json`);
  }

  /**
   * Checks if a response is cached for a given request
   * @param {Object} request AI API request data
   * @returns {Object|null} Cached response or null if not found or expired
   */
  getCachedResponse(request) {
    if (!this.enabled) {
      return null;
    }
    
    try {
      const cacheKey = this.getCacheKey(request);
      const cacheFilePath = this.getCacheFilePath(cacheKey);
      
      if (!fs.existsSync(cacheFilePath)) {
        // Track cache miss
        this._trackCacheMiss(cacheKey);
        return null;
      }
      
      const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      
      // Check if cache is expired
      const now = Date.now();
      if (now - cacheData.timestamp > this.expirationMs) {
        cacheLogger.debug(`Cache expired for key ${cacheKey.substring(0, 8)}...`);
        // Track cache miss due to expiration
        this._trackCacheMiss(cacheKey);
        return null;
      }
      
      // Track cache hit and update hit count
      this._trackCacheHit(cacheKey, cacheFilePath, cacheData);
      
      cacheLogger.info(`Cache hit for key ${cacheKey.substring(0, 8)}...`);
      return cacheData.response;
    } catch (error) {
      cacheLogger.warn(`Error reading cache: ${error.message}`);
      return null;
    }
  }

  /**
   * Stores a response in the cache
   * @param {Object} request AI API request data
   * @param {Object} response AI API response data
   */
  cacheResponse(request, response) {
    if (!this.enabled) {
      return;
    }
    
    try {
      const cacheKey = this.getCacheKey(request);
      const cacheFilePath = this.getCacheFilePath(cacheKey);
      
      const cacheData = {
        timestamp: Date.now(),
        request: {
          model: request.model,
          temperature: request.temperature,
          maxTokens: request.max_tokens
        },
        response,
        hits: 0,
        misses: 0,
        created: Date.now()
      };
      
      fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf8');
      cacheLogger.info(`Cached response for key ${cacheKey.substring(0, 8)}...`);
      
      // Periodically update cache stats (not on every write)
      if (Math.random() < 0.1) { // ~10% chance to update stats
        this.updateStats();
      }
    } catch (error) {
      cacheLogger.warn(`Error writing to cache: ${error.message}`);
    }
  }
  
  /**
   * Track a cache hit
   * @private
   */
  _trackCacheHit(cacheKey, cacheFilePath, cacheData) {
    try {
      // Update hit count
      cacheData.hits = (cacheData.hits || 0) + 1;
      cacheData.lastHit = Date.now();
      
      // Write back to disk occasionally (not on every hit to reduce disk I/O)
      // Use modulo on hits count to determine when to write
      if (cacheData.hits % 5 === 0) { // Update every 5 hits
        fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2), 'utf8');
      }
    } catch (error) {
      // Ignore errors updating hit counts
      cacheLogger.debug(`Error tracking cache hit: ${error.message}`);
    }
  }
  
  /**
   * Track a cache miss
   * @private
   */
  _trackCacheMiss(cacheKey) {
    // We could track misses in a separate file if needed
    // For now, just log if debug is enabled
    cacheLogger.debug(`Cache miss for key ${cacheKey.substring(0, 8)}...`);
  }

  /**
   * Clears expired entries from the cache
   * @returns {number} Number of entries cleared
   */
  clearExpiredEntries() {
    if (!this.enabled) {
      return 0;
    }
    
    try {
      let cleared = 0;
      const files = fs.readdirSync(this.cacheDir);
      const now = Date.now();
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (now - cacheData.timestamp > this.expirationMs) {
          fs.unlinkSync(filePath);
          cleared++;
        }
      }
      
      cacheLogger.info(`Cleared ${cleared} expired cache entries`);
      return cleared;
    } catch (error) {
      cacheLogger.warn(`Error clearing expired cache entries: ${error.message}`);
      return 0;
    }
  }

  /**
   * Gets cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    if (!this.enabled) {
      return { enabled: false, entries: 0, size: 0 };
    }
    
    try {
      const files = fs.readdirSync(this.cacheDir).filter(f => f.endsWith('.json'));
      let totalSize = 0;
      let hitCount = 0;
      let missCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        // Try to read the cache metadata to get hit counts if available
        try {
          const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          hitCount += cacheData.hits || 0;
          missCount += cacheData.misses || 0;
        } catch (e) {
          // Ignore errors reading individual cache files
        }
      }
      
      return {
        enabled: true,
        entries: files.length,
        size: Math.round(totalSize / 1024), // KB
        expirationHours: this.expirationMs / (1000 * 60 * 60),
        hitCount,
        missCount,
        hitRate: hitCount + missCount > 0 ? Math.round((hitCount / (hitCount + missCount)) * 100) : 0
      };
    } catch (error) {
      cacheLogger.warn(`Error getting cache stats: ${error.message}`);
      return { enabled: true, error: error.message };
    }
  }
  
  /**
   * Updates the cache statistics file with current hit rates
   */
  updateStats() {
    if (!this.enabled) {
      return;
    }
    
    try {
      const stats = this.getStats();
      const statsFilePath = path.join(this.cacheDir, 'stats.json');
      
      fs.writeFileSync(statsFilePath, JSON.stringify({
        timestamp: Date.now(),
        stats
      }, null, 2));
      
      cacheLogger.debug('Updated cache statistics file');
    } catch (error) {
      cacheLogger.warn(`Error updating cache stats: ${error.message}`);
    }
  }
}

// Export a singleton instance
const aiCache = new AICache();
module.exports = aiCache;