import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://api.lacunose.com';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

let supabase: SupabaseClient;

/**
 * Custom fetch wrapper that intercepts 401 responses from Supabase auth
 * endpoints. When a token has expired or is invalid, the client auto-refresh
 * may fail (e.g. revoked refresh token). Rather than leaving the app in a
 * broken state, we sign the user out so they can re-authenticate.
 */
const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const res = await fetch(input, init);
  if (res.status === 401) {
    const body = (await res.clone().json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      error_description?: string;
    };
    const msg = body.message ?? body.error ?? body.error_description ?? '';
    if (msg.toLowerCase().includes('token') || msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('invalid')) {
      // Fire-and-forget sign-out to clear the stale session. We schedule it
      // on the next tick so the current fetch can return its response first.
      setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        supabase?.auth.signOut();
      }, 0);
    }
  }
  return res;
};

supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: { fetch: customFetch },
});

export { supabase };
