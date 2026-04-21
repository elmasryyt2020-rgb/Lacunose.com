/**
 * Fastify auth plugin. Verifies Supabase-issued HS256 JWTs.
 *
 * Usage:
 *   await fastify.register(authPlugin);
 *   fastify.get('/protected', { preHandler: [fastify.authenticate] }, handler);
 *
 * Verified JWTs decorate the request as `request.user = { id, email }`.
 */
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';

const logger = log.child('edge');

export interface AuthUser {
  id: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user?: AuthUser;
  }
}

interface SupabaseJwtPayload {
  sub?: string;
  email?: string;
  exp?: number;
  iat?: number;
  aud?: string | string[];
  role?: string;
}

async function pluginImpl(fastify: FastifyInstance): Promise<void> {
  const authenticate = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      reply.code(401).send({ error: 'missing_bearer_token' });
      return;
    }
    const token = header.slice('bearer '.length).trim();
    if (!token) {
      reply.code(401).send({ error: 'missing_bearer_token' });
      return;
    }

    let payload: SupabaseJwtPayload;
    try {
      payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
        algorithms: ['HS256'],
        // Reject anon/service-role tokens signed with the same secret by
        // forcing aud=authenticated. Supabase user tokens always have this aud.
        audience: 'authenticated',
      }) as SupabaseJwtPayload;
    } catch (err) {
      logger.warn('jwt_verify_failed', { reqId: req.id, reason: (err as Error).message });
      reply.code(401).send({ error: 'invalid_token' });
      return;
    }

    if (!payload.sub || typeof payload.sub !== 'string') {
      reply.code(401).send({ error: 'invalid_token_payload' });
      return;
    }
    // Also reject anon (role != 'authenticated'); defense in depth vs. aud check.
    if (payload.role && payload.role !== 'authenticated') {
      reply.code(401).send({ error: 'invalid_token_role' });
      return;
    }

    // Sanitize email against RFC-5322 header injection before stashing —
    // it flows into SMTP X-Lacunose-Email header (see supportBridge).
    const rawEmail = typeof payload.email === 'string' ? payload.email : '';
    const email = rawEmail.replace(/[\r\n]+/g, '').slice(0, 254);

    req.user = { id: payload.sub, email };
  };

  fastify.decorate('authenticate', authenticate);
}

const authPlugin: FastifyPluginAsync = fp(pluginImpl, {
  name: 'lacunose-auth',
});

export default authPlugin;
