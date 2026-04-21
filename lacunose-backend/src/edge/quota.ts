/**
 * Tier-based analysis quota enforcement.
 *
 * Read the user's `subscriptions` row, compare `analyses_used_this_period`
 * against the tier cap, and expose an increment helper that calls the
 * SQL `public.increment_analyses_used(user_id)` function from migration 0002.
 */
import type { Tier } from '@lacunose/types';
import { env } from '../lib/env.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

export interface QuotaCheckResult {
  allowed: boolean;
  tier: Tier;
  used: number;
  cap: number;
}

function capForTier(tier: Tier): number {
  switch (tier) {
    case 'premium': return env.PREMIUM_MONTHLY_ANALYSES;
    case 'pro':     return env.PRO_MONTHLY_ANALYSES;
    case 'free':
    default:        return env.FREE_MONTHLY_ANALYSES;
  }
}

function normalizeTier(raw: string | null | undefined): Tier {
  if (raw === 'pro' || raw === 'premium') return raw;
  return 'free';
}

export async function checkAnalysisQuota(userId: string): Promise<QuotaCheckResult> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('subscriptions')
    .select('tier, analyses_used_this_period')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`quota_lookup_failed: ${error.message}`);
  }

  // If no row exists yet (trigger should create one, but defensive), treat as free + 0.
  const tier = normalizeTier(data?.tier as string | undefined);
  const used = Number(data?.analyses_used_this_period ?? 0);
  const cap = capForTier(tier);

  return {
    allowed: used < cap,
    tier,
    used,
    cap,
  };
}

export async function incrementAnalysesUsed(userId: string): Promise<void> {
  const sb = supabaseAdmin();
  const { error } = await sb.rpc('increment_analyses_used', { p_user: userId });
  if (error) {
    throw new Error(`increment_analyses_used_failed: ${error.message}`);
  }
}
