const cache = {};
const MAX_CACHE_SIZE = 100; // Prevent memory leaks

// Cleanup old entries when cache gets too large
function cleanupCache() {
  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHE_SIZE) {
    // Remove oldest 20% of entries
    const toRemove = Math.floor(MAX_CACHE_SIZE * 0.2);
    keys.slice(0, toRemove).forEach(key => delete cache[key]);
  }
}

module.exports = (seconds) => (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const key = req.originalUrl;

  // Return cached response if valid
  if (cache[key] && cache[key].expiry > Date.now()) {
    return res.json(cache[key].data);
  }

  // Wrap res.json to cache the response
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    // Only cache successful responses
    if (res.statusCode === 200) {
      cache[key] = {
        data,
        expiry: Date.now() + seconds * 1000
      };
      cleanupCache();
    }
    return originalJson(data);
  };

  next();
};

// Export cache clearing function for manual invalidation
module.exports.clearCache = () => {
  Object.keys(cache).forEach(key => delete cache[key]);
};
