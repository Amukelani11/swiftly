module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated v3 requires its plugin to be last
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: ['react-native-reanimated/plugin']
      }
    }
  };
};
