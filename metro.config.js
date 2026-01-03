const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Path to empty mock module for iOS
const emptyMapsModulePath = path.resolve(__dirname, 'lib/empty-maps-module.js');

// Block react-native-maps from iOS bundle since it's excluded from autolinking
// This prevents Metro from including the JS that would try to access the missing native module
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // On iOS, redirect react-native-maps to our empty mock module
    if (moduleName === 'react-native-maps' && platform === 'ios') {
      return {
        filePath: emptyMapsModulePath,
        type: 'sourceFile',
      };
    }
    // Also handle subpath imports like 'react-native-maps/lib/components/MapView'
    if (moduleName.startsWith('react-native-maps/') && platform === 'ios') {
      return {
        filePath: emptyMapsModulePath,
        type: 'sourceFile',
      };
    }
    // Use default resolution for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

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
