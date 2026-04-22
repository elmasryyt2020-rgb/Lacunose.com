/**
 * POST   /v1/analyses            — create + enqueue a gap analysis
 * GET    /v1/analyses            — list the user's analyses (latest 50)
 * GET    /v1/analyses/:id        — fetch one analysis + its ordered gap_items
 * POST   /v1/analyses/:id/export — export as Markdown (PDF: 501, see v1.1)
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import MarkdownIt from 'markdown-it';
import type {
  CreateAnalysisRequest,
  CreateAnalysisResponse,
  ExportAnalysisResponse,
  GapEvidence,
  IngestJob,
} from '@lacunose/types';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { log } from '../../lib/logger.js';
import { checkUserRate } from '../rateLimit.js';
import { tryConsumeAnalysis } from '../quota.js';
import { ingestQueue } from '../queues.js';

const logger = log.child('edge');
const md = new MarkdownIt({ html: false, linkify: true });

const CreateAnalysisSchema = z.object({
  topic: z.string().min(3).max(500),
  field: z.string().min(1).max(64),
  structured_frame: z.record(z.string(), z.string()).optional(),
  filters: z
    .object({
      years: z.tuple([z.number().int(), z.number().int()]).optional(),
      include_preprints: z.boolean().optional(),
      open_access_only: z.boolean().optional(),
      study_designs: z.array(z.string()).optional(),
    })
    .optional(),
  concept_id: z.string().optional(),
}) satisfies z.ZodType<CreateAnalysisRequest>;

const CreateAnonymousAnalysisSchema = z.object({
  topic: z.string().min(3).max(500),
  field: z.string().min(1).max(64),
  structured_frame: z.record(z.string(), z.string()).optional(),
  // Device ID is any stable unguessable string the mobile app generates once
  // on first launch (AsyncStorage). Used for rate-limiting + binding the
  // claim token to the device.
  device_id: z.string().min(8).max(128),
});

const ClaimAnalysisSchema = z.object({
  claim_token: z.string().min(16).max(128),
});

function clientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  // Caddy sets X-Forwarded-For. Fall back to req.ip (Fastify) otherwise.
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  if (raw) return (raw.split(',')[0] ?? '').trim();
  return req.ip ?? 'unknown';
}

function randomClaimToken(): string {
  // 32 hex chars = 128 bits. crypto.randomUUID() format works but we want
  // a flat string with no dashes so it's URL-safe.
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const ExportSchema = z.object({
  format: z.enum(['pdf', 'md']),
});

interface GapItemRow {
  id: string;
  rank: number | null;
  title: string | null;
  description: string | null;
  category: string;
  novelty_score: number | null;
  feasibility_score: number | null;
  evidence_density: number | null;
  research_question: string | null;
  suggested_method: string | null;
  suggested_n: number | null;
  suggested_duration_months: number | null;
  evidence: GapEvidence[] | null;
  created_at: string;
}

interface AnalysisRow {
  id: string;
  user_id: string;
  topic: string;
  field: string;
  structured_frame: Record<string, string> | null;
  filters: Record<string, unknown> | null;
  status: string;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

function renderAnalysisMarkdown(analysis: AnalysisRow, gaps: GapItemRow[]): string {
  const lines: string[] = [];
  lines.push(`# Gap analysis: ${analysis.topic}`);
  lines.push('');
  lines.push(`**Field:** ${analysis.field}`);
  lines.push(`**Status:** ${analysis.status}`);
  lines.push(`**Created:** ${analysis.created_at}`);
  if (analysis.completed_at) lines.push(`**Completed:** ${analysis.completed_at}`);
  if (analysis.structured_frame && Object.keys(analysis.structured_frame).length > 0) {
    lines.push('');
    lines.push('## Structured frame');
    for (const [k, v] of Object.entries(analysis.structured_frame)) {
      lines.push(`- **${k}:** ${v}`);
    }
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  if (gaps.length === 0) {
    lines.push('_No gaps produced yet._');
    return lines.join('\n');
  }

  for (const g of gaps) {
    lines.push(`## ${g.rank ?? '?'}. ${g.title ?? '(untitled gap)'}`);
    lines.push('');
    lines.push(`**Category:** ${g.category}`);
    lines.push(
      `**Novelty:** ${g.novelty_score ?? 'n/a'} — ` +
        `**Feasibility:** ${g.feasibility_score ?? 'n/a'} — ` +
        `**Evidence density:** ${g.evidence_density ?? 'n/a'}`
    );
    if (g.description) {
      lines.push('');
      lines.push(g.description);
    }
    if (g.research_question) {
      lines.push('');
      lines.push(`**Research question:** ${g.research_question}`);
    }
    if (g.suggested_method) {
      lines.push(`**Suggested method:** ${g.suggested_method}`);
    }
    if (g.suggested_n != null) lines.push(`**Suggested N:** ${g.suggested_n}`);
    if (g.suggested_duration_months != null) {
      lines.push(`**Suggested duration:** ${g.suggested_duration_months} months`);
    }
    const evidence = g.evidence ?? [];
    if (evidence.length > 0) {
      lines.push('');
      lines.push('### Evidence');
      for (const e of evidence) {
        const title = e.paper_title ?? '(untitled)';
        const year = e.paper_year ? ` (${e.paper_year})` : '';
        const venue = e.paper_venue ? ` — ${e.paper_venue}` : '';
        const authors = e.paper_authors ? `${e.paper_authors}. ` : '';
        lines.push(`- ${authors}_${title}_${year}${venue}`);
        lines.push(`  > ${e.quote.replace(/\n+/g, ' ')}`);
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // POST /v1/analyses
  fastify.post('/v1/analyses', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const started = Date.now();
    const user = req.user!;
    const parsed = CreateAnalysisSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const body = parsed.data;

    // Rate limit.
    const rate = await checkUserRate(user.id, 'analysis');
    if (!rate.allowed) {
      reply
        .header('Retry-After', String(rate.retryAfterSec ?? 1))
        .code(429)
        .send({ error: 'rate_limited', retry_after_sec: rate.retryAfterSec });
      return;
    }

    // Atomic quota consume — eliminates TOCTOU race where two concurrent
    // submits both pass a non-atomic check-then-increment.
    const quota = await tryConsumeAnalysis(user.id);
    if (!quota.allowed) {
      reply.code(402).send({
        error: 'quota_exceeded',
        tier: quota.tier,
        used: quota.used,
        cap: quota.cap,
      });
      return;
    }

    const sb = supabaseAdmin();
    const { data: inserted, error: insertErr } = await sb
      .from('gap_analyses')
      .insert({
        user_id: user.id,
        topic: body.topic,
        field: body.field,
        structured_frame: body.structured_frame ?? null,
        filters: body.filters ?? null,
        status: 'queued',
      })
      .select('id, status')
      .single();

    if (insertErr || !inserted) {
      logger.error('analysis_insert_failed', {
        reqId: req.id,
        userId: user.id,
        err: insertErr?.message,
      });
      // Refund the slot we just consumed — insert failed so nothing runs.
      try { await sb.rpc('decrement_analyses_used', { p_user: user.id }); } catch { /* swallow */ }
      reply.code(500).send({ error: 'insert_failed' });
      return;
    }

    const job: IngestJob = {
      analysis_id: inserted.id,
      user_id: user.id,
      topic: body.topic,
      field: body.field,
      ...(body.structured_frame ? { structured_frame: body.structured_frame } : {}),
      ...(body.filters ? { filters: body.filters } : {}),
      ...(body.concept_id ? { concept_id: body.concept_id } : {}),
    };
    try {
      await ingestQueue.add('ingest', job, {
        jobId: `ingest-${inserted.id}`,
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
      });
    } catch (err) {
      // Queue unreachable — roll back both the analysis row and the consumed slot.
      await sb.from('gap_analyses').delete().eq('id', inserted.id);
      try { await sb.rpc('decrement_analyses_used', { p_user: user.id }); } catch { /* swallow */ }
      logger.error('analysis_enqueue_failed', {
        reqId: req.id,
        userId: user.id,
        err: err instanceof Error ? err.message : String(err),
      });
      reply.code(503).send({ error: 'queue_unavailable' });
      return;
    }

    const resp: CreateAnalysisResponse = { id: inserted.id, status: 'queued' };
    logger.info('analysis_created', {
      reqId: req.id,
      userId: user.id,
      analysisId: inserted.id,
      latencyMs: Date.now() - started,
    });
    reply.code(201).send(resp);
  });

  // GET /v1/analyses
  fastify.get('/v1/analyses', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const started = Date.now();
    const user = req.user!;
    const sb = supabaseAdmin();

    const { data: rows, error } = await sb
      .from('gap_analyses')
      .select('id, topic, field, status, error, created_at, completed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('analyses_list_failed', { reqId: req.id, userId: user.id, err: error.message });
      reply.code(500).send({ error: 'list_failed' });
      return;
    }

    const ids = (rows ?? []).map((r) => r.id as string);
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      // Select minimal columns — aggregate client-side (Supabase PostgREST
      // group-by is awkward for JSON responses, and N is bounded at 50).
      const { data: gapRows, error: gapErr } = await sb
        .from('gap_items')
        .select('analysis_id')
        .in('analysis_id', ids);
      if (gapErr) {
        logger.warn('gap_count_lookup_failed', { reqId: req.id, err: gapErr.message });
      } else {
        for (const g of gapRows ?? []) {
          const aid = g.analysis_id as string;
          counts[aid] = (counts[aid] ?? 0) + 1;
        }
      }
    }

    const out = (rows ?? []).map((r) => ({
      ...r,
      gap_count: counts[r.id as string] ?? 0,
    }));

    logger.info('analyses_listed', {
      reqId: req.id,
      userId: user.id,
      n: out.length,
      latencyMs: Date.now() - started,
    });
    reply.send({ analyses: out });
  });

  // GET /v1/analyses/:id
  fastify.get<{ Params: { id: string } }>(
    '/v1/analyses/:id',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const started = Date.now();
      const user = req.user!;
      const id = req.params.id;
      // Strict RFC-4122 UUID; loose regex (36-char) accepts `-` * 36.
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        reply.code(400).send({ error: 'invalid_id' });
        return;
      }

      const sb = supabaseAdmin();
      const { data: analysis, error } = await sb
        .from('gap_analyses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        logger.error('analysis_get_failed', { reqId: req.id, userId: user.id, err: error.message });
        reply.code(500).send({ error: 'lookup_failed' });
        return;
      }
      if (!analysis) {
        reply.code(404).send({ error: 'not_found' });
        return;
      }
      // Defense-in-depth ownership check. RLS on gap_analyses normally catches
      // this, but the service-role client bypasses RLS so we enforce manually.
      if (analysis.user_id !== user.id) {
        reply.code(404).send({ error: 'not_found' });
        return;
      }

      const { data: gaps, error: gErr } = await sb
        .from('gap_items')
        .select('*')
        .eq('analysis_id', id)
        .order('rank', { ascending: true });

      if (gErr) {
        logger.error('gap_items_get_failed', { reqId: req.id, err: gErr.message });
        reply.code(500).send({ error: 'gap_items_failed' });
        return;
      }

      logger.info('analysis_fetched', {
        reqId: req.id,
        userId: user.id,
        analysisId: id,
        latencyMs: Date.now() - started,
      });
      reply.send({ analysis, gaps: gaps ?? [] });
    }
  );

  // POST /v1/analyses/:id/export
  fastify.post<{ Params: { id: string } }>(
    '/v1/analyses/:id/export',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const started = Date.now();
      const user = req.user!;
      const id = req.params.id;
      // Strict RFC-4122 UUID; loose regex (36-char) accepts `-` * 36.
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        reply.code(400).send({ error: 'invalid_id' });
        return;
      }

      const parsed = ExportSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
        return;
      }
      const { format } = parsed.data;

      const sb = supabaseAdmin();
      const { data: analysis, error } = await sb
        .from('gap_analyses')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error || !analysis) {
        reply.code(404).send({ error: 'not_found' });
        return;
      }
      if (analysis.user_id !== user.id) {
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

      const markdown = renderAnalysisMarkdown(analysis as AnalysisRow, (gaps ?? []) as GapItemRow[]);
      // markdown-it: render to HTML purely to validate the structure parses.
      // Result is discarded — we ship Markdown source.
      try { md.render(markdown); } catch { /* ignore */ }

      if (format === 'pdf') {
        // PDF export ships in v1.1 — @react-pdf/renderer isn't trivially Node-only.
        // We still return the Markdown as a helpful fallback, but signal 501.
        reply.code(501).send({
          error: 'pdf_export_not_implemented',
          message: 'PDF export ships in v1.1. Use format="md" for now.',
          fallback_markdown: markdown,
        });
        return;
      }

      // Upload to Supabase Storage bucket `exports`.
      const path = `${user.id}/${id}.md`;
      const { error: upErr } = await sb.storage
        .from('exports')
        .upload(path, Buffer.from(markdown, 'utf8'), {
          contentType: 'text/markdown; charset=utf-8',
          upsert: true,
        });
      if (upErr) {
        logger.error('export_upload_failed', {
          reqId: req.id,
          userId: user.id,
          err: upErr.message,
        });
        reply.code(500).send({ error: 'upload_failed' });
        return;
      }

      const { data: signed, error: signErr } = await sb.storage
        .from('exports')
        .createSignedUrl(path, 60 * 60);
      if (signErr || !signed) {
        logger.error('export_sign_failed', {
          reqId: req.id,
          userId: user.id,
          err: signErr?.message,
        });
        reply.code(500).send({ error: 'sign_failed' });
        return;
      }

      const resp: ExportAnalysisResponse = {
        url: signed.signedUrl,
        format: 'md',
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
      logger.info('analysis_exported', {
        reqId: req.id,
        userId: user.id,
        analysisId: id,
        latencyMs: Date.now() - started,
      });
      reply.send(resp);
    }
  );

  // POST /v1/analyses/anonymous — create a teaser analysis for onboarding.
  // No JWT required. Rate-limited per device AND per IP to prevent abuse.
  fastify.post('/v1/analyses/anonymous', async (req, reply) => {
    const started = Date.now();
    const parsed = CreateAnonymousAnalysisSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { topic, field, structured_frame, device_id } = parsed.data;
    const ip = clientIp(req);

    const sb = supabaseAdmin();

    // Rate limit: 2 anonymous analyses per device per 24h, 5 per IP per 24h.
    // Exceeding either cap returns 429 — gently guides abusers toward the
    // authenticated flow.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: deviceCount } = await sb
      .from('gap_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('anonymous_device_id', device_id)
      .gte('created_at', since);
    if ((deviceCount ?? 0) >= 2) {
      reply.code(429).send({ error: 'anon_device_rate_limited', retry_after_sec: 86400 });
      return;
    }
    const { count: ipCount } = await sb
      .from('gap_analyses')
      .select('id', { count: 'exact', head: true })
      .eq('anonymous_ip', ip)
      .gte('created_at', since);
    if ((ipCount ?? 0) >= 5) {
      reply.code(429).send({ error: 'anon_ip_rate_limited', retry_after_sec: 86400 });
      return;
    }

    const claimToken = randomClaimToken();
    const claimExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error: insertErr } = await sb
      .from('gap_analyses')
      .insert({
        user_id: null,
        topic,
        field,
        structured_frame: structured_frame ?? null,
        filters: null,
        status: 'queued',
        is_anonymous: true,
        anonymous_claim_token: claimToken,
        anonymous_device_id: device_id,
        anonymous_ip: ip,
        claim_expires_at: claimExpires,
      })
      .select('id, status')
      .single();

    if (insertErr || !inserted) {
      logger.error('anon_analysis_insert_failed', { reqId: req.id, err: insertErr?.message });
      reply.code(500).send({ error: 'insert_failed' });
      return;
    }

    const job: IngestJob = {
      analysis_id: inserted.id,
      user_id: null,
      topic,
      field,
      ...(structured_frame ? { structured_frame } : {}),
      is_anonymous: true,
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
      logger.error('anon_analysis_enqueue_failed', {
        reqId: req.id,
        err: err instanceof Error ? err.message : String(err),
      });
      reply.code(503).send({ error: 'queue_unavailable' });
      return;
    }

    logger.info('anon_analysis_created', {
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

  // GET /v1/analyses/anonymous/:id — poll status + gaps for an anonymous run.
  // Gates access with the claim_token query param so random IDs can't be
  // enumerated. Intentionally unauthenticated.
  fastify.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    '/v1/analyses/anonymous/:id',
    async (req, reply) => {
      const id = req.params.id;
      const token = req.query.token;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
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
        .select('id, topic, field, status, error, created_at, completed_at, is_anonymous, anonymous_claim_token')
        .eq('id', id)
        .maybeSingle();
      if (error || !analysis) {
        reply.code(404).send({ error: 'not_found' });
        return;
      }
      if (!analysis.is_anonymous || analysis.anonymous_claim_token !== token) {
        // Don't leak existence of the row — return the same error as not-found.
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

      // Drop the claim_token from the response — mobile already has it.
      const { anonymous_claim_token: _omit, ...safe } = analysis as typeof analysis;
      reply.send({ analysis: safe, gaps: gaps ?? [] });
    },
  );

  // POST /v1/analyses/:id/claim — transfer ownership from anonymous to
  // the authenticated user. Called by the mobile app after signup if it
  // has a pending claim token in AsyncStorage.
  fastify.post<{ Params: { id: string } }>(
    '/v1/analyses/:id/claim',
    { preHandler: [fastify.authenticate] },
    async (req, reply) => {
      const user = req.user!;
      const id = req.params.id;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        reply.code(400).send({ error: 'invalid_id' });
        return;
      }
      const parsed = ClaimAnalysisSchema.safeParse(req.body);
      if (!parsed.success) {
        reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
        return;
      }
      const { claim_token } = parsed.data;

      const sb = supabaseAdmin();
      const { data: ok, error: rpcErr } = await sb
        .rpc('claim_anonymous_analysis', {
          p_analysis_id: id,
          p_claim_token: claim_token,
          p_user_id: user.id,
        });
      if (rpcErr) {
        logger.error('claim_rpc_failed', { reqId: req.id, userId: user.id, err: rpcErr.message });
        reply.code(500).send({ error: 'claim_failed' });
        return;
      }
      if (ok !== true) {
        reply.code(404).send({ error: 'not_found_or_expired' });
        return;
      }

      logger.info('analysis_claimed', { reqId: req.id, userId: user.id, analysisId: id });
      reply.send({ ok: true, id });
    },
  );
};

export default plugin;
