/**
 * Onboarding storage + helpers.
 *
 * The onboarding flow is unauthenticated: the mobile client creates a
 * persistent `device_id` on first launch, runs a trimmed teaser analysis
 * via /v1/analyses/anonymous, polls for results, then gates the full gap
 * list behind sign-up. After signup, AuthProvider calls `claimAnonymous()`
 * which re-attaches the teaser to the new user's account.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const STORAGE_KEY_DEVICE_ID = 'lacunose:device_id';
const STORAGE_KEY_PENDING_CLAIM = 'lacunose:pending_claim';
const STORAGE_KEY_ONBOARDING_TOPIC = 'lacunose:onboarding_topic';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://fn.lacunose.com';

export interface PendingClaim {
  analysis_id: string;
  claim_token: string;
  claim_expires_at: string;
}

/**
 * Stable per-install identifier. Generated once on first call, persisted
 * forever in AsyncStorage. 32-hex = 128 bits, no PII.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(STORAGE_KEY_DEVICE_ID);
  if (existing && existing.length >= 16) return existing;
  const fresh = Crypto.randomUUID().replace(/-/g, '');
  await AsyncStorage.setItem(STORAGE_KEY_DEVICE_ID, fresh);
  return fresh;
}

export async function savePendingClaim(claim: PendingClaim): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_PENDING_CLAIM, JSON.stringify(claim));
}

export async function loadPendingClaim(): Promise<PendingClaim | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_PENDING_CLAIM);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingClaim;
    if (!parsed.analysis_id || !parsed.claim_token) return null;
    // Silently expire stale claims — server will refuse them anyway.
    if (new Date(parsed.claim_expires_at).getTime() < Date.now()) {
      await clearPendingClaim();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function clearPendingClaim(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY_PENDING_CLAIM);
}

export async function saveOnboardingTopic(topic: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY_ONBOARDING_TOPIC, topic);
}

export async function loadOnboardingTopic(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY_ONBOARDING_TOPIC);
}

/**
 * Fire-and-forget: POST /v1/analyses/anonymous. Returns { id, claim_token }.
 * Caller should savePendingClaim() on success so a later signup can claim it.
 */
export async function submitAnonymousAnalysis(payload: {
  topic: string;
  field: string;
  structured_frame?: Record<string, string>;
}): Promise<{ id: string; claim_token: string; claim_expires_at: string }> {
  const device_id = await getOrCreateDeviceId();
  const res = await fetch(`${API_BASE}/v1/analyses/anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, device_id }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `anon_submit_${res.status}`);
  }
  const data = (await res.json()) as {
    id: string;
    claim_token: string;
    claim_expires_at: string;
  };
  return data;
}

/**
 * Poll /v1/analyses/anonymous/:id — we don't use Realtime for anon users
 * because the RLS policy on gap_items requires auth.uid() to match the
 * analysis's user_id (which is null for anon). Polling every ~2s is fine
 * for a 60s onboarding flow and avoids the RLS gymnastics.
 */
export async function pollAnonymousAnalysis(
  analysisId: string,
  claimToken: string,
): Promise<{
  analysis: {
    id: string;
    topic: string;
    field: string;
    status: 'queued' | 'running' | 'done' | 'failed';
    error: string | null;
    created_at: string;
    completed_at: string | null;
  };
  gaps: Array<{
    id: string;
    rank: number | null;
    title: string;
    description: string | null;
    category: string;
    novelty_score: number | null;
    feasibility_score: number | null;
    evidence_density: number | null;
    evidence: unknown;
  }>;
}> {
  const url = `${API_BASE}/v1/analyses/anonymous/${analysisId}?token=${encodeURIComponent(claimToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `anon_poll_${res.status}`);
  }
  return res.json();
}

/**
 * Called by AuthProvider after a successful signup. If there's a pending
 * onboarding claim in storage, POST it so the teaser analysis becomes part
 * of the user's library.
 */
export async function claimAnonymousIfPending(accessToken: string): Promise<string | null> {
  const pending = await loadPendingClaim();
  if (!pending) return null;
  try {
    const res = await fetch(`${API_BASE}/v1/analyses/${pending.analysis_id}/claim`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ claim_token: pending.claim_token }),
    });
    if (!res.ok) {
      // 404/410 = expired or already-claimed; drop the pending record.
      if (res.status === 404) await clearPendingClaim();
      return null;
    }
    await clearPendingClaim();
    return pending.analysis_id;
  } catch {
    // Network error — keep the pending claim so we retry on next auth state change.
    return null;
  }
}
