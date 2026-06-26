const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  experimental_reactCompilerEnabled: false,
};

// watchman reinstalled (libfmt upgrade broke it) — new binary pending macOS TCC permission
config.resolver = {
  ...config.resolver,
  useWatchman: false,
};

module.exports = config;
