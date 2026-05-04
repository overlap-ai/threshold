// Helpers used by the binance-* edge functions.
// Runs on Deno (Supabase Edge runtime).

const BINANCE_BASE = 'https://api.binance.com';

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

export async function fetchBinanceAccount(apiKey: string, apiSecret: string) {
  const ts = Date.now();
  const query = `timestamp=${ts}&recvWindow=10000`;
  const signature = await hmacSha256Hex(apiSecret, query);
  const res = await fetch(`${BINANCE_BASE}/api/v3/account?${query}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Binance ${res.status}: ${text}`);
  }
  const data = (await res.json()) as { balances: BinanceBalance[] };
  return data.balances
    .map((b) => ({
      asset: b.asset,
      free: Number(b.free),
      locked: Number(b.locked),
      total: Number(b.free) + Number(b.locked),
    }))
    .filter((b) => b.total > 0);
}

export async function fetchPricesUsdt(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {};
  const out: Record<string, number> = { USDT: 1, USDC: 1, BUSD: 1, FDUSD: 1, TUSD: 1 };
  const need = symbols.filter((s) => !(s in out));
  if (need.length === 0) return out;
  const params = encodeURIComponent(JSON.stringify(need.map((s) => `${s}USDT`)));
  const res = await fetch(`${BINANCE_BASE}/api/v3/ticker/price?symbols=${params}`);
  if (!res.ok) return out;
  const arr = (await res.json()) as Array<{ symbol: string; price: string }>;
  for (const row of arr) {
    const asset = row.symbol.replace(/USDT$/, '');
    out[asset] = Number(row.price);
  }
  return out;
}
