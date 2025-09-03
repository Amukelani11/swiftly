import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, email, password, userData } = await req.json();
    let response;

    switch (action) {
      case 'signup':
        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).single();
        if (existingUser) {
          return new Response(JSON.stringify({ error: 'User already exists' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: userData });
        if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const { error: profileError } = await supabase.from('profiles').insert([{
          id: authData.user.id,
          email: authData.user.email,
          full_name: userData?.full_name || '',
          phone: userData?.phone || '',
          role: userData?.role || 'customer',
        }]);

        if (profileError) {
          await supabase.auth.admin.deleteUser(authData.user.id);
          return new Response(JSON.stringify({ error: 'Failed to create profile' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        response = { message: 'User created successfully', user: { id: authData.user.id, email: authData.user.email, role: userData?.role || 'customer' } };
        break;

      case 'signin':
        if (!email || !password) return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) return new Response(JSON.stringify({ error: signInError.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', signInData.user.id).single();
        response = { message: 'Sign in successful', user: signInData.user, profile, session: { access_token: signInData.session.access_token, refresh_token: signInData.session.refresh_token } };
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Auth function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});










