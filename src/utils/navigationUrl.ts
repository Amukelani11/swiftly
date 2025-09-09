export type LatLng = { lat: number; lng: number };

export function buildGoogleDirectionsUrl(
  origin: LatLng,
  destination: LatLng,
  waypoints?: LatLng[],
  opts: { travelmode?: 'driving' | 'walking' | 'bicycling' | 'transit'; optimize?: boolean } = {}
): string {
  // Keep compatibility for web fallbacks — still returns Google directions URL
  const params: Record<string, string> = {
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: opts.travelmode || 'driving',
    dir_action: 'navigate',
  };
  if (waypoints && waypoints.length) {
    const list = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
    params.waypoints = `${opts.optimize ? 'optimize:true|' : ''}${list}`;
  }
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return `https://www.google.com/maps/dir/?${qs}`;
}
