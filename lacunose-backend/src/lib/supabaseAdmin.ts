/**
 * Server-side Supabase client with the service-role key.
 * Bypasses RLS — only usable inside workers and edge-fn handlers.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

let _client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!_client) {
    _client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { 'X-Client-Info': 'lacunose-backend' } },
    });
  }
  return _client;
}
