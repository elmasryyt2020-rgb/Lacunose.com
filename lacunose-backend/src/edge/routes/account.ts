/**
 * POST /v1/account/delete
 *
 * Permanently deletes the authenticated user's auth.users row. All owned
 * tables (gap_analyses, support_threads, notifications, push_tokens,
 * subscriptions, …) cascade-delete via `on delete cascade` constraints.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { log } from '../../lib/logger.js';

const logger = log.child('edge');

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/v1/account/delete', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const started = Date.now();
    const user = req.user!;
    const sb = supabaseAdmin();

    const { error } = await sb.auth.admin.deleteUser(user.id);
    if (error) {
      logger.error('account_delete_failed', {
        reqId: req.id,
        userId: user.id,
        err: error.message,
      });
      reply.code(500).send({ error: 'delete_failed' });
      return;
    }

    logger.info('account_deleted', {
      reqId: req.id,
      userId: user.id,
      latencyMs: Date.now() - started,
    });
    reply.code(204).send();
  });
};

export default plugin;
