/**
 * Hybrid retrieval over `paper_sections` + `paper_embeddings`.
 *
 * Combines two ranked lists into a single reranked top-N:
 *   1. Dense: pgvector ANN against the topic's embedding.
 *   2. Sparse: Postgres FTS via `plainto_tsquery` + `ts_rank_cd`.
 *
 * The two lists are fused with Reciprocal Rank Fusion (k=60). The top 100
 * are then handed to Cohere rerank-3 (see `./rerank.ts`) which returns the
 * final top-N.
 *
 * Uses a raw `pg` pool rather than Supabase RPC because pgvector parameter
 * binding is simpler with node-pg and we need both queries to run without
 * round-tripping through PostgREST.
 */
import { Pool, type PoolClient } from 'pg';
import type { RetrievedSection, SectionKind } from '@lacunose/types';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { embedText } from '../enrich/embed.js';
import { rerank } from './rerank.js';

const logger = log.child('retrieval:hybrid');

// ---------------------------------------------------------------------------
// Shared pg Pool
// ---------------------------------------------------------------------------

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: env.POSTGRES_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
    _pool.on('error', (e) => logger.error('pg pool error', { error: e.message }));
  }
  return _pool;
}

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface DenseRow {
  section_id: string;
  paper_id: string;
  score: number;
}
interface SparseRow {
  section_id: string;
  paper_id: string;
  score: number;
}
interface HydrateRow {
  section_id: string;
  paper_id: string;
  section_kind: SectionKind;
  section_text: string;
  paper_title: string;
  paper_year: number | null;
  paper_venue: string | null;
  authors_json: unknown;
}

const DENSE_SQL = `
SELECT
  pe.section_id AS section_id,
  pe.paper_id   AS paper_id,
  1 - (pe.embedding <=> $1::vector) AS score
FROM paper_embeddings pe
WHERE pe.paper_id = ANY($2::uuid[])
ORDER BY pe.embedding <=> $1::vector
LIMIT 100
`;

const SPARSE_SQL = `
SELECT
  ps.id       AS section_id,
  ps.paper_id AS paper_id,
  ts_rank_cd(
    to_tsvector('english', coalesce(ps.text, '')),
    plainto_tsquery('english', $1)
  ) AS score
FROM paper_sections ps
WHERE ps.paper_id = ANY($2::uuid[])
  AND to_tsvector('english', coalesce(ps.text, '')) @@ plainto_tsquery('english', $1)
ORDER BY score DESC
LIMIT 100
`;

const HYDRATE_SQL = `
SELECT
  ps.id                  AS section_id,
  ps.paper_id            AS paper_id,
  ps.kind                AS section_kind,
  ps.text                AS section_text,
  p.title                AS paper_title,
  p.year                 AS paper_year,
  p.venue                AS paper_venue,
  p.authors              AS authors_json
FROM paper_sections ps
JOIN papers p ON p.id = ps.paper_id
WHERE ps.id = ANY($1::uuid[])
`;

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function toPgVector(v: number[]): string {
  return '[' + v.map((x) => Number.isFinite(x) ? x.toString() : '0').join(',') + ']';
}

function shortAuthors(authors: unknown): string {
  if (!Array.isArray(authors) || authors.length === 0) return '';
  const first = (authors[0] as { name?: string })?.name ?? '';
  const last = first.split(/\s+/).pop() ?? first;
  if (authors.length === 1) return last;
  return `${last} et al.`;
}

// ---------------------------------------------------------------------------
// RRF fuse
// ---------------------------------------------------------------------------

function rrfFuse(
  dense: DenseRow[],
  sparse: SparseRow[],
  k: number = 60,
): Map<string, { paper_id: string; score: number }> {
  const scores = new Map<string, { paper_id: string; score: number }>();
  dense.forEach((row, i) => {
    const s = 1 / (k + i + 1);
    const prev = scores.get(row.section_id);
    scores.set(row.section_id, {
      paper_id: row.paper_id,
      score: (prev?.score ?? 0) + s,
    });
  });
  sparse.forEach((row, i) => {
    const s = 1 / (k + i + 1);
    const prev = scores.get(row.section_id);
    scores.set(row.section_id, {
      paper_id: row.paper_id,
      score: (prev?.score ?? 0) + s,
    });
  });
  return scores;
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * Retrieve and rerank the top-`topK` sections most relevant to `topic` across
 * the supplied `paperIds` set. Internally runs dense + sparse queries, fuses
 * them with RRF(k=60), then passes the top 100 through Cohere rerank-3.
 *
 * Returns an ordered list of `RetrievedSection` with denormalized paper
 * metadata ready for the gap-engine map phase.
 */
export async function hybridRetrieve(
  analysisId: string,
  topic: string,
  paperIds: string[],
  topK: number = 30,
): Promise<RetrievedSection[]> {
  const t0 = Date.now();
  if (!paperIds.length) {
    logger.warn('hybridRetrieve: empty paperIds', { analysisId });
    return [];
  }

  const topicVec = await embedText(topic);
  const topicVecStr = toPgVector(topicVec);

  const client: PoolClient = await pool().connect();
  let dense: DenseRow[] = [];
  let sparse: SparseRow[] = [];
  try {
    const dres = await client.query<DenseRow>(DENSE_SQL, [topicVecStr, paperIds]);
    dense = dres.rows;
  } catch (e) {
    logger.warn('dense retrieval failed', {
      analysisId, error: (e as Error).message,
    });
  }
  try {
    const sres = await client.query<SparseRow>(SPARSE_SQL, [topic, paperIds]);
    sparse = sres.rows;
  } catch (e) {
    logger.warn('sparse retrieval failed', {
      analysisId, error: (e as Error).message,
    });
  }

  const fused = rrfFuse(dense, sparse, 60);
  const ranked = Array.from(fused.entries())
    .map(([section_id, v]) => ({ section_id, paper_id: v.paper_id, score: v.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  if (ranked.length === 0) {
    client.release();
    logger.info('hybridRetrieve: no matches', {
      analysisId,
      paperIds: paperIds.length,
      latencyMs: Date.now() - t0,
    });
    return [];
  }

  // Hydrate text + paper metadata for the fused top 100
  const ids = ranked.map((r) => r.section_id);
  let hydrated: HydrateRow[] = [];
  try {
    const hres = await client.query<HydrateRow>(HYDRATE_SQL, [ids]);
    hydrated = hres.rows;
  } finally {
    client.release();
  }
  const byId = new Map<string, HydrateRow>();
  for (const row of hydrated) byId.set(row.section_id, row);

  const candidates: RetrievedSection[] = [];
  for (const r of ranked) {
    const h = byId.get(r.section_id);
    if (!h) continue;
    candidates.push({
      paper_id: r.paper_id,
      section_id: r.section_id,
      paper_title: h.paper_title,
      paper_year: h.paper_year,
      paper_venue: h.paper_venue,
      authors_short: shortAuthors(h.authors_json),
      section_kind: h.section_kind,
      text: h.section_text,
      score: r.score,
    });
  }

  logger.info('hybridRetrieve fused', {
    analysisId,
    dense: dense.length,
    sparse: sparse.length,
    fused: candidates.length,
    latencyMs: Date.now() - t0,
  });

  const reranked = await rerank(topic, candidates, topK);

  logger.info('hybridRetrieve done', {
    analysisId,
    inputCount: candidates.length,
    outputCount: reranked.length,
    latencyMs: Date.now() - t0,
  });

  return reranked;
}
