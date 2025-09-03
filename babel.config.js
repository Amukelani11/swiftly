module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['react-native-worklets/plugin'],
    ],
    // Explicitly disable any reanimated plugins that might be included
    env: {
      production: {
        plugins: ['react-native-worklets/plugin']
      }
    }
  };
};
