import { NativeModules, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

type LatLng = { lat: number; lng: number };

type StartNavigationParams = {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  title?: string;
};

const linkError = new Error(
  'NavigationModule not linked. Ensure native modules are installed (Android/iOS) and run a native build.'
);

export async function startTurnByTurn(params: StartNavigationParams) {
  // Native side should implement: NavigationModule.startNavigation(params)
  const mod = (NativeModules as any)?.NavigationModule;
  if (!mod?.startNavigation) throw linkError;
  return mod.startNavigation(params);
}

export function isNativeNavigationAvailable(): boolean {
  const mod = (NativeModules as any)?.NavigationModule;
  const available = !!mod?.startNavigation;
  console.log('Navigation Module available:', available);
  console.log('Navigation Module object:', mod);
  return available;
}

// Helper function to geocode addresses using the edge function
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
      body: {
        path: 'geocode',
        params: {
          address: address,
          region: 'za' // South Africa
        }
      }
    });

    if (error) {
      throw new Error(`Geocoding error: ${error.message}`);
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Geocoding failed: ${data.status}`);
    }

    const location = data.results[0].geometry.location;
    return {
      lat: location.lat,
      lng: location.lng
    };
  } catch (error) {
    console.error('Geocoding failed:', error);
    throw error;
  }
}

// Helper function to get directions using the edge function
export async function getDirections(
  origin: LatLng,
  destination: LatLng,
  options?: { mode?: string; waypoints?: LatLng[] }
): Promise<any> {
  try {
    const params: any = {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      mode: options?.mode || 'driving',
      region: 'za'
    };

    // Add waypoints if provided
    if (options?.waypoints && options.waypoints.length > 0) {
      params.waypoints = options.waypoints
        .map(wp => `${wp.lat},${wp.lng}`)
        .join('|');
    }

    const { data, error } = await supabase.functions.invoke('google-maps-proxy', {
      body: {
        path: 'directions',
        params: params
      }
    });

    if (error) {
      throw new Error(`Directions error: ${error.message}`);
    }

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      throw new Error(`Directions failed: ${data.status}`);
    }

    return data;
  } catch (error) {
    console.error('Directions failed:', error);
    throw error;
  }
}

