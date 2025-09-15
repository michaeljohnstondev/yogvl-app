const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix Firebase bundling issues with Metro
config.resolver.unstable_enablePackageExports = false;

// Add watchFolders to ensure react-native-svg files are watched
config.watchFolders = [
  ...(config.watchFolders || []),
  __dirname + '/node_modules',
];

// Ensure react-native-svg files are not blocked
config.resolver.blockList = config.resolver.blockList || [];

// Node.js 22 compatibility fixes for expo-secure-store and other native modules
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Ensure proper resolution of native modules for Node.js 22
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Fix for expo-secure-store module resolution on Node.js 22
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'expo-secure-store': require.resolve('expo-secure-store'),
};

module.exports = config;
