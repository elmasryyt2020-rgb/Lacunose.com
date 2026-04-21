/**
 * POST /v1/webhooks/revenuecat
 *
 * Receives lifecycle events from RevenueCat and upserts the user's
 * `subscriptions` row. Authentication is via a shared bearer token stored
 * in `env.REVENUECAT_WEBHOOK_TOKEN` — NOT a user JWT.
 *
 * Handled event types:
 *   INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE → tier from product_id map
 *   CANCELLATION, EXPIRATION                  → tier='free'
 *   BILLING_ISSUE                             → logged, no tier change
 * Everything else is acknowledged with 200 but ignored.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Tier } from '@lacunose/types';
import { env } from '../../lib/env.js';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { log } from '../../lib/logger.js';

const logger = log.child('edge');

const PRODUCT_TIER_MAP: Record<string, Tier> = {
  'lacunose.pro.monthly': 'pro',
  'lacunose.pro.annual': 'pro',
  'lacunose.premium.monthly': 'premium',
  'lacunose.premium.annual': 'premium',
};

type Platform = 'ios' | 'android';

const EventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string().optional(),
    original_app_user_id: z.string().optional(),
    product_id: z.string().optional(),
    entitlement_ids: z.array(z.string()).optional(),
    entitlement_id: z.string().optional(),
    period_type: z.string().optional(),
    purchased_at_ms: z.number().optional(),
    expiration_at_ms: z.number().optional(),
    store: z.string().optional(),
    environment: z.string().optional(),
  }).passthrough(),
}).passthrough();

function platformFromStore(store: string | undefined): Platform | undefined {
  if (!store) return undefined;
  const s = store.toUpperCase();
  if (s.includes('APP_STORE') || s.includes('APPLE') || s === 'IOS') return 'ios';
  if (s.includes('PLAY') || s.includes('GOOGLE') || s === 'ANDROID') return 'android';
  return undefined;
}

function tierFromProduct(productId: string | undefined): Tier | undefined {
  if (!productId) return undefined;
  return PRODUCT_TIER_MAP[productId];
}

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/v1/webhooks/revenuecat', async (req, reply) => {
    const started = Date.now();
    const token = env.REVENUECAT_WEBHOOK_TOKEN;
    if (!token) {
      logger.error('rc_webhook_token_not_configured');
      reply.code(500).send({ error: 'webhook_not_configured' });
      return;
    }

    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }
    const provided = header.slice('bearer '.length).trim();
    // Constant-time compare.
    if (provided.length !== token.length) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }
    let diff = 0;
    for (let i = 0; i < provided.length; i++) {
      diff |= provided.charCodeAt(i) ^ token.charCodeAt(i);
    }
    if (diff !== 0) {
      reply.code(401).send({ error: 'unauthorized' });
      return;
    }

    const parsed = EventSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn('rc_webhook_invalid_body', {
        reqId: req.id,
        details: parsed.error.flatten(),
      });
      reply.code(400).send({ error: 'invalid_body' });
      return;
    }

    const evt = parsed.data.event;
    const rcAppUserId = evt.app_user_id ?? evt.original_app_user_id;
    if (!rcAppUserId) {
      logger.warn('rc_webhook_no_app_user_id', { reqId: req.id, type: evt.type });
      // Still ack — RC retries indefinitely on non-2xx.
      reply.send({ ok: true });
      return;
    }

    // Map rc_app_user_id → our user. RevenueCat's app_user_id is set by the
    // mobile app to the Supabase user UUID, so the lookup is direct.
    const sb = supabaseAdmin();
    let userId = rcAppUserId;
    const isUuid = /^[0-9a-f-]{36}$/i.test(rcAppUserId);
    if (!isUuid) {
      // Fall back to existing subscription row keyed on rc_app_user_id.
      const { data: existing } = await sb
        .from('subscriptions')
        .select('user_id')
        .eq('rc_app_user_id', rcAppUserId)
        .maybeSingle();
      if (!existing) {
        logger.warn('rc_webhook_unknown_user', { reqId: req.id, rcAppUserId });
        reply.send({ ok: true, skipped: 'unknown_user' });
        return;
      }
      userId = existing.user_id as string;
    }

    const platform = platformFromStore(evt.store);
    const periodStart = evt.purchased_at_ms ? new Date(evt.purchased_at_ms).toISOString() : null;
    const periodEnd = evt.expiration_at_ms ? new Date(evt.expiration_at_ms).toISOString() : null;
    const entitlement = evt.entitlement_id ?? evt.entitlement_ids?.[0];

    let nextTier: Tier | undefined;
    let willRenew: boolean | undefined;

    switch (evt.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
        nextTier = tierFromProduct(evt.product_id) ?? 'pro';
        willRenew = true;
        break;
      case 'CANCELLATION':
        // Keep paid access until expiry; RC will send EXPIRATION at period_end.
        willRenew = false;
        break;
      case 'EXPIRATION':
      case 'SUBSCRIPTION_PAUSED':
        nextTier = 'free';
        willRenew = false;
        break;
      case 'BILLING_ISSUE':
        logger.warn('rc_billing_issue', {
          reqId: req.id,
          userId,
          productId: evt.product_id,
        });
        // No tier change — RC will follow up with EXPIRATION if it isn't resolved.
        break;
      default:
        logger.info('rc_webhook_ignored_type', { reqId: req.id, type: evt.type });
    }

    const update: Record<string, unknown> = {
      user_id: userId,
      rc_app_user_id: rcAppUserId,
      updated_at: new Date().toISOString(),
    };
    if (nextTier) update.tier = nextTier;
    if (platform) update.platform = platform;
    if (periodStart) update.period_start = periodStart;
    if (periodEnd) update.period_end = periodEnd;
    if (entitlement) update.rc_entitlement = entitlement;
    if (willRenew !== undefined) update.will_renew = willRenew;

    const { error: upErr } = await sb
      .from('subscriptions')
      .upsert(update, { onConflict: 'user_id' });

    if (upErr) {
      logger.error('rc_subscription_upsert_failed', {
        reqId: req.id,
        userId,
        err: upErr.message,
      });
      // Return 500 so RC retries.
      reply.code(500).send({ error: 'upsert_failed' });
      return;
    }

    logger.info('rc_webhook_processed', {
      reqId: req.id,
      userId,
      type: evt.type,
      tier: nextTier,
      latencyMs: Date.now() - started,
    });
    reply.send({ ok: true });
  });
};

export default plugin;
