/**
 * POST /v1/push/register
 *
 * Upsert an Expo push token for the authenticated user. Called on app launch
 * and on permission change. Idempotent.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { RegisterPushTokenRequest } from '@lacunose/types';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { log } from '../../lib/logger.js';

const logger = log.child('edge');

const RegisterSchema = z.object({
  token: z.string().min(5).max(500),
  platform: z.enum(['ios', 'android']),
}) satisfies z.ZodType<RegisterPushTokenRequest>;

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/v1/push/register', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const started = Date.now();
    const user = req.user!;
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;

    const sb = supabaseAdmin();
    const { error } = await sb
      .from('push_tokens')
      .upsert(
        {
          user_id: user.id,
          token: body.token,
          platform: body.platform,
        },
        { onConflict: 'user_id,token' }
      );
    if (error) {
      logger.error('push_register_failed', {
        reqId: req.id,
        userId: user.id,
        err: error.message,
      });
      reply.code(500).send({ error: 'upsert_failed' });
      return;
    }

    logger.info('push_registered', {
      reqId: req.id,
      userId: user.id,
      platform: body.platform,
      latencyMs: Date.now() - started,
    });
    reply.code(204).send();
  });
};

export default plugin;
