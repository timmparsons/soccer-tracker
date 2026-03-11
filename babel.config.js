module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Must come before react-native-reanimated/plugin (added by babel-preset-expo)
    'react-native-worklets-core/plugin',
  ],
};
