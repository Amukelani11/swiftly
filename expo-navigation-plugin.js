const { withInfoPlist } = require('@expo/config-plugins');

function withNavigationSDK(config) {
  // iOS configuration - add navigation-specific location permissions
  config = withInfoPlist(config, (config) => {
    config.modResults['NSLocationWhenInUseUsageDescription'] =
      config.modResults['NSLocationWhenInUseUsageDescription'] ||
      'This app needs access to your location to show nearby stores and provide delivery services.';

    config.modResults['NSLocationAlwaysAndWhenInUseUsageDescription'] =
      config.modResults['NSLocationAlwaysAndWhenInUseUsageDescription'] ||
      'This app needs access to your location to provide real-time delivery tracking and navigation.';

    config.modResults['NSLocationAlwaysUsageDescription'] =
      config.modResults['NSLocationAlwaysUsageDescription'] ||
      'This app needs access to your location to provide turn-by-turn navigation and real-time delivery updates.';

    return config;
  });

  return config;
}

module.exports = withNavigationSDK;
