/**
 * Paper-section embedding module.
 *
 * Two strategies (the caller does not pick; this module decides):
 *
 *   1. SPECTER2 via Semantic Scholar — preferred when the paper has an
 *      `s2_id`. The S2 graph API exposes pre-computed 768-dim SPECTER2
 *      vectors for free. Rate-limited via the shared ingest limiter.
 *
 *   2. Hash-embed fallback — deterministic but quality-poor. Used for
 *      papers without an s2_id so the pipeline still runs end-to-end.
 *      Documented as a placeholder; v1.1 will swap in a local ONNX model.
 *
 * All embeddings are upserted into `paper_embeddings` (paper_id, section_id,
 * embedding, adapter).
 */
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { get, HttpError } from '../ingest/httpClient.js';
import { limiterFor } from '../ingest/rateLimit.js';
import { hashEmbed } from './hashEmbed.js';

const logger = log.child('enrich:embed');

const SPECTER2_DIM = 768;

interface S2EmbeddingResponse {
  embedding?: { vector?: number[] } | null;
}

/**
 * Embed a single section's text, attributing the result to `paperId` and
 * `sectionId`. If `s2Id` is provided, tries S2 SPECTER2 first; otherwise
 * (or on S2 miss) falls back to the deterministic hash embed.
 *
 * Returns the 768-dim vector. Does NOT persist — callers that want the row
 * in `paper_embeddings` should use `embedAllSections`.
 */
export async function embedSection(
  paperId: string,
  sectionId: string,
  text: string,
  s2Id?: string,
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    logger.warn('empty section text; falling back to hashEmbed of section id', {
      paperId, sectionId,
    });
    return hashEmbed(sectionId);
  }

  if (s2Id) {
    const vec = await trySpecter2(s2Id);
    if (vec) return vec;
  }
  return hashEmbed(text);
}

/** Embed a free-form string (e.g. the user's topic query). */
export async function embedText(text: string): Promise<number[]> {
  return hashEmbed(text || '');
}

async function trySpecter2(s2Id: string): Promise<number[] | null> {
  const limiter = limiterFor('s2', 1, 5);
  await limiter.acquire();
  const url = `https://api.semanticscholar.org/graph/v1/paper/${encodeURIComponent(s2Id)}/embedding`;
  const headers: Record<string, string> = {};
  if (env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = env.SEMANTIC_SCHOLAR_API_KEY;
  }
  try {
    const data = (await get(url, { headers })) as S2EmbeddingResponse;
    const vec = data?.embedding?.vector;
    if (!vec || vec.length !== SPECTER2_DIM) {
      logger.debug('s2 embedding missing or wrong dim', {
        s2Id, got: vec?.length ?? 0,
      });
      return null;
    }
    return vec;
  } catch (e) {
    if (e instanceof HttpError && (e.status === 404 || e.status === 400)) {
      return null;
    }
    logger.warn('s2 embedding fetch failed; falling back', {
      s2Id, error: (e as Error).message,
    });
    return null;
  }
}

/**
 * Embed every section of a paper and upsert the results into
 * `paper_embeddings`. Idempotent on `(paper_id, section_id)`.
 *
 * Looks up the paper's `s2_id` once, then reuses it for every section so
 * that a single S2 call covers the whole paper (S2 returns one per paper).
 */
export async function embedAllSections(paperId: string): Promise<void> {
  const sb = supabaseAdmin();
  const t0 = Date.now();

  const { data: paper, error: paperErr } = await sb
    .from('papers')
    .select('id, s2_id')
    .eq('id', paperId)
    .single();
  if (paperErr) throw new Error(`embedAllSections: paper lookup failed: ${paperErr.message}`);
  const s2Id = paper?.s2_id ?? undefined;

  const { data: sections, error: secErr } = await sb
    .from('paper_sections')
    .select('id, text')
    .eq('paper_id', paperId);
  if (secErr) throw new Error(`embedAllSections: section lookup failed: ${secErr.message}`);
  if (!sections || sections.length === 0) {
    logger.warn('no sections to embed', { paperId });
    return;
  }

  // For S2-backed papers, a single call returns one paper-level vector. We use
  // it for every section (section-level granularity isn't exposed via S2), but
  // fall through to hash-embed on text if S2 is missing.
  let s2Vec: number[] | null = null;
  if (s2Id) s2Vec = await trySpecter2(s2Id);

  const rows = sections.map((s: { id: string; text: string | null }) => {
    const vec = s2Vec ?? hashEmbed(s.text ?? '');
    return {
      paper_id: paperId,
      section_id: s.id,
      embedding: vec,
      adapter: s2Vec ? 'specter2-s2' : 'hash-embed-v1',
    };
  });

  const { error: upErr } = await sb
    .from('paper_embeddings')
    .upsert(rows, { onConflict: 'paper_id,section_id' });
  if (upErr) throw new Error(`embedAllSections: upsert failed: ${upErr.message}`);

  logger.info('embedded paper sections', {
    paperId,
    count: rows.length,
    adapter: s2Vec ? 'specter2-s2' : 'hash-embed-v1',
    latencyMs: Date.now() - t0,
  });
}
