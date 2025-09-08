// Deno Edge Function: notify-drivers
// Selects nearby online drivers and (optionally) sends push notifications.
// If EXPO_ACCESS_TOKEN is set, sends to Expo Push API. Otherwise returns tokens.

interface Payload {
  requestId?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number; // default 10
  limit?: number; // default 30
  message?: string; // optional push body
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type':'application/json' } });
    const body: Payload = await req.json();
    const radiusKm = body.radiusKm ?? 10;
    const limit = body.limit ?? 30;
    console.log('[notify-drivers] payload', { requestId: body.requestId, lat: body.lat, lng: body.lng, radiusKm, limit });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;

    let originLat = body.lat;
    let originLng = body.lng;
    if ((!originLat || !originLng) && body.requestId) {
      const reqResp = await fetch(`${SUPABASE_URL}/rest/v1/shopping_requests?id=eq.${body.requestId}`, {
        headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE }
      });
      const rows = await reqResp.json();
      const r = rows?.[0];
      originLat = r?.dropoff_lat ?? r?.store_lat;
      originLng = r?.dropoff_lng ?? r?.store_lng;
      console.log('[notify-drivers] resolved origin from request', { originLat, originLng });
    }
    if (!originLat || !originLng) {
      return new Response(JSON.stringify({ error: 'Missing origin coordinates' }), { status: 400, headers: { ...cors, 'Content-Type':'application/json' } });
    }

    // Fetch online providers updated recently (last 5 minutes)
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const psResp = await fetch(`${SUPABASE_URL}/rest/v1/provider_status?online=eq.true&updated_at=gte.${since}`, {
      headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE }
    });
    const providers = await psResp.json();
    console.log('[notify-drivers] online recent providers', { count: providers?.length || 0 });

    // Narrow by rough bbox first
    const latDegreeKm = 110.574; // approx
    const lngDegreeKm = 111.320 * Math.cos((originLat as number) * Math.PI / 180);
    const latDelta = radiusKm / latDegreeKm;
    const lngDelta = radiusKm / lngDegreeKm;
    const latMin = (originLat as number) - latDelta;
    const latMax = (originLat as number) + latDelta;
    const lngMin = (originLng as number) - lngDelta;
    const lngMax = (originLng as number) + lngDelta;

    const nearby = (providers || [])
      .filter((p: any) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .filter((p: any) => p.lat >= latMin && p.lat <= latMax && p.lng >= lngMin && p.lng <= lngMax)
      .map((p: any) => ({ ...p, distanceKm: haversineKm(originLat as number, originLng as number, p.lat, p.lng) }))
      .filter((p: any) => p.distanceKm <= Math.min(radiusKm, p.service_radius_km ?? radiusKm))
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
    console.log('[notify-drivers] nearby candidates', { count: nearby.length });

    if (nearby.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0, tokens: [] }), { status: 200, headers: { ...cors, 'Content-Type':'application/json' } });
    }

    // Join device tokens
    const ids = nearby.map((p: any) => `user_id=eq.${p.user_id}`).join('&');
    const tokResp = await fetch(`${SUPABASE_URL}/rest/v1/device_tokens?${ids}`, {
      headers: { Authorization: `Bearer ${SERVICE}`, apikey: SERVICE }
    });
    const tokens = await tokResp.json();
    const expoTokens = tokens.map((t: any) => t.token).filter((t: string) => typeof t === 'string');
    console.log('[notify-drivers] tokens fetched', { tokens: expoTokens.length });

    // Send via Expo if configured
    const EXPO = Deno.env.get('EXPO_ACCESS_TOKEN');
    const title = 'New Shopping Request';
    const bodyText = body.message || 'A nearby request is available.';
    let pushResult: any = null;
    if (EXPO && expoTokens.length > 0) {
      const chunks = [] as any[];
      // batch payloads (~100 per request)
      for (let i = 0; i < expoTokens.length; i += 90) {
        chunks.push(expoTokens.slice(i, i + 90));
      }
      pushResult = [];
      for (const ch of chunks) {
        const resp = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EXPO}` },
          body: JSON.stringify(ch.map((to: string) => ({ to, title, body: bodyText, sound: 'default', priority: 'high' })))
        });
        pushResult.push(await resp.json());
      }
      console.log('[notify-drivers] push sent via Expo', { batches: pushResult.length, notified: expoTokens.length });
    }

    return new Response(JSON.stringify({ success: true, notified: expoTokens.length, tokens: EXPO ? undefined : expoTokens, providers: nearby, pushResult }), { status: 200, headers: { ...cors, 'Content-Type':'application/json' } });
  } catch (e) {
    console.error('[notify-drivers] error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
  }
});
