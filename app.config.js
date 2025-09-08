import { readFileSync } from 'fs';
import { join } from 'path';

// Read .env file directly as fallback
const envPath = join(__dirname, '.env');
let envVars = {};
try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.log('Could not read .env file directly');
}

export default ({ config: expoConfig }) => {
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY || envVars.GOOGLE_MAPS_API_KEY;
  if (!API_KEY) {
    console.warn("\n[config] GOOGLE_MAPS_API_KEY is not set. Maps may render blank tiles.");
  }
  return {
    ...expoConfig,
    ios: {
      ...expoConfig.ios,
      deploymentTarget: '13.0',
      infoPlist: {
        ...(expoConfig.ios?.infoPlist || {}),
        NSLocationWhenInUseUsageDescription: 'We use your location for in-app navigation and accurate routing.',
        NSLocationAlwaysAndWhenInUseUsageDescription: 'We use your location for in-app navigation and accurate routing.',
      },
      config: {
        ...expoConfig.ios?.config,
        ...(API_KEY ? { googleMapsApiKey: API_KEY } : {}),
      },
    },
    android: {
      ...expoConfig.android,
      minSdkVersion: 23,
      permissions: Array.from(new Set([
        ...(expoConfig.android?.permissions || []),
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
      ])),
      config: {
        ...expoConfig.android?.config,
        googleMaps: {
          ...(API_KEY ? { apiKey: API_KEY } : {}),
        },
      },
    },
    plugins: [
      ...(expoConfig.plugins || []).filter(plugin => {
        // Filter out any maps plugins to prevent conflicts
        return !Array.isArray(plugin) || !['expo-maps', 'react-native-maps'].includes(plugin[0]);
      }),
    ],
    extra: {
      REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL || envVars.REACT_APP_SUPABASE_URL,
      REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY || envVars.REACT_APP_SUPABASE_ANON_KEY,
      GOOGLE_MAPS_API_KEY: API_KEY,
      eas: {
        projectId: process.env.EAS_PROJECT_ID || envVars.EAS_PROJECT_ID || '5ff4974f-bcab-4d4d-998b-e1bb9a31b107',
      },
    },
  };
};
