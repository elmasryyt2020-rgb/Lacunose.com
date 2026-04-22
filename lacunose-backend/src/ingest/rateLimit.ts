/**
 * Redis token-bucket rate limiter, one bucket per source.
 *
 * Keys:
 *   rl:<source>:tokens   — current token count (float stored as string)
 *   rl:<source>:ts       — last-refill timestamp in ms
 *
 * A Lua script does the atomic CAS so concurrent acquires don't oversubscribe.
 * Each adapter calls `await limiter.acquire()` before every HTTP call.
 */
import { redis } from '../lib/redis.js';
import { log } from '../lib/logger.js';

export interface Limiter {
  acquire(): Promise<void>;
}

/**
 * Lua: refill tokens based on elapsed time, then try to consume 1.
 * Returns 0 if a token was consumed, else the wait-time in ms until one will be.
 *
 * KEYS[1] = rl:<src>:tokens
 * KEYS[2] = rl:<src>:ts
 * ARGV[1] = rate per sec
 * ARGV[2] = burst
 * ARGV[3] = now (ms)
 */
const LUA = `
local tokens_key = KEYS[1]
local ts_key     = KEYS[2]
local rate       = tonumber(ARGV[1])
local burst      = tonumber(ARGV[2])
local now        = tonumber(ARGV[3])

local tokens = tonumber(redis.call('GET', tokens_key))
local ts     = tonumber(redis.call('GET', ts_key))
if tokens == nil then tokens = burst end
if ts == nil then ts = now end

local elapsed = math.max(0, now - ts) / 1000.0
tokens = math.min(burst, tokens + elapsed * rate)

local wait = 0
if tokens >= 1 then
  tokens = tokens - 1
else
  wait = math.ceil(((1 - tokens) / rate) * 1000)
end

redis.call('SET', tokens_key, tostring(tokens), 'EX', 3600)
redis.call('SET', ts_key,     tostring(now),    'EX', 3600)
return wait
`;

const logger = log.child('ingest:ratelimit');

class RedisTokenBucket implements Limiter {
  private tokensKey: string;
  private tsKey: string;

  constructor(
    private source: string,
    private ratePerSec: number,
    private burst: number,
  ) {
    this.tokensKey = `rl:${source}:tokens`;
    this.tsKey = `rl:${source}:ts`;
  }

  async acquire(): Promise<void> {
    // Retry loop — if Redis says we need to wait N ms, sleep then retry.
    // Cap retries so a broken Redis doesn't hang us forever.
    for (let attempt = 0; attempt < 20; attempt++) {
      const now = Date.now();
      let waitMs: number;
      try {
        const res = await redis().eval(
          LUA,
          2,
          this.tokensKey,
          this.tsKey,
          String(this.ratePerSec),
          String(this.burst),
          String(now),
        );
        waitMs = Number(res);
      } catch (e) {
        // If Redis is unavailable, fall back to a small in-process sleep
        // rather than blocking the whole ingest. Log loudly.
        logger.warn('redis rate-limit eval failed; degrading to fixed sleep', {
          source: this.source,
          error: (e as Error).message,
        });
        await sleep(Math.ceil(1000 / this.ratePerSec));
        return;
      }

      if (waitMs <= 0) return;
      await sleep(Math.min(waitMs, 5_000));
    }
    logger.error('rate-limit acquire exhausted retries', { source: this.source });
    // Proceed anyway; better to make one extra call than to stall forever.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const CACHE = new Map<string, Limiter>();

export function limiterFor(source: string, ratePerSec: number, burst?: number): Limiter {
  const key = `${source}@${ratePerSec}`;
  const existing = CACHE.get(key);
  if (existing) return existing;
  const l = new RedisTokenBucket(source, ratePerSec, burst ?? Math.max(1, Math.ceil(ratePerSec)));
  CACHE.set(key, l);
  return l;
}

/** Default per-source limits used throughout the ingest layer. */
export const DEFAULT_LIMITS: Record<string, { rate: number; burst: number }> = {
  openalex:  { rate: 10,    burst: 10 },
  // S2 anonymous tier returns 429 well before 1 req/s. Throttle to 1 per 3s
  // until authenticated — at which point this should be bumped back to 10/s.
  s2:        { rate: 0.33,  burst: 1 },
  crossref:  { rate: 50,    burst: 50 },
  pubmed:    { rate: 10,    burst: 10 },
  europepmc: { rate: 10,    burst: 10 },
  arxiv:     { rate: 0.33,  burst: 1 },
  unpaywall: { rate: 10,    burst: 10 },
};

/** Convenience factory using DEFAULT_LIMITS. */
export function defaultLimiter(source: keyof typeof DEFAULT_LIMITS): Limiter {
  const spec = DEFAULT_LIMITS[source];
  if (!spec) throw new Error(`no default limit for source=${source}`);
  return limiterFor(source, spec.rate, spec.burst);
}
