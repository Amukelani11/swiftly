import { NativeModules, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import mapbox from '../lib/mapbox';

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
  // We no longer use native Google Navigation; use Mapbox Directions via edge or client
  // This function will return directions data for in-app rendering
  const origin = params.origin;
  const dest = params.destination;
  const waypoints = params.waypoints;
  return mapbox.mapboxDirections(origin, dest, waypoints);
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
    return await mapbox.mapboxGeocode(address);
  } catch (error) {
    console.error('Geocoding failed (mapbox):', error);
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
    // Use Mapbox directions directly
    const resp = await mapbox.mapboxDirections(origin, destination, options?.waypoints);
    return resp;
  } catch (error) {
    console.error('Directions failed (mapbox):', error);
    throw error;
  }
}

