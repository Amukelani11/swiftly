// Deno Edge Function: register-device
// Upserts the caller's push token

interface Payload { platform: 'ios'|'android'|'web'; token: string }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...cors, 'Content-Type':'application/json' } });
    }
    const auth = req.headers.get('Authorization') || '';
    if (!auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...cors, 'Content-Type':'application/json' } });
    }
    const body: Payload = await req.json();
    console.log('[register-device] incoming payload', {
      platform: body?.platform,
      tokenPreview: body?.token ? `${body.token.slice(0, 6)}...${body.token.slice(-4)}` : undefined,
    });
    if (!body?.platform || !body?.token) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...cors, 'Content-Type':'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const url = `${SUPABASE_URL}/rest/v1/device_tokens`;

    // get user id from auth header via /auth/v1/user
    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY')! } });
    if (!userResp.ok) return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 401, headers: { ...cors, 'Content-Type':'application/json' } });
    const user = await userResp.json();
    const user_id = user?.id;
    console.log('[register-device] resolved user', { user_id });

    const upsertResp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`!,
        apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ user_id, platform: body.platform, token: body.token, updated_at: new Date().toISOString() })
    });
    if (!upsertResp.ok) {
      const t = await upsertResp.text();
      console.error('[register-device] upsert failed', t);
      return new Response(JSON.stringify({ error: 'DB upsert failed', details: t }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
    }
    console.log('[register-device] upsert success for', { user_id });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...cors, 'Content-Type':'application/json' } });
  } catch (e) {
    console.error('[register-device] error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
  }
});
