/**
 * POST /v1/beta/analyze            — create a gap analysis gated by the
 *                                    shared beta invite code (header).
 * GET  /v1/beta/analyze/:id?token=  — poll status + gap_items (no JWT).
 *
 * Shape mirrors /v1/analyses/anonymous but:
 *   - auth is `X-Beta-Invite: <env.BETA_INVITE_CODE>` instead of
 *     device/IP rate limits
 *   - the ingest job is enqueued with `is_anonymous: false` so the user gets
 *     the full 500-paper corpus and 10 ranked gaps (the anonymous path caps
 *     at 200 / 3 for cost)
 *   - the row still carries `is_anonymous: true` so the token-gated polling
 *     endpoint works without a Supabase JWT (the web beta flow has no login)
 *
 * This route is the Day-1 consolidation: it's what both the 6 waitlist beta
 * users AND the demo at lacunose.com/app hit. Judges click "Compare with
 * Haiku" on the results page, which posts to /v1/compare (see compare.ts).
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { IngestJob } from '@lacunose/types';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { log } from '../../lib/logger.js';
import { env } from '../../lib/env.js';
import { ingestQueue } from '../queues.js';

const logger = log.child('edge:beta');

const CreateBetaAnalysisSchema = z.object({
  topic: z.string().min(3).max(500),
  field: z.string().min(1).max(64),
  structured_frame: z.record(z.string(), z.string()).optional(),
  // Stable client-generated id (browser localStorage UUID). Logged + stored
  // for per-user lookup during the beta window but NOT used for rate limiting
  // — the invite code is the throttle.
  device_id: z.string().min(8).max(128),
});

function randomClaimToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function clientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  if (raw) return (raw.split(',')[0] ?? '').trim();
  return req.ip ?? 'unknown';
}

/** Validate the X-Beta-Invite header. Returns true if authorized. */
function checkInvite(headerVal: string | string[] | undefined): boolean {
  const raw = Array.isArray(headerVal) ? headerVal[0] : headerVal;
  if (!raw) return false;
  // Constant-time compare to avoid timing oracles — the invite code is
  // effectively a low-entropy shared secret, but the cost of doing this right
  // is one line.
  const expected = env.BETA_INVITE_CODE;
  if (raw.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < raw.length; i++) {
    diff |= raw.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const plugin: FastifyPluginAsync = async (fastify) => {
  // POST /v1/beta/analyze — create + enqueue.
  fastify.post('/v1/beta/analyze', async (req, reply) => {
    const started = Date.now();
    if (!checkInvite(req.headers['x-beta-invite'])) {
      reply.code(401).send({ error: 'invalid_invite' });
      return;
    }

    const parsed = CreateBetaAnalysisSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { topic, field, structured_frame, device_id } = parsed.data;
    const ip = clientIp(req);

    const sb = supabaseAdmin();
    const claimToken = randomClaimToken();
    const claimExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // The `is_anonymous` field has split semantics in this flow — keeping
    // them separate is intentional, not a bug:
    //   • is_anonymous on the gap_analyses ROW = true. This routes status
    //     polling through the claim-token path (no Supabase JWT required),
    //     which is what the web /app and unauthed mobile onboarding need.
    //   • is_anonymous on the ingest JOB (set below) = false. This makes the
    //     worker pull the full 500-paper corpus and emit 10 ranked gaps, not
    //     the 200/3 teaser the mobile-onboarding anonymous flow uses.
    // The beta path therefore gets "auth-grade output, no-auth polling".
    const { data: inserted, error: insertErr } = await sb
      .from('gap_analyses')
      .insert({
        user_id: null,
        topic,
        field,
        structured_frame: structured_frame ?? null,
        filters: null,
        status: 'queued',
        is_anonymous: true,              // polling uses the anonymous-token path
        anonymous_claim_token: claimToken,
        anonymous_device_id: device_id,
        anonymous_ip: ip,
        claim_expires_at: claimExpires,
      })
      .select('id, status')
      .single();

    if (insertErr || !inserted) {
      logger.error('beta_analysis_insert_failed', { reqId: req.id, err: insertErr?.message });
      reply.code(500).send({ error: 'insert_failed' });
      return;
    }

    const job: IngestJob = {
      analysis_id: inserted.id,
      user_id: null,
      topic,
      field,
      ...(structured_frame ? { structured_frame } : {}),
      // is_anonymous: false on the JOB = full 500-paper corpus + full 10 gaps.
      // The row carries is_anonymous: true separately so polling doesn't need
      // a JWT.
      is_anonymous: false,
    };

    try {
      await ingestQueue.add('ingest', job, {
        jobId: `ingest-${inserted.id}`,
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
      });
    } catch (err) {
      await sb.from('gap_analyses').delete().eq('id', inserted.id);
      logger.error('beta_analysis_enqueue_failed', {
        reqId: req.id,
        err: err instanceof Error ? err.message : String(err),
      });
      reply.code(503).send({ error: 'queue_unavailable' });
      return;
    }

    logger.info('beta_analysis_created', {
      reqId: req.id,
      analysisId: inserted.id,
      deviceId: device_id.slice(0, 8),
      latencyMs: Date.now() - started,
    });
    reply.code(201).send({
      id: inserted.id,
      status: 'queued',
      claim_token: claimToken,
      claim_expires_at: claimExpires,
    });
  });

  // GET /v1/beta/analyze/:id?token=... — poll status + gaps.
  // Same token-gate as anonymous, no invite header needed (the row-level
  // claim_token is itself the capability).
  fastify.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    '/v1/beta/analyze/:id',
    async (req, reply) => {
      const id = req.params.id;
      const token = req.query.token;
      if (!UUID_RE.test(id)) {
        reply.code(400).send({ error: 'invalid_id' });
        return;
      }
      if (!token || token.length < 16) {
        reply.code(401).send({ error: 'missing_token' });
        return;
      }

      const sb = supabaseAdmin();
      const { data: analysis, error } = await sb
        .from('gap_analyses')
        .select('id, topic, field, status, error, created_at, completed_at, cost_tokens, is_anonymous, anonymous_claim_token')
        .eq('id', id)
        .maybeSingle();
      if (error || !analysis) {
        reply.code(404).send({ error: 'not_found' });
        return;
      }
      if (!analysis.is_anonymous || analysis.anonymous_claim_token !== token) {
        reply.code(404).send({ error: 'not_found' });
        return;
      }

      const { data: gaps, error: gErr } = await sb
        .from('gap_items')
        .select('*')
        .eq('analysis_id', id)
        .order('rank', { ascending: true });
      if (gErr) {
        reply.code(500).send({ error: 'gap_items_failed' });
        return;
      }

      const { anonymous_claim_token: _omit, ...safe } = analysis as typeof analysis;
      reply.send({ analysis: safe, gaps: gaps ?? [] });
    },
  );
};

export default plugin;
