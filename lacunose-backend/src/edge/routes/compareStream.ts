/**
 * GET /v1/beta/compare-stream/:analysis_id?token=...
 *
 * Server-Sent Events endpoint that runs the full gap pipeline on the SAME
 * paper corpus as the original Opus analysis, but with every Claude tier
 * pinned to Haiku 4.5. Each surviving (grounded) candidate gap is emitted
 * to the client as it's produced, so the web /app can render a true
 * "Opus and Haiku side-by-side from second 0" demo: the left column
 * polls/subscribes to gap_items (Opus, persisted) and the right column
 * eats this stream (Haiku, ephemeral).
 *
 * Event stream:
 *   event: meta              { paper_set_source, paper_count, model, sections }
 *   event: phase             { phase: 'map'|'cluster'|'reduce'|'rank', ... }
 *   event: gap               { rank: null, ...candidate }   (each grounded candidate)
 *   event: done              { count, cost_usd, total_ms, gaps: [ranked] }
 *   event: error             { error, message }
 *
 * Auth: same X-Beta-Invite header as /v1/compare. We additionally accept
 * `?invite=` as a query param because EventSource (the browser SSE client)
 * cannot set custom request headers. Constant-time compared either way.
 */
import type { FastifyPluginAsync, FastifyReply } from 'fastify';
import type {
  CandidateGap,
  GapSignal,
  IngestJob,
  RetrievedSection,
} from '@lacunose/types';
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import { log } from '../../lib/logger.js';
import { env } from '../../lib/env.js';
import { getFieldAdapter } from '../../fields/index.js';
import { hybridRetrieve } from '../../retrieval/hybrid.js';
import { mapPhase } from '../../gap/map.js';
import { clusterSignals } from '../../gap/cluster.js';
import { reducePhase } from '../../gap/reduce.js';
import { critiquePhase } from '../../gap/critique.js';
import { rankGaps, evidenceDensity } from '../../gap/rank.js';
import { createScopedLLM } from '../../llm/scopedLLM.js';

const logger = log.child('edge:compare-stream');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function checkInvite(headerVal: string | string[] | undefined, queryVal: string | undefined): boolean {
  const hdr = Array.isArray(headerVal) ? headerVal[0] : headerVal;
  const candidate = hdr ?? queryVal;
  if (!candidate) return false;
  return constantTimeEq(candidate, env.BETA_INVITE_CODE);
}

/**
 * Wire up SSE write helpers on a FastifyReply. Returns a small handle that
 * encapsulates all framing concerns so the pipeline driver below stays clean.
 */
function sseChannel(reply: FastifyReply): {
  send: (event: string, data: unknown) => void;
  end: () => void;
  raw: NodeJS.WritableStream;
} {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // Disable buffering when behind nginx/Caddy. Without this, events stay
    // queued in the proxy until the response ends, defeating the point.
    'X-Accel-Buffering': 'no',
  });
  // Initial comment line so curl & some browser EventSource impls flip into
  // streaming mode immediately.
  reply.raw.write(': lacunose-compare-stream open\n\n');
  let closed = false;
  return {
    send: (event, data) => {
      if (closed) return;
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    end: () => {
      if (closed) return;
      closed = true;
      try { reply.raw.end(); } catch { /* socket gone */ }
    },
    raw: reply.raw,
  };
}

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Params: { id: string }; Querystring: { token?: string; invite?: string } }>(
    '/v1/beta/compare-stream/:id',
    async (req, reply) => {
      // -- Auth & routing guards -----------------------------------------
      if (!checkInvite(req.headers['x-beta-invite'], req.query.invite)) {
        reply.code(401).send({ error: 'invalid_invite' });
        return;
      }
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
      const { data: analysis, error: aErr } = await sb
        .from('gap_analyses')
        .select('id, topic, field, structured_frame, status, is_anonymous, anonymous_claim_token, paper_ids')
        .eq('id', id)
        .maybeSingle();
      if (aErr || !analysis) {
        reply.code(404).send({ error: 'not_found' });
        return;
      }
      if (!analysis.is_anonymous || analysis.anonymous_claim_token !== token) {
        reply.code(404).send({ error: 'not_found' });
        return;
      }

      // -- Resolve paper set --------------------------------------------
      // Mirrors the resolution policy in routes/compare.ts so the streaming
      // path uses the same source-of-truth and reports the same flag.
      let paperIds: string[] = [];
      let paperSetSource: 'analysis_row' | 'cited_evidence' | 'pending' = 'analysis_row';
      const rowPaperIds = (analysis.paper_ids as string[] | null) ?? [];
      if (rowPaperIds.length > 0) {
        paperIds = rowPaperIds;
        paperSetSource = 'analysis_row';
      } else {
        // For the streaming demo we do NOT fall back through query_cache —
        // the caller is the web /app started seconds ago and either ingest
        // has finished writing paper_ids or it has not. Surface "pending"
        // and let the client retry rather than running on a stale corpus.
        const { data: opusGaps } = await sb
          .from('gap_items')
          .select('evidence')
          .eq('analysis_id', id);
        const seen = new Set<string>();
        for (const row of (opusGaps ?? [])) {
          const ev = Array.isArray((row as { evidence?: unknown }).evidence)
            ? ((row as { evidence: { paper_id?: string }[] }).evidence)
            : [];
          for (const e of ev) {
            if (e.paper_id) seen.add(e.paper_id);
          }
        }
        if (seen.size > 0) {
          paperIds = Array.from(seen);
          paperSetSource = 'cited_evidence';
        } else {
          paperSetSource = 'pending';
        }
      }

      if (paperIds.length === 0) {
        reply.code(409).send({ error: 'no_papers_for_analysis', paper_set_source: paperSetSource });
        return;
      }

      // -- Open SSE channel ---------------------------------------------
      const ch = sseChannel(reply);

      // Heartbeat every 15s so proxies don't drop the connection during the
      // map phase (which can take 30-45s before the first reduce emits).
      const heartbeat = setInterval(() => {
        try { ch.raw.write(': hb\n\n'); } catch { /* socket gone */ }
      }, 15_000);

      // Cancel pipeline work if the client disconnects mid-stream.
      const ac = new AbortController();
      reply.raw.on('close', () => {
        ac.abort();
        clearInterval(heartbeat);
      });

      const haikuModel = env.ANTHROPIC_HAIKU_MODEL;
      const haikuLLM = createScopedLLM({
        mapModel: haikuModel,
        synthModel: haikuModel,
        critiqueModel: haikuModel,
        label: 'haiku-stream',
      });

      const t0 = Date.now();
      try {
        // 1. Hybrid retrieve (cheap; pgvector + FTS).
        const adapter = getFieldAdapter(analysis.field as string);
        const sections: RetrievedSection[] = await hybridRetrieve(
          id,
          analysis.topic as string,
          paperIds,
          30,
        );

        ch.send('meta', {
          analysis_id: id,
          model: haikuModel,
          paper_set_source: paperSetSource,
          paper_count: paperIds.length,
          sections: sections.length,
        });

        if (sections.length === 0) {
          ch.send('error', { error: 'no_sections_retrieved' });
          ch.end();
          clearInterval(heartbeat);
          return;
        }

        // 2. MAP phase (Haiku × 12 parallel inside).
        ch.send('phase', { phase: 'map', startedAt: Date.now() - t0 });
        const signals: GapSignal[] = await mapPhase(
          sections,
          adapter,
          analysis.topic as string,
          (analysis.structured_frame ?? undefined) as IngestJob['structured_frame'],
          ac.signal,
          haikuLLM,
        );
        ch.send('phase', { phase: 'map_done', signals: signals.length, t: Date.now() - t0 });

        if (signals.length < 5) {
          ch.send('error', { error: 'insufficient-signal', signals: signals.length });
          ch.send('done', { count: 0, cost_usd: haikuLLM.usage().costUsd, total_ms: Date.now() - t0, gaps: [] });
          ch.end();
          clearInterval(heartbeat);
          return;
        }

        // 3. CLUSTER (HDBSCAN + Cohere v3 phrase embeddings).
        ch.send('phase', { phase: 'cluster', t: Date.now() - t0 });
        const clusters = await clusterSignals(signals);
        ch.send('phase', { phase: 'cluster_done', clusters: clusters.length, t: Date.now() - t0 });

        const sectionsById = new Map(sections.map((s) => [s.section_id, s]));

        // 4. REDUCE → CRITIQUE per cluster, emitting each grounded candidate
        //    as soon as it survives. We iterate clusters sequentially so the
        //    user sees a steady drip of cards rather than a 60s gap then a
        //    burst at the end.
        ch.send('phase', { phase: 'reduce_critique', clusters: clusters.length, t: Date.now() - t0 });

        const allGrounded: CandidateGap[] = [];
        let emittedCount = 0;
        // Track candidate flow for the demo's "Haiku produced 0 gaps" case —
        // when Haiku-as-synth output gets rejected by Haiku-as-critic at 100%,
        // saying "no gaps produced" undersells the actual story. Counting
        // candidates produced AND dropped lets the UI render
        //   "Generated 3 candidates · 3 failed grounding critique"
        // which is the more honest framing.
        let totalCandidatesProduced = 0;
        let totalCandidatesDropped = 0;
        for (let ci = 0; ci < clusters.length; ci++) {
          if (ac.signal.aborted) break;
          const cluster = clusters[ci];
          if (!cluster || cluster.length === 0) continue;
          // reduce one cluster at a time
          const candidates = await reducePhase(
            [cluster],
            sectionsById,
            adapter,
            analysis.topic as string,
            (analysis.structured_frame ?? undefined) as IngestJob['structured_frame'],
            haikuLLM,
          );
          if (candidates.length === 0) continue;
          totalCandidatesProduced += candidates.length;
          // critique just this cluster's candidates
          const grounded = await critiquePhase(candidates, adapter, haikuLLM);
          totalCandidatesDropped += candidates.length - grounded.length;
          for (const g of grounded) {
            emittedCount += 1;
            allGrounded.push(g);
            ch.send('gap', {
              rank: null, // assigned in the final 'done' event after rank+dedupe
              title: g.title,
              description: g.description,
              category: g.category,
              novelty_score: g.novelty_score,
              feasibility_score: g.feasibility_score,
              evidence_density: evidenceDensity(g),
              research_question: g.research_question,
              suggested_method: g.suggested_method,
              suggested_n: g.suggested_n ?? null,
              suggested_duration_months: g.suggested_duration_months ?? null,
              evidence: g.evidence,
              cluster_index: ci,
              emitted_index: emittedCount,
              t: Date.now() - t0,
            });
          }
        }

        // 5. Rank + trim to top-10. We re-emit a `done` event with the final
        //    canonical ordering so the client can sort/dedupe its working list
        //    against the authoritative result.
        const ranked = await rankGaps(allGrounded, { topN: 10 });
        const usage = haikuLLM.usage();
        ch.send('done', {
          count: ranked.length,
          cost_usd: Number(usage.costUsd.toFixed(6)),
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          cached_input_tokens: usage.cachedInputTokens,
          calls: usage.calls,
          model: haikuModel,
          total_ms: Date.now() - t0,
          // For the "0 gaps but ran the pipeline" case: lets the UI explain
          // *why* the column is empty — Haiku produced candidates which
          // Haiku-as-critic then rejected.
          candidates_produced: totalCandidatesProduced,
          candidates_dropped_in_critique: totalCandidatesDropped,
          gaps: ranked.map((c, i) => ({
            rank: i + 1,
            title: c.title,
            description: c.description,
            category: c.category,
            novelty_score: c.novelty_score,
            feasibility_score: c.feasibility_score,
            evidence_density: evidenceDensity(c),
            research_question: c.research_question,
            suggested_method: c.suggested_method,
            suggested_n: c.suggested_n ?? null,
            suggested_duration_months: c.suggested_duration_months ?? null,
            evidence: c.evidence,
          })),
        });
        logger.info('compare_stream_done', {
          reqId: req.id,
          analysisId: id,
          emittedCount,
          finalCount: ranked.length,
          totalMs: Date.now() - t0,
          costUsd: Number(usage.costUsd.toFixed(6)),
        });
      } catch (e) {
        const msg = (e as Error).message ?? 'unknown';
        logger.error('compare_stream_failed', { reqId: req.id, analysisId: id, err: msg });
        try { ch.send('error', { error: 'pipeline_failed', message: msg }); } catch { /* socket gone */ }
      } finally {
        clearInterval(heartbeat);
        ch.end();
      }
    },
  );
};

export default plugin;
