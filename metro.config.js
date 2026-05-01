// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix: @tanstack/react-query v5 uses package.json "exports" field
// which Metro doesn't resolve by default.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
