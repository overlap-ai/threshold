import { useQuery } from '@tanstack/react-query';

interface FxResponse {
  base_code: string;
  rates: Record<string, number>;
  time_last_update_unix: number;
}

const FIAT_TTL_MS = 6 * 60 * 60 * 1000;
const CRYPTO_TTL_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = 'threshold:rates';

const STABLES = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'DAI'];
const TOP_CRYPTOS = [
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'XRP',
  'ADA',
  'DOGE',
  'AVAX',
  'DOT',
  'MATIC',
  'LINK',
  'LTC',
  'ATOM',
  'TRX',
  'NEAR',
  'ARB',
  'OP',
  'TON',
  'SHIB',
  'PEPE',
];

interface Cached<T> {
  value: T;
  fetchedAt: number;
}

function readCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    if (Date.now() - parsed.fetchedAt > ttl) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, fetchedAt: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

async function fetchFiatRates(base: string): Promise<Record<string, number>> {
  const cacheKey = `${STORAGE_PREFIX}:fiat:${base}`;
  const cached = readCache<Record<string, number>>(cacheKey, FIAT_TTL_MS);
  if (cached) return cached;
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error('FX fetch failed');
  const data = (await res.json()) as FxResponse;
  writeCache(cacheKey, data.rates);
  return data.rates;
}

async function fetchCryptoUsdPrices(): Promise<Record<string, number>> {
  const cacheKey = `${STORAGE_PREFIX}:crypto`;
  const cached = readCache<Record<string, number>>(cacheKey, CRYPTO_TTL_MS);
  if (cached) return cached;
  const out: Record<string, number> = {};
  for (const s of STABLES) out[s] = 1;
  try {
    const params = encodeURIComponent(
      JSON.stringify(TOP_CRYPTOS.map((s) => `${s}USDT`)),
    );
    const res = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbols=${params}`,
    );
    if (res.ok) {
      const arr = (await res.json()) as Array<{ symbol: string; price: string }>;
      for (const row of arr) {
        const asset = row.symbol.replace(/USDT$/, '');
        out[asset] = Number(row.price);
      }
    }
  } catch {
    /* leave stables only */
  }
  writeCache(cacheKey, out);
  return out;
}

export function useFxRates(base: string) {
  return useQuery({
    queryKey: ['fx', base],
    staleTime: CRYPTO_TTL_MS,
    queryFn: async (): Promise<Record<string, number>> => {
      const [fiat, cryptoUsd] = await Promise.all([
        fetchFiatRates(base),
        fetchCryptoUsdPrices(),
      ]);
      // open.er-api with base=B includes rates[USD] = USDs per 1 B.
      // For a crypto C, we want rates[C] = Cs per 1 B.
      // Cs per B = Cs per USD * USDs per B = (1 / C_USD) * rates['USD'].
      const usdPerBase = fiat['USD'] ?? (base === 'USD' ? 1 : 0);
      const merged = { ...fiat };
      for (const [sym, usdPrice] of Object.entries(cryptoUsd)) {
        if (usdPrice > 0 && usdPerBase > 0) {
          merged[sym] = usdPerBase / usdPrice;
        }
      }
      return merged;
    },
  });
}

/**
 * Convert `amount` from `from` currency into `base` using the rates map.
 * Rates map format: rates[X] = X units per 1 base.
 */
export function convertTo(
  amount: number,
  from: string,
  base: string,
  rates: Record<string, number> | undefined,
): number {
  if (!rates) return amount;
  if (from === base) return amount;
  const rate = rates[from];
  if (!rate || rate <= 0) return amount;
  return amount / rate;
}

export const SUPPORTED_CRYPTOS = [...STABLES, ...TOP_CRYPTOS];
