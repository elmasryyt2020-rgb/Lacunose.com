/**
 * Per-user token-bucket rate limiting on top of Redis.
 *
 * Separate from:
 *   - the global IP @fastify/rate-limit ceiling
 *   - the ingest-adapter per-source polite limits
 *
 * Strategy: sliding-window counters using Redis INCR + EXPIRE, plus a short
 * "burst" window. For each action we enforce both a short burst cap and a
 * longer steady cap. Simple, deterministic, and resilient to process restart.
 */
import { redis } from '../lib/redis.js';

export type RateAction = 'analysis' | 'support';

export interface RateCheckResult {
  allowed: boolean;
  retryAfterSec?: number;
}

interface Window {
  key: string;
  max: number;
  windowSec: number;
}

interface Policy {
  windows: Window[];
}

function policyFor(userId: string, action: RateAction, perMin?: number): Policy {
  if (action === 'analysis') {
    return {
      windows: [
        // burst: 3 per 10s
        { key: `rl:${action}:${userId}:burst`, max: 3, windowSec: 10 },
        // steady: 60 per 60s (≈1/sec)
        { key: `rl:${action}:${userId}:steady`, max: perMin ?? 60, windowSec: 60 },
      ],
    };
  }
  // support: 10/hour by default
  return {
    windows: [
      { key: `rl:${action}:${userId}:hour`, max: perMin ?? 10, windowSec: 60 * 60 },
    ],
  };
}

/**
 * Increment counters for each configured window and return whether the call
 * is allowed. On reject, retryAfterSec is the longest remaining TTL of the
 * windows that tripped.
 */
export async function checkUserRate(
  userId: string,
  action: RateAction,
  opts?: { perMin?: number }
): Promise<RateCheckResult> {
  if (!userId) return { allowed: false, retryAfterSec: 1 };
  const client = redis();
  const { windows } = policyFor(userId, action, opts?.perMin);

  let worstRetry = 0;
  let blocked = false;

  for (const w of windows) {
    const count = await client.incr(w.key);
    if (count === 1) {
      await client.expire(w.key, w.windowSec);
    }
    if (count > w.max) {
      blocked = true;
      const ttl = await client.ttl(w.key);
      const retry = ttl > 0 ? ttl : w.windowSec;
      if (retry > worstRetry) worstRetry = retry;
    }
  }

  if (blocked) {
    return { allowed: false, retryAfterSec: worstRetry };
  }
  return { allowed: true };
}
