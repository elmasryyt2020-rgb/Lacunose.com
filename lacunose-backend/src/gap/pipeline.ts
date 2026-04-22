/**
 * End-to-end gap-analysis pipeline.
 *
 * Reads the corpus for one analysis, runs hybrid retrieval → map → cluster →
 * reduce → critique → rank, and streams each final gap into `gap_items` one
 * row at a time so the mobile client's Supabase Realtime subscription can
 * render them incrementally.
 *
 * Concurrency tuning lives inside each phase module (map: 12, reduce: 6,
 * critique: 12). Token budgets live in `src/llm/chunk.ts`; this module
 * assumes every individual LLM call fits inside the 100K-token envelope
 * because section text is short and clusters are small.
 */
import type {
  CandidateGap,
  GapEvidence,
  StructuredFrameValue,
} from '@lacunose/types';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { log } from '../lib/logger.js';
import { getFieldAdapter } from '../fields/index.js';
import { hybridRetrieve } from '../retrieval/hybrid.js';
import { mapPhase } from './map.js';
import { clusterSignals } from './cluster.js';
import { reducePhase } from './reduce.js';
import { critiquePhase } from './critique.js';
import { rankGaps, evidenceDensity } from './rank.js';
import { withUsageTracking } from '../llm/index.js';
import { startTracking, collect as collectUsage } from '../llm/accumulator.js';

const logger = log.child('gap:pipeline');

export interface RunGapOpts {
  analysisId: string;
  userId: string | null;
  topic: string;
  field: string;
  structuredFrame?: StructuredFrameValue;
  paperIds: string[];
  signal?: AbortSignal;
  /**
   * Anonymous onboarding runs cap the final gap count to 3. Default: 10.
   */
  isAnonymous?: boolean;
}

const MIN_SIGNALS = 5;

/**
 * Run the full gap-analysis pipeline for one analysis.
 *
 * Flow:
 *   1. Mark analysis as `running`.
 *   2. Hybrid retrieve top-30 reranked sections.
 *   3. Map → gap signals.
 *   4. Fast-exit if <5 signals; mark done with 0 gaps.
 *   5. Cluster → reduce → critique → rank.
 *   6. Insert each ranked gap one-by-one (Realtime streaming).
 *   7. Mark analysis as `done` with completed_at + cost_tokens.
 *
 * On error: mark analysis `failed` with the message, then rethrow.
 */
export async function runGapAnalysis(opts: RunGapOpts): Promise<void> {
  // Wrap the whole run in an AsyncLocalStorage context so every `llm.chat`
  // call (map, reduce, critique) automatically contributes to this
  // analysis' token + cost totals.
  startTracking(opts.analysisId);
  return withUsageTracking(opts.analysisId, () => runGapAnalysisImpl(opts));
}

async function runGapAnalysisImpl(opts: RunGapOpts): Promise<void> {
  const { analysisId, userId, topic, field, structuredFrame, paperIds, signal } = opts;
  const sb = supabaseAdmin();
  const t0 = Date.now();
  const adapter = getFieldAdapter(field);

  try {
    logger.info('pipeline start', {
      analysisId,
      field: adapter.id,
      papers: paperIds.length,
    });

    // 1. running
    await sb
      .from('gap_analyses')
      .update({ status: 'running' })
      .eq('id', analysisId);

    // 2. retrieve
    const sections = await hybridRetrieve(analysisId, topic, paperIds, 30);
    logger.info('phase: retrieve', {
      analysisId,
      inputCount: paperIds.length,
      outputCount: sections.length,
      latencyMs: Date.now() - t0,
    });

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // 3. map
    const mapT0 = Date.now();
    const signals = await mapPhase(sections, adapter, topic, structuredFrame, signal);
    logger.info('phase: map', {
      analysisId,
      inputCount: sections.length,
      outputCount: signals.length,
      latencyMs: Date.now() - mapT0,
    });

    // 4. insufficient-signal short-circuit
    if (signals.length < MIN_SIGNALS) {
      logger.info('insufficient-signal', {
        analysisId,
        signalCount: signals.length,
        threshold: MIN_SIGNALS,
      });
      await sb
        .from('gap_analyses')
        .update({
          status: 'done',
          completed_at: new Date().toISOString(),
          error: 'insufficient-signal',
        })
        .eq('id', analysisId);
      // Refund quota — user got nothing useful, same policy as corpus-empty.
      if (userId) {
        try { await sb.rpc('decrement_analyses_used', { p_user: userId }); } catch { /* swallow */ }
      }
      return;
    }

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // 5a. cluster
    const clusterT0 = Date.now();
    const clusters = await clusterSignals(signals);
    logger.info('phase: cluster', {
      analysisId,
      inputCount: signals.length,
      outputCount: clusters.length,
      latencyMs: Date.now() - clusterT0,
    });

    const sectionsById = new Map(sections.map((s) => [s.section_id, s]));

    // 5b. reduce
    const reduceT0 = Date.now();
    const candidates = await reducePhase(
      clusters,
      sectionsById,
      adapter,
      topic,
      structuredFrame,
    );
    logger.info('phase: reduce', {
      analysisId,
      inputCount: clusters.length,
      outputCount: candidates.length,
      latencyMs: Date.now() - reduceT0,
    });

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // 5c. critique
    const critT0 = Date.now();
    const grounded = await critiquePhase(candidates, adapter);
    logger.info('phase: critique', {
      analysisId,
      inputCount: candidates.length,
      outputCount: grounded.length,
      latencyMs: Date.now() - critT0,
    });

    // 5d. rank + trim
    const rankT0 = Date.now();
    const topN = opts.isAnonymous ? 3 : 10;
    const ranked = rankGaps(grounded, { topN });
    logger.info('phase: rank', {
      analysisId,
      inputCount: grounded.length,
      outputCount: ranked.length,
      latencyMs: Date.now() - rankT0,
    });

    // 6. stream into gap_items — one row at a time so Realtime subscribers
    //    see a gap appear as soon as we've committed it.
    const paperMeta = await loadPaperMeta(sections.map((s) => s.paper_id));
    for (let i = 0; i < ranked.length; i++) {
      const c = ranked[i];
      if (!c) continue;
      const rank = i + 1;
      const density = evidenceDensity(c);
      const evidence = denormalizeEvidence(c.evidence, paperMeta);

      const { error } = await sb.from('gap_items').insert({
        analysis_id: analysisId,
        rank,
        title: c.title,
        description: c.description,
        category: c.category,
        novelty_score: c.novelty_score,
        feasibility_score: c.feasibility_score,
        evidence_density: density,
        research_question: c.research_question,
        suggested_method: c.suggested_method,
        suggested_n: c.suggested_n ?? null,
        suggested_duration_months: c.suggested_duration_months ?? null,
        evidence,
      });
      if (error) {
        logger.error('gap_items insert failed', {
          analysisId,
          rank,
          error: error.message,
        });
        throw new Error(`gap_items insert failed: ${error.message}`);
      }
    }

    // 7. done — aggregate cost_tokens from the accumulator.
    const totals = collectUsage(analysisId);
    await sb
      .from('gap_analyses')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        cost_tokens: totals
          ? {
              input: totals.inputTokens,
              output: totals.outputTokens,
              cached: totals.cachedInputTokens,
              calls: totals.calls,
              cost_usd: Number(totals.costUsd.toFixed(6)),
              providers: totals.providers,
              models: totals.models,
            }
          : {},
      })
      .eq('id', analysisId);

    logger.info('pipeline done', {
      analysisId,
      gaps: ranked.length,
      totalLatencyMs: Date.now() - t0,
      calls: totals?.calls ?? 0,
      costUsd: totals ? Number(totals.costUsd.toFixed(6)) : 0,
    });
  } catch (e) {
    const msg = (e as Error).message ?? 'unknown';
    logger.error('pipeline failed', {
      analysisId,
      error: msg,
      totalLatencyMs: Date.now() - t0,
    });
    try {
      // Still roll up whatever tokens we burned before the failure.
      const totals = collectUsage(analysisId);
      await sb
        .from('gap_analyses')
        .update({
          status: 'failed',
          error: msg,
          completed_at: new Date().toISOString(),
          cost_tokens: totals
            ? { input: totals.inputTokens, output: totals.outputTokens, calls: totals.calls, cost_usd: Number(totals.costUsd.toFixed(6)) }
            : {},
        })
        .eq('id', analysisId);
      // Refund the quota slot so the user isn't charged for a failed analysis.
      if (userId) {
        try { await sb.rpc('decrement_analyses_used', { p_user: userId }); } catch { /* swallow */ }
      }
    } catch (writeErr) {
      logger.error('failed-status write itself failed', {
        analysisId,
        error: (writeErr as Error).message,
      });
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface PaperMeta {
  id: string;
  title: string;
  year: number | null;
  venue: string | null;
  authors_short: string;
}

interface PaperRow {
  id: string;
  title: string | null;
  year: number | null;
  venue: string | null;
  authors: unknown;
}

async function loadPaperMeta(paperIds: string[]): Promise<Map<string, PaperMeta>> {
  const out = new Map<string, PaperMeta>();
  if (paperIds.length === 0) return out;
  const unique = Array.from(new Set(paperIds));
  const sb = supabaseAdmin();
  // Batch: Kong fronts PostgREST and rejects requests with URI > ~8KB;
  // ~200 UUIDs per batch keeps us safely under.
  const BATCH = 200;
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const { data, error } = await sb
      .from('papers')
      .select('id, title, year, venue, authors')
      .in('id', batch);
    if (error) {
      logger.warn('loadPaperMeta batch failed', { error: error.message, batchSize: batch.length });
      continue;
    }
    for (const row of (data ?? []) as PaperRow[]) {
      out.set(row.id, {
        id: row.id,
        title: row.title ?? '',
        year: row.year,
        venue: row.venue,
        authors_short: shortAuthors(row.authors),
      });
    }
  }
  return out;
}

function shortAuthors(authors: unknown): string {
  if (!Array.isArray(authors) || authors.length === 0) return '';
  const first = (authors[0] as { name?: string })?.name ?? '';
  const last = first.split(/\s+/).pop() ?? first;
  if (authors.length === 1) return last;
  return `${last} et al.`;
}

function denormalizeEvidence(
  evidence: GapEvidence[],
  paperMeta: Map<string, PaperMeta>,
): GapEvidence[] {
  return evidence.map((e) => {
    const meta = paperMeta.get(e.paper_id);
    const out: GapEvidence = {
      paper_id: e.paper_id,
      quote: e.quote,
    };
    if (e.section_id) out.section_id = e.section_id;
    if (e.section_kind) out.section_kind = e.section_kind;
    if (typeof e.relevance === 'number') out.relevance = e.relevance;
    if (meta) {
      if (meta.title) out.paper_title = meta.title;
      if (meta.year !== null && meta.year !== undefined) out.paper_year = meta.year;
      if (meta.venue) out.paper_venue = meta.venue;
      if (meta.authors_short) out.paper_authors = meta.authors_short;
    }
    return out;
  });
}
