const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Basic configuration without complex monorepo setup
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config; 