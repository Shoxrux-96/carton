const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure react-native-web resolution for web platform
config.resolver.platforms = ['web', 'android', 'ios'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
