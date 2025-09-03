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
  return {
    ...expoConfig,
    ios: {
      ...expoConfig.ios,
      config: {
        ...expoConfig.ios?.config,
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDUMMY_KEY_FOR_TESTING',
      },
    },
    android: {
      ...expoConfig.android,
      config: {
        ...expoConfig.android?.config,
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDUMMY_KEY_FOR_TESTING',
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
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDUMMY_KEY_FOR_TESTING',
    },
  };
};



