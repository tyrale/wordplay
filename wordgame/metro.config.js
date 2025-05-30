const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable symlinks for monorepo setup
config.watchFolders = [path.resolve(__dirname, '..')];

// Add additional file extensions for better module resolution
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Support for Expo Router and New Architecture
config.resolver.alias = {
  // Enable react-native-web aliasing for web platform
  ...(process.env.EXPO_PUBLIC_PLATFORM === 'web' && {
    'react-native': 'react-native-web',
  }),
};

// Resolve packages from the monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', 'node_modules'),
];

// Enable all platforms with proper platform resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Optimized resolver for modern React Native
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Enable unstable features for New Architecture
config.resolver.unstable_enableSymlinks = true;

module.exports = config; 