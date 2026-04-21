/**
 * GET /v1/health — liveness probe; always returns 200.
 * GET /v1/ready  — readiness probe; pings Redis + Supabase.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { redis } from '../../lib/redis.js';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/v1/health', async (_req, reply) => {
    reply.send({ ok: true, ts: new Date().toISOString() });
  });

  fastify.get('/v1/ready', async (_req, reply) => {
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
      // Cheap existence check — `field_concepts` is tiny & always present.
      const { error } = await supabaseAdmin()
        .from('field_concepts')
        .select('openalex_id', { head: true, count: 'exact' })
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
