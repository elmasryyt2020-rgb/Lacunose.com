/**
 * Public entry point for the ingestion layer.
 *
 *   runIngestion(q) → fan out across planned adapters → dedupe → persist →
 *   cache in `query_cache` → return the canonical Paper[] + count.
 */
import { createHash } from 'node:crypto';

import type { Paper } from '@lacunose/types';
import { log } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { dedupe } from './dedupe.js';
import { persistPapers } from './persist.js';
import { planQuery } from './planner.js';
import type { RawPaper, SearchQuery, SourceAdapter } from './types.js';

export { dedupe } from './dedupe.js';
export { persistPapers } from './persist.js';
export { planQuery } from './planner.js';
export type { SearchQuery, SourceAdapter } from './types.js';

const logger = log.child('ingest:run');

const CACHE_TTL_DAYS = 7;

/**
 * Consume an adapter's async iterable into an array, honoring `q.limit`
 * and `signal`. Errors are caught here and surfaced to the caller.
 */
async function collect(
  adapter: SourceAdapter,
  q: SearchQuery,
  signal?: AbortSignal,
): Promise<RawPaper[]> {
  const out: RawPaper[] = [];
  const started = Date.now();
  try {
    for await (const p of adapter.search(q, signal)) {
      if (signal?.aborted) break;
      out.push(p);
      if (out.length >= q.limit) break;
    }
    logger.info('adapter done', {
      source: adapter.id,
      count: out.length,
      ms: Date.now() - started,
    });
  } catch (e) {
    logger.error('adapter failed', {
      source: adapter.id,
      error: (e as Error).message,
      count: out.length,
      ms: Date.now() - started,
    });
  }
  return out;
}

function queryHash(q: SearchQuery): string {
  const key = JSON.stringify({
    topic: q.topic.toLowerCase().trim(),
    field: q.field ?? null,
    concept_id: q.concept_id ?? null,
    years: q.years ?? null,
    include_preprints: q.include_preprints ?? null,
    open_access_only: q.open_access_only ?? null,
  });
  return createHash('sha256').update(key).digest('hex');
}

async function writeQueryCache(
  q: SearchQuery,
  paperIds: string[],
): Promise<void> {
  const sb = supabaseAdmin();
  const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const filters: Record<string, unknown> = {};
  if (q.years) filters.years = q.years;
  if (q.include_preprints !== undefined) filters.include_preprints = q.include_preprints;
  if (q.open_access_only !== undefined) filters.open_access_only = q.open_access_only;
  if (q.concept_id) filters.concept_id = q.concept_id;

  const { error } = await sb.from('query_cache').upsert(
    {
      query_hash: queryHash(q),
      field: q.field ?? null,
      filters,
      paper_ids: paperIds,
      expires_at: expiresAt,
    },
    { onConflict: 'query_hash' },
  );
  if (error) logger.warn('query_cache upsert failed', { error: error.message });
}

export async function runIngestion(
  q: SearchQuery,
  signal?: AbortSignal,
): Promise<{ papers: Paper[]; count: number }> {
  const overall = Date.now();
  const adapters = planQuery(q.field);

  logger.info('search start', {
    topic: q.topic,
    field: q.field,
    limit: q.limit,
    adapters: adapters.map((a) => a.id),
  });

  // Fan out in parallel; never let one failed adapter kill the others.
  const settled = await Promise.allSettled(
    adapters.map((a) => collect(a, q, signal)),
  );

  const all: RawPaper[] = [];
  const perSource: Record<string, number> = {};
  settled.forEach((r, i) => {
    const id = adapters[i]!.id;
    if (r.status === 'fulfilled') {
      perSource[id] = r.value.length;
      all.push(...r.value);
    } else {
      perSource[id] = 0;
      logger.warn('adapter rejected', { source: id, reason: String(r.reason) });
    }
  });

  const deduped = dedupe(all);
  logger.info('dedupe done', {
    raw: all.length,
    deduped: deduped.length,
    perSource,
  });

  const { rows, idMap } = await persistPapers(deduped);
  const paperIds = rows.map((r) => r.id);

  // Cache the query → paper_ids mapping (best-effort, never fail the run)
  try {
    await writeQueryCache(q, paperIds);
  } catch (e) {
    logger.warn('query_cache write threw', { error: (e as Error).message });
  }

  logger.info('search end', {
    topic: q.topic,
    count: rows.length,
    ms: Date.now() - overall,
    perSource,
    mappedIds: idMap.size,
  });

  return { papers: rows, count: rows.length };
}
