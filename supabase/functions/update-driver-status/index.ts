// Deno Edge Function: update-driver-status
// Driver sets online flag and updates last known location (+ optional service radius)

interface Payload { online?: boolean; lat?: number; lng?: number; serviceRadiusKm?: number }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type':'application/json' } });
    const auth = req.headers.get('Authorization') || '';
    if (!auth) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type':'application/json' } });

    const body: Payload = await req.json();
    console.log('[update-driver-status] incoming payload', {
      hasAuth: !!auth,
      online: body?.online,
      lat: body?.lat,
      lng: body?.lng,
      serviceRadiusKm: body?.serviceRadiusKm,
    });
    const payload: any = { updated_at: new Date().toISOString() };
    if (typeof body.online === 'boolean') payload.online = body.online;
    if (typeof body.lat === 'number') payload.lat = body.lat;
    if (typeof body.lng === 'number') payload.lng = body.lng;
    if (typeof body.serviceRadiusKm === 'number') payload.service_radius_km = body.serviceRadiusKm;

    // Identify caller
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const meResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: anon } });
    if (!meResp.ok) return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 401, headers: { ...cors, 'Content-Type':'application/json' } });
    const me = await meResp.json();
    const user_id = me?.id;
    console.log('[update-driver-status] resolved user', { user_id });

    // Upsert with user JWT so RLS checks user_id match
    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/provider_status`, {
      method: 'POST',
      headers: { Authorization: auth, apikey: anon, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ user_id, ...payload })
    });
    if (!upsertResp.ok) {
      const t = await upsertResp.text();
      console.error('[update-driver-status] upsert failed', t);
      return new Response(JSON.stringify({ error: 'Upsert failed', details: t }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
    }
    console.log('[update-driver-status] upsert success for', { user_id });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...cors, 'Content-Type':'application/json' } });
  } catch (e) {
    console.error('[update-driver-status] error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
  }
});
