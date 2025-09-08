// Deno Edge Function: create-shopping-request
// Creates a shopping request + items, emits rows for Realtime. Intended to be called after fee payment.

interface Item { title: string; qty?: number }
interface Payload {
  storeName?: string;
  storeLat?: number;
  storeLng?: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  subtotalFees: number;
  serviceFeeAmount?: number;
  pickPackFeeAmount?: number;
  tip?: number;
  items: Item[];
}

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

    const payload: Payload = await req.json();
    console.log('[create-shopping-request] payload', {
      items: Array.isArray(payload?.items) ? payload.items.length : 0,
      storeName: payload?.storeName,
      dropoffAddress: payload?.dropoffAddress,
      subtotalFees: payload?.subtotalFees,
      tip: payload?.tip,
    });
    if (!payload?.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items' }), { status: 400, headers: { ...cors, 'Content-Type':'application/json' } });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identify user
    const meResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: auth, apikey: Deno.env.get('SUPABASE_ANON_KEY')! } });
    if (!meResp.ok) return new Response(JSON.stringify({ error: 'Auth failed' }), { status: 401, headers: { ...cors, 'Content-Type':'application/json' } });
    const me = await meResp.json();
    const customer_id = me?.id;
    console.log('[create-shopping-request] resolved customer', { customer_id });

    // Insert request
    const reqResp = await fetch(`${SUPABASE_URL}/rest/v1/shopping_requests`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({
        customer_id,
        store_name: payload.storeName,
        store_lat: payload.storeLat,
        store_lng: payload.storeLng,
        dropoff_address: payload.dropoffAddress,
        dropoff_lat: payload.dropoffLat,
        dropoff_lng: payload.dropoffLng,
        subtotal_fees: payload.subtotalFees,
        service_fee: payload.serviceFeeAmount ?? 0,
        pick_pack_fee: payload.pickPackFeeAmount ?? 0,
        tip: payload.tip ?? 0,
        confirmed: true,
        status: 'pending',
      })
    });
    if (!reqResp.ok) {
      const t = await reqResp.text();
      console.error('[create-shopping-request] insert request failed', t);
      return new Response(JSON.stringify({ error: 'Insert request failed', details: t }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
    }
    const [request] = await reqResp.json();
    console.log('[create-shopping-request] request created', { id: request?.id });

    // Insert items
    const itemsPayload = payload.items.map((it) => ({ request_id: request.id, title: it.title, qty: it.qty ?? 1 }));
    const itemsResp = await fetch(`${SUPABASE_URL}/rest/v1/shopping_request_items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(itemsPayload)
    });
    if (!itemsResp.ok) {
      const t = await itemsResp.text();
      console.error('[create-shopping-request] insert items failed', t);
      return new Response(JSON.stringify({ error: 'Insert items failed', details: t, request }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
    }
    console.log('[create-shopping-request] items inserted', { count: payload.items.length });

    // Respond with new request id; drivers subscribe via Realtime on shopping_requests
    return new Response(JSON.stringify({ success: true, request }), { status: 200, headers: { ...cors, 'Content-Type':'application/json' } });
  } catch (e) {
    console.error('[create-shopping-request] error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type':'application/json' } });
  }
});
