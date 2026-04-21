#!/usr/bin/env tsx
/**
 * Lacunose edge-fn — public HTTP API.
 *
 * Runs as a standalone Node process (PM2 on the VPS). Fronted by Nginx/Caddy
 * for TLS. Workers consume from BullMQ queues independently; this process
 * only ever enqueues jobs and responds to the mobile app.
 */
import '../lib/env.js'; // side-effect: validates env, exits non-zero on failure
import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { redis } from '../lib/redis.js';

import authPlugin from './auth.js';
import analysesRoutes from './routes/analyses.js';
import supportRoutes from './routes/support.js';
import webhookRoutes from './routes/webhooks.js';
import accountRoutes from './routes/account.js';
import pushRoutes from './routes/push.js';
import healthRoutes from './routes/health.js';
import { verifyModelsOnBoot } from '../llm/verifyModels.js';
import { closeAllQueues } from './queues.js';

const logger = log.child('edge');

async function main(): Promise<void> {
  const app = Fastify({
    trustProxy: true,
    disableRequestLogging: true,
    genReqId: () =>
      'req_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    bodyLimit: 1_048_576, // 1 MiB; webhooks + support messages are well under
  });

  // Per-request log on response — never echoes auth header.
  app.addHook('onRequest', async (req) => {
    (req as FastifyRequest & { _startedAt?: number })._startedAt = Date.now();
  });
  app.addHook('onResponse', async (req, reply) => {
    const started = (req as FastifyRequest & { _startedAt?: number })._startedAt ?? Date.now();
    logger.info('http', {
      reqId: req.id,
      method: req.method,
      path: req.url,
      status: reply.statusCode,
      userId: req.user?.id,
      latencyMs: Date.now() - started,
    });
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: (origin, cb) => {
      // No Origin header = native mobile app — allow.
      if (!origin) return cb(null, true);
      const allowed = [
        /^https:\/\/lacunose\.com$/,
        /^https:\/\/.*\.lacunose\.com$/,
        /^exp:\/\//,
        /^lacunose:\/\//,
      ];
      if (allowed.some((re) => re.test(origin))) return cb(null, true);
      cb(new Error('not_allowed_by_cors'), false);
    },
    credentials: true,
  });
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    redis: redis(),
    keyGenerator: (req) => req.ip,
  });

  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(analysesRoutes);
  await app.register(supportRoutes);
  await app.register(webhookRoutes);
  await app.register(accountRoutes);
  await app.register(pushRoutes);

  // Global error handler — never leaks stack traces.
  app.setErrorHandler((err, req: FastifyRequest, reply: FastifyReply) => {
    const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
    logger.error('unhandled_error', {
      reqId: req.id,
      userId: req.user?.id,
      path: req.url,
      method: req.method,
      status,
      msg: err.message,
      code: err.code,
    });
    if (reply.sent) return;
    const payload =
      status < 500
        ? { error: err.code ?? 'bad_request', message: err.message }
        : { error: 'internal_error' };
    reply.code(status).send(payload);
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({ error: 'not_found', path: req.url });
  });

  // Graceful shutdown — stop accepting requests, drain BullMQ queue
  // connections, then exit. Without closing the queues, SIGTERM leaves
  // Redis sockets open and PM2 eventually SIGKILLs us.
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('shutdown_start', { signal });
    try {
      await app.close();
    } catch (err) {
      logger.error('shutdown_close_failed', { err: (err as Error).message });
    }
    try {
      await closeAllQueues();
    } catch (err) {
      logger.error('shutdown_queues_failed', { err: (err as Error).message });
    }
    try {
      redis().disconnect();
    } catch {}
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: env.EDGE_FN_PORT, host: env.EDGE_FN_HOST });
    logger.info('edge_fn_listening', { port: env.EDGE_FN_PORT, host: env.EDGE_FN_HOST });
    // Fire-and-forget model verification so first-analysis failures are
    // avoided when the configured Opus/Haiku IDs drift in the Anthropic
    // catalog. Logs a warning; never crashes the process.
    void verifyModelsOnBoot();
  } catch (err) {
    logger.error('edge_fn_listen_failed', { err: (err as Error).message });
    process.exit(1);
  }
}

void main();
