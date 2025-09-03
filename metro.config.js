const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Firebase bundling issues with Metro
config.resolver.unstable_enablePackageExports = false;

// Add watchFolders to ensure react-native-svg files are watched
config.watchFolders = [
  ...config.watchFolders || [],
  __dirname + '/node_modules'
];

// Ensure react-native-svg files are not blocked
config.resolver.blockList = config.resolver.blockList || [];

module.exports = config;