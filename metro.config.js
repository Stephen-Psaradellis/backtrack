const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for chunked transfer encoding issues with New Architecture on Windows
// The multipart response parsing in BundleDownloader has issues with
// the chunked response format, causing ProtocolException
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Force non-multipart response for bundle requests by removing the Accept header
      // This prevents Metro from sending multipart/mixed responses that cause parsing errors
      if (req.url && req.url.includes('.bundle')) {
        // Override Accept header to prevent multipart response
        req.headers['accept'] = 'application/javascript';
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
