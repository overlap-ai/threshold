// Edge Function: store the user's Binance API key/secret encrypted at rest.
// POST { apiKey, apiSecret } -> { ok: true } or 4xx with reason.
// Auth: Authorization: Bearer <user-jwt>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { encryptString, bytesToBase64 } from '../_shared/crypt.ts';
import { fetchBinanceAccount } from '../_shared/binance.ts';

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate the JWT and get user id
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'invalid auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const { apiKey, apiSecret } = (await req.json()) as {
      apiKey?: string;
      apiSecret?: string;
    };
    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'apiKey and apiSecret required' }), {
        status: 400,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    // Verify creds work BEFORE persisting
    try {
      await fetchBinanceAccount(apiKey, apiSecret);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Binance rejected the keys', detail: String(err) }),
        { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } },
      );
    }

    const apiKeyEnc = await encryptString(apiKey);
    const apiSecretEnc = await encryptString(apiSecret);

    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin
      .from('binance_credentials')
      .upsert(
        {
          user_id: userData.user.id,
          api_key_encrypted: '\\x' + Array.from(apiKeyEnc).map((b) => b.toString(16).padStart(2, '0')).join(''),
          api_secret_encrypted: '\\x' + Array.from(apiSecretEnc).map((b) => b.toString(16).padStart(2, '0')).join(''),
        },
        { onConflict: 'user_id' },
      );
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, fingerprint: bytesToBase64(apiKeyEnc).slice(0, 8) }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
