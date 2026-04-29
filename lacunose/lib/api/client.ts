import { supabase } from '../supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://fn.lacunose.com';

export async function fetchApi(path: string, options: RequestInit = {}) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    // If we can't get a session, sign out so the user isn't stuck.
    await supabase.auth.signOut();
    throw new Error('Your session has expired. Please sign in again.');
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    await supabase.auth.signOut();
    throw new Error('Your session has expired. Please sign in again.');
  }

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  if (res.status !== 204) {
    return res.json();
  }
}
