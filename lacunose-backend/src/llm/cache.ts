/**
 * Redis-backed response cache for the LLM layer.
 *
 * Key format: `llm:cache:<sha256(key)>`
 * Value:      JSON-serialized `ChatResponse`
 *
 * The cache is deliberately keyed by an opaque string the caller provides
 * via `opts.cache.key` — we do NOT hash the messages ourselves because the
 * caller often knows a better (more stable) cache key than the raw prompt,
 * e.g. a per-paper section hash. This keeps cache behaviour predictable.
 */
import { createHash } from 'node:crypto';
import type { ChatResponse } from '@lacunose/types';
import { redis } from '../lib/redis.js';
import { log } from '../lib/logger.js';

const clog = log.child('llm:cache');

/**
 * Build the Redis key for a given opaque caller-supplied cache key.
 * Hashing keeps the key length bounded and hides any potentially sensitive
 * content from `KEYS *` operators.
 */
export function cacheKey(key: string): string {
  const digest = createHash('sha256').update(key).digest('hex');
  return `llm:cache:${digest}`;
}

/**
 * Look up a cached `ChatResponse` by caller key. Returns `null` on miss or
 * on any deserialization failure (we treat a malformed entry as a miss
 * rather than a hard error — the call can still go to the provider).
 */
export async function getCached(key: string): Promise<ChatResponse | null> {
  try {
    const raw = await redis().get(cacheKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatResponse;
    return { ...parsed, cached: true };
  } catch (e) {
    clog.warn('cache read failed', { error: (e as Error).message });
    return null;
  }
}

/**
 * Persist a `ChatResponse` under the given caller key with the supplied TTL
 * in seconds. We do not throw on cache write failure — cache problems should
 * never block the caller's primary flow.
 */
export async function setCached(key: string, value: ChatResponse, ttlSec: number): Promise<void> {
  try {
    await redis().set(cacheKey(key), JSON.stringify(value), 'EX', ttlSec);
  } catch (e) {
    clog.warn('cache write failed', { error: (e as Error).message });
  }
}
