/**
 * GET /v1/health — liveness probe; always returns 200.
 * GET /v1/ready  — readiness probe; pings Redis + Supabase.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { redis } from '../../lib/redis.js';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';

// Bypass the global @fastify/rate-limit so a hot NAT or load-balancer
// health prober doesn't get locked out of /health and /ready.
const RATE_LIMIT_EXEMPT = { config: { rateLimit: false as const } };

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/v1/health', RATE_LIMIT_EXEMPT, async (_req, reply) => {
    reply.send({ ok: true, ts: new Date().toISOString() });
  });

  fastify.get('/v1/ready', RATE_LIMIT_EXEMPT, async (_req, reply) => {
    const checks: Record<string, { ok: boolean; err?: string }> = {
      redis: { ok: false },
      supabase: { ok: false },
    };

    try {
      const pong = await redis().ping();
      checks.redis = { ok: pong === 'PONG' };
    } catch (err) {
      checks.redis = { ok: false, err: (err as Error).message };
    }

    try {
      // Tiny HEAD query against the always-seeded field_concepts table.
      // Use `count:'estimated'` so Postgres doesn't run a full COUNT(*).
      const { error } = await supabaseAdmin()
        .from('field_concepts')
        .select('openalex_id', { head: true, count: 'estimated' })
        .limit(1);
      checks.supabase = { ok: !error, ...(error ? { err: error.message } : {}) };
    } catch (err) {
      checks.supabase = { ok: false, err: (err as Error).message };
    }

    const allOk = Object.values(checks).every((c) => c.ok);
    reply.code(allOk ? 200 : 503).send({ ok: allOk, checks });
  });
};

export default plugin;
