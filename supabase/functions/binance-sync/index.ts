// Edge Function: read encrypted Binance creds, fetch account balances and
// USDT prices, persist holdings, return totals to the client.
// POST {} (auth via Authorization: Bearer <user-jwt>) -> { totalUsd, holdings }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders, preflight } from '../_shared/cors.ts';
import { decryptString } from '../_shared/crypt.ts';
import { fetchBinanceAccount, fetchPricesUsdt } from '../_shared/binance.ts';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('\\x') ? hex.slice(2) : hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'invalid auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: cred, error: credErr } = await admin
      .from('binance_credentials')
      .select('api_key_encrypted, api_secret_encrypted')
      .eq('user_id', userId)
      .maybeSingle();

    if (credErr) throw credErr;
    if (!cred) {
      return new Response(JSON.stringify({ error: 'no_credentials' }), {
        status: 404,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
      });
    }

    const apiKey = await decryptString(hexToBytes(cred.api_key_encrypted as unknown as string));
    const apiSecret = await decryptString(hexToBytes(cred.api_secret_encrypted as unknown as string));

    const balances = await fetchBinanceAccount(apiKey, apiSecret);
    const prices = await fetchPricesUsdt(balances.map((b) => b.asset));

    let totalUsd = 0;
    const holdings = balances.map((b) => {
      const priceUsd = prices[b.asset] ?? 0;
      const valueUsd = b.total * priceUsd;
      totalUsd += valueUsd;
      return {
        symbol: b.asset,
        amount: b.total,
        last_price_usd: priceUsd,
        value_usd: valueUsd,
      };
    });

    // Replace this user's binance-source holdings with the fresh snapshot.
    await admin.from('crypto_holdings').delete().eq('user_id', userId).eq('source', 'binance');
    if (holdings.length > 0) {
      await admin.from('crypto_holdings').insert(
        holdings.map((h) => ({
          user_id: userId,
          symbol: h.symbol,
          amount: h.amount,
          source: 'binance',
          last_price_usd: h.last_price_usd,
          last_synced_at: new Date().toISOString(),
        })),
      );
    }
    await admin
      .from('binance_credentials')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', userId);

    return new Response(JSON.stringify({ totalUsd, holdings }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});
