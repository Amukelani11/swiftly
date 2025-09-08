// Deno Edge Function: accept-request
// Atomically claims a pending request for the caller (provider)

interface Payload { requestId: string }

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
    const { requestId }: Payload = await req.json();
    if (!requestId) return new Response(JSON.stringify({ error: 'Missing requestId' }), { status: 400, headers: { ...cors, 'Content-Type':'application/json' } });
    console.log('[accept-request] attempt', { requestId });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Get user id (provider)
    const meResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY')! } });
    if (!meResp.ok) return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 401, headers: { ...cors, 'Content-Type':'application/json' } });
    const me = await meResp.json();
    const provider_id = me?.id;
    console.log('[accept-request] provider', { provider_id });

    // Atomic accept via PostgREST RPC upsert-like filter
    const updateResp = await fetch(`${SUPABASE_URL}/rest/v1/shopping_requests?id=eq.${requestId}&status=eq.pending`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'accepted', accepted_by: provider_id, accepted_at: new Date().toISOString() })
    });
    if (!updateResp.ok) {
      const t = await updateResp.text();
      console.error('[accept-request] patch failed', t);
      return new Response(JSON.stringify({ error: 'Accept failed', details: t }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
    }
    const rows = await updateResp.json();
    if (!rows || rows.length === 0) {
      console.warn('[accept-request] race lost or not found', { requestId });
      return new Response(JSON.stringify({ success: false, reason: 'Already accepted or not found' }), { status: 409, headers: { ...cors, 'Content-Type':'application/json' } });
    }
    console.log('[accept-request] accepted', { requestId, accepted_by: provider_id });

    return new Response(JSON.stringify({ success: true, request: rows[0] }), { status: 200, headers: { ...cors, 'Content-Type':'application/json' } });
  } catch (e) {
    console.error('[accept-request] error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
  }
});
