const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const {
    resolver: { sourceExts, assetExts }
} = config;

// Add web-specific preference if needed, but the default is usually fine.
// The issue was native-only modules being imported on web.
// By separating .native.js and .js, we solve this.

module.exports = config;
