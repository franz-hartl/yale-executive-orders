# Yale Executive Orders - AI Caching System

## Overview

The AI caching system reduces API costs, improves performance, and helps avoid rate limits by caching responses from AI API calls. It uses a filesystem-based approach to store responses based on the hash of input parameters.

## Key Features

- **Filesystem-based caching**: Stores AI responses as JSON files
- **Content-based hashing**: Uses SHA-256 hashing of request parameters for cache keys
- **Configurable expiration**: Cache entries expire after a configurable period
- **Cache statistics**: Tracks hit rates and estimated cost savings
- **Automatic cleanup**: Periodically removes expired cache entries
- **Memory-efficient**: Only loads cache entries when needed

## Configuration

The caching system can be configured in `config/default.js`:

```javascript
analysis: {
  claude: {
    enabled: true,
    maxTokens: 100000,
    temperature: 0.0,
    useCache: true,             // Enable/disable caching
    cacheExpiration: 604800000  // Expiration in milliseconds (7 days)
  }
}
```

Each AI integration can also have separate cache settings in its configuration:

```javascript
aiExtraction: {
  model: "claude-3-haiku-20240307",
  maxTokens: 2000,
  temperature: 0,
  useCache: true,
  cacheExpiration: 604800000 // 7 days in milliseconds
}
```

## Files

- `/utils/ai_cache.js`: Main cache implementation
- `/cache/ai_responses/`: Directory where cache files are stored
- `/cache/ai_responses/stats.json`: Cache statistics summary

## Cache Keys

Cache keys are generated using the following request properties:
- Model name
- Input prompt/text
- System prompt
- Temperature setting

This ensures that identical requests with the same parameters will hit the cache, while any changes to these parameters will generate a new cache entry.

## Statistics and Monitoring

The cache tracks and reports:
- Number of cache entries
- Total cache size (KB)
- Hit count and miss count
- Hit rate percentage
- Estimated cost savings based on API pricing

## Integration Example

```javascript
const aiCache = require('./utils/ai_cache');

// Check if response is cached
const cachedResponse = aiCache.getCachedResponse(request);
if (cachedResponse) {
  console.log('Using cached response');
  return cachedResponse;
}

// If not cached, make API call
const response = await callAIAPI(request);

// Cache the response for future use
aiCache.cacheResponse(request, response);
```

## Maintenance

The cache automatically removes expired entries during startup. You can also manually clear expired entries:

```javascript
const aiCache = require('./utils/ai_cache');
const cleared = aiCache.clearExpiredEntries();
console.log(`Cleared ${cleared} expired cache entries`);
```

## Performance Implications

### Benefits

1. **Cost Reduction**: By caching responses, the system reduces the number of API calls to Claude and other language models, which can significantly reduce costs for high-volume processing.

2. **Speed Improvement**: Cached responses are returned almost instantly, compared to AI API calls which typically take 1-5 seconds.

3. **Rate Limit Protection**: Helps avoid hitting API rate limits during batch processing of many executive orders.

4. **Offline Capability**: With a populated cache, the system can process previously analyzed content even without internet connectivity.

### When to Clear Cache

You should consider clearing the cache in these situations:

1. When AI models are upgraded (e.g., moving from Claude 3 Haiku to Claude 3 Opus)
2. When prompt templates are significantly changed
3. When analysis requirements change fundamentally

To clear the entire cache manually:

```bash
rm -rf ./cache/ai_responses/*.json
```

## Implementation Details

The caching system uses a content-addressable approach where the cache key is derived from a hash of the input parameters. This ensures that identical requests produce the same cache key.

Each cache entry includes:
- The original request parameters (model, temperature, etc.)
- The full response data
- Metadata (timestamp, hit count, etc.)
- Cache statistics

## Future Enhancements

Potential improvements to the caching system include:

1. **Distributed Cache**: Implementing a shared cache across multiple machines for team environments
2. **Compression**: Adding compression for large response data to reduce disk usage
3. **Cache Prewarming**: Proactively populating the cache for common queries
4. **Advanced Cache Invalidation**: Smarter rules for when to invalidate cached entries