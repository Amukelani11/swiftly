// metro.config.js - React Native 0.73+ compatible
const { getDefaultConfig } = require('@expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// React Native 0.73+ Metro config with proper asset handling
config.resolver = {
  ...config.resolver,
  // Clear blockList to allow all assets
  blockList: [
    // Only block node_modules assets, not local assets
    /node_modules\/.*\/assets\/.*/
  ],
  // Ensure proper asset resolution for all image types
  assetExts: [
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico',
    'ttf', 'otf', 'woff', 'woff2'
  ],
  // Add explicit alias for assets
  alias: {
    'react-native/Libraries/Image/AssetRegistry': false,
  }
};

// Add transformer config to handle assets properly
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

module.exports = config;





