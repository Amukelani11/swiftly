import { supabase } from './supabase';

const MAPBOX_TOKEN = process?.env?.MAPBOX_ACCESS_TOKEN || (global as any)?.__MAPBOX_TOKEN || '';

type LatLng = { lat: number; lng: number };

export async function mapboxDirections(origin: LatLng, destination: LatLng, waypoints?: LatLng[]) {
  try {
    const coords = [origin, ...(waypoints || []), destination].map(p => `${p.lng},${p.lat}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=polyline&overview=full&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  } catch (e) {
    console.error('Mapbox directions failed', e);
    throw e;
  }
}

export async function mapboxGeocode(address: string) {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.features || data.features.length === 0) throw new Error('No results');
    const c = data.features[0].center; // [lng, lat]
    return { lat: c[1], lng: c[0] };
  } catch (e) {
    console.error('Mapbox geocode failed', e);
    throw e;
  }
}

export function decodePolyline(encoded: string): { latitude: number; longitude: number }[] {
  let index = 0, lat = 0, lng = 0;
  const coordinates: { latitude: number; longitude: number }[] = [];
  while (index < encoded.length) {
    let b = 0, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1); lat += dlat;
    shift = 0; result = 0; do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1); lng += dlng;
    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coordinates;
}

export default { mapboxDirections, mapboxGeocode, decodePolyline };


