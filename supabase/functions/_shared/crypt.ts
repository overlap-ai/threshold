// AES-GCM encryption helpers using a base64-encoded key from env.
// The key MUST be 32 bytes (256-bit) random — generate with:
//   openssl rand -base64 32
// then `supabase secrets set BINANCE_ENCRYPTION_KEY=...`

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('BINANCE_ENCRYPTION_KEY');
  if (!raw) throw new Error('BINANCE_ENCRYPTION_KEY env var not set');
  const bytes = base64ToBytes(raw);
  if (bytes.byteLength !== 32) {
    throw new Error('BINANCE_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptString(plaintext: string): Promise<Uint8Array> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  );
  const out = new Uint8Array(iv.byteLength + ct.byteLength);
  out.set(iv, 0);
  out.set(ct, iv.byteLength);
  return out;
}

export async function decryptString(blob: Uint8Array): Promise<string> {
  const key = await getKey();
  const iv = blob.slice(0, 12);
  const ct = blob.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

export { base64ToBytes, bytesToBase64 };
