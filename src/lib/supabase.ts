import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    'Threshold: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no están configuradas. Copia .env.example a .env.local.',
  );
}

export const supabase = createClient<Database>(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'threshold:auth',
  },
});
