/**
 * POST /v1/compare — Opus vs Haiku A/B on an already-completed beta analysis.
 *
 * The Day-1 "proof that Opus 4.7 is doing real work" endpoint. Given an
 * analysis_id + claim_token from /v1/beta/analyze, this route:
 *
 *   1. Loads the completed analysis + its gap_items (= the Opus column).
 *   2. Gets the paper_ids the pipeline already retrieved for that analysis.
 *   3. Re-runs hybrid retrieval (cheap — pgvector + FTS against the same
 *      paper set) to get the same section list the worker saw.
 *   4. Runs map → cluster → reduce → critique → rank with a ScopedLLM pinned
 *      to Haiku 4.5 for every tier.
 *   5. Returns `{ opus: { gaps, cost, latencyMs }, haiku: { ... } }`.
 *
 * The Haiku run is ephemeral — never persisted. It's for side-by-side
 * display only. Cost is read straight from the ScopedLLM's usage accumulator.
 *
 * Gated by the same X-Beta-Invite header as /v1/beta/analyze to prevent
 * drive-by traffic from burning budget.
 */
import { createHash } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { CandidateGap, GapEvidence, IngestJob } from '@lacunose/types';
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

const logger = log.child('edge:compare');

const CompareSchema = z.object({
  analysis_id: z.string().min(1).max(128),
  claim_token: z.string().min(16).max(128),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function checkInvite(headerVal: string | string[] | undefined): boolean {
  const raw = Array.isArray(headerVal) ? headerVal[0] : headerVal;
  if (!raw) return false;
  const expected = env.BETA_INVITE_CODE;
  if (raw.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < raw.length; i++) {
    diff |= raw.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

interface OpusGapRow {
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
  evidence: unknown;
}

interface CompareGap {
  rank: number;
  title: string;
  description: string;
  category: string;
  novelty_score: number;
  feasibility_score: number;
  evidence_density: number;
  research_question: string;
  suggested_method: string;
  suggested_n: number | null;
  suggested_duration_months: number | null;
  evidence: GapEvidence[];
}

function candidateToCompareGap(c: CandidateGap, rank: number): CompareGap {
  return {
    rank,
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
  };
}

const plugin: FastifyPluginAsync = async (fastify) => {
  fastify.post('/v1/compare', async (req, reply) => {
    const started = Date.now();
    if (!checkInvite(req.headers['x-beta-invite'])) {
      reply.code(401).send({ error: 'invalid_invite' });
      return;
    }
    const parsed = CompareSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'invalid_body', details: parsed.error.flatten() });
      return;
    }
    const { analysis_id, claim_token } = parsed.data;
    if (!UUID_RE.test(analysis_id)) {
      reply.code(400).send({ error: 'invalid_id' });
      return;
    }

    const sb = supabaseAdmin();

    // 1. Verify the analysis exists + token matches + is done.
    const { data: analysis, error: aErr } = await sb
      .from('gap_analyses')
      .select('id, topic, field, structured_frame, filters, status, is_anonymous, anonymous_claim_token, cost_tokens, paper_ids')
      .eq('id', analysis_id)
      .maybeSingle();
    if (aErr || !analysis) {
      reply.code(404).send({ error: 'not_found' });
      return;
    }
    if (!analysis.is_anonymous || analysis.anonymous_claim_token !== claim_token) {
      reply.code(404).send({ error: 'not_found' });
      return;
    }
    if (analysis.status !== 'done') {
      reply.code(409).send({ error: 'not_ready', status: analysis.status });
      return;
    }

    // 2. Load the existing Opus gaps + paper_ids used by the original run.
    const { data: opusGapRows, error: gErr } = await sb
      .from('gap_items')
      .select('rank, title, description, category, novelty_score, feasibility_score, evidence_density, research_question, suggested_method, suggested_n, suggested_duration_months, evidence')
      .eq('analysis_id', analysis_id)
      .order('rank', { ascending: true });
    if (gErr) {
      reply.code(500).send({ error: 'gap_items_failed' });
      return;
    }

    const opusGaps: CompareGap[] = (opusGapRows as OpusGapRow[]).map((r, i) => ({
      rank: r.rank ?? i + 1,
      title: r.title ?? '',
      description: r.description ?? '',
      category: r.category,
      novelty_score: r.novelty_score ?? 0,
      feasibility_score: r.feasibility_score ?? 0,
      evidence_density: r.evidence_density ?? 0,
      research_question: r.research_question ?? '',
      suggested_method: r.suggested_method ?? '',
      suggested_n: r.suggested_n,
      suggested_duration_months: r.suggested_duration_months,
      evidence: Array.isArray(r.evidence) ? (r.evidence as GapEvidence[]) : [],
    }));

    // Resolve the paper set the original ingest run saw. Three-tier preference,
    // most-faithful first, with the chosen tier reported in the response so the
    // caller (and judges) can see whether the A/B is corpus-identical:
    //   1. gap_analyses.paper_ids      — written by the ingest worker since
    //                                    migration 0004. Same corpus as Opus.
    //   2. query_cache by topic-hash   — pre-0004 fallback; matches as long as
    //                                    the 7-day TTL hasn't expired.
    //   3. evidence-cited papers only  — last resort. NOT corpus-identical:
    //                                    biases the Haiku rerun toward papers
    //                                    Opus already chose to cite. Surfaced
    //                                    via `paper_set_source` so the result
    //                                    can be flagged on the UI.
    const topic = analysis.topic as string;
    const field = analysis.field as string;
    const filters = (analysis.filters ?? {}) as {
      years?: [number, number];
      include_preprints?: boolean;
      open_access_only?: boolean;
      concept_id?: string;
    };
    const structuredFrame = (analysis.structured_frame ?? undefined) as IngestJob['structured_frame'];

    let paperIds: string[] = [];
    let paperSetSource: 'analysis_row' | 'query_cache' | 'cited_evidence' = 'analysis_row';

    const rowPaperIds = (analysis.paper_ids as string[] | null) ?? [];
    if (rowPaperIds.length > 0) {
      paperIds = rowPaperIds;
      paperSetSource = 'analysis_row';
    } else {
      // Tier 2: query_cache by topic-hash. Matches the hash shape in
      // src/ingest/index.ts:queryHash.
      const cacheKey = JSON.stringify({
        topic: topic.toLowerCase().trim(),
        field: field ?? null,
        concept_id: filters.concept_id ?? null,
        years: filters.years ?? null,
        include_preprints: filters.include_preprints ?? null,
        open_access_only: filters.open_access_only ?? null,
      });
      const queryHash = createHash('sha256').update(cacheKey).digest('hex');
      const { data: cacheRow } = await sb
        .from('query_cache')
        .select('paper_ids')
        .eq('query_hash', queryHash)
        .maybeSingle();
      const cached = (cacheRow?.paper_ids as string[] | null) ?? [];
      if (cached.length > 0) {
        paperIds = cached;
        paperSetSource = 'query_cache';
      } else {
        // Tier 3: cited-evidence-only. Logged + surfaced as `paper_set_source`
        // so the UI can render a "biased toward Opus" disclaimer.
        const seen = new Set<string>();
        for (const g of opusGaps) {
          for (const e of g.evidence) {
            if (e.paper_id) seen.add(e.paper_id);
          }
        }
        paperIds = Array.from(seen);
        paperSetSource = 'cited_evidence';
        logger.warn('compare_using_cited_evidence_fallback', {
          reqId: req.id, analysisId: analysis_id, paperCount: paperIds.length,
        });
      }
    }

    if (paperIds.length === 0) {
      reply.code(409).send({ error: 'no_papers_for_analysis' });
      return;
    }

    // 3. Re-retrieve sections (cheap; pgvector + FTS).
    const adapter = getFieldAdapter(field);
    const sections = await hybridRetrieve(analysis_id, topic, paperIds, 30);
    if (sections.length === 0) {
      reply.code(409).send({ error: 'no_sections_retrieved' });
      return;
    }

    // 4. Run the pipeline phases with a Haiku-pinned ScopedLLM.
    const haikuModel = env.ANTHROPIC_HAIKU_MODEL;
    const haikuLLM = createScopedLLM({
      mapModel: haikuModel,
      synthModel: haikuModel,
      critiqueModel: haikuModel,
      label: 'haiku-all',
    });

    const haikuT0 = Date.now();
    let haikuGaps: CompareGap[] = [];
    let haikuError: string | null = null;
    try {
      const signals = await mapPhase(sections, adapter, topic, structuredFrame, undefined, haikuLLM);
      if (signals.length < 5) {
        haikuError = 'insufficient-signal';
      } else {
        const clusters = await clusterSignals(signals);
        const sectionsById = new Map(sections.map((s) => [s.section_id, s]));
        const candidates = await reducePhase(clusters, sectionsById, adapter, topic, structuredFrame, haikuLLM);
        const grounded = await critiquePhase(candidates, adapter, haikuLLM);
        const ranked = await rankGaps(grounded, { topN: 10 });
        haikuGaps = ranked.map((c, i) => candidateToCompareGap(c, i + 1));
      }
    } catch (e) {
      haikuError = (e as Error).message ?? 'haiku-run-failed';
      logger.error('haiku_run_failed', { reqId: req.id, analysisId: analysis_id, err: haikuError });
    }

    const haikuUsage = haikuLLM.usage();

    const opusCost = (analysis.cost_tokens as { cost_usd?: number } | null)?.cost_usd ?? null;

    logger.info('compare_done', {
      reqId: req.id,
      analysisId: analysis_id,
      opusGaps: opusGaps.length,
      haikuGaps: haikuGaps.length,
      haikuCallCount: haikuUsage.calls,
      haikuCostUsd: Number(haikuUsage.costUsd.toFixed(6)),
      totalLatencyMs: Date.now() - started,
      haikuLatencyMs: Date.now() - haikuT0,
    });

    reply.send({
      analysis_id,
      topic,
      field,
      // Tells the UI whether both columns ran against the same corpus. Anything
      // other than 'analysis_row' should render a disclaimer — particularly
      // 'cited_evidence', which biases Haiku's input toward what Opus chose.
      paper_set_source: paperSetSource,
      paper_count: paperIds.length,
      opus: {
        model: env.ANTHROPIC_OPUS_MODEL,
        gaps: opusGaps,
        cost_usd: opusCost,
        cost_tokens: analysis.cost_tokens ?? null,
      },
      haiku: {
        model: haikuModel,
        gaps: haikuGaps,
        cost_usd: Number(haikuUsage.costUsd.toFixed(6)),
        cost_tokens: {
          input: haikuUsage.inputTokens,
          output: haikuUsage.outputTokens,
          cached: haikuUsage.cachedInputTokens,
          calls: haikuUsage.calls,
          models: haikuUsage.models,
        },
        error: haikuError,
      },
    });
  });
};

export default plugin;
