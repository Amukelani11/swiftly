// metro.config.js - React Native 0.73+ compatible
const { getDefaultConfig } = require('@expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// React Native 0.73+ Metro config with proper asset handling
config.resolver = {
  ...config.resolver,
  // Exclude problematic assets from being processed as modules
  blockList: [
    /\.(png|jpg|jpeg|gif|svg|webp|ico)$/,
    /node_modules\/.*\/assets\/.*/,
    /.*\/Swiftly\)\.png$/,
  ],
  // Ensure proper asset resolution
  assetExts: [
    'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico',
    'ttf', 'otf', 'woff', 'woff2'
  ]
};

module.exports = config;





