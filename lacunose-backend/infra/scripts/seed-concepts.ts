/**
 * Seeds the field_concepts table with OpenAlex concepts, levels 0 + 1.
 * Level 0 = 19 top-level domains. Level 1 = ~285 fields (e.g. Cardiology).
 * Run once after migrations: `npm run seed:concepts`
 */
import '../../src/lib/env.js';
import { fetch } from 'undici';
import { supabaseAdmin } from '../../src/lib/supabaseAdmin.js';
import { env } from '../../src/lib/env.js';
import { log } from '../../src/lib/logger.js';
import { FIELD_IDS } from '@lacunose/types';

const logger = log.child('seed:concepts');

// Map OpenAlex level-0 concept names to our field adapter IDs.
// Anything not in this map falls back to 'generic'.
const NAME_TO_FRAME: Record<string, string> = {
  'Medicine': 'medicine',
  'Biology': 'biology',
  'Chemistry': 'chemistry',
  'Physics': 'physics',
  'Materials science': 'materials',
  'Mathematics': 'mathematics',
  'Computer science': 'computer-science',
  'Engineering': 'engineering',
  'Psychology': 'psychology',
  'Economics': 'economics',
  'Political science': 'political-science',
  'Sociology': 'sociology',
  'Geology': 'geology',
  'Geography': 'geography',
  'History': 'history',
  'Philosophy': 'philosophy',
  'Art': 'art',
  'Business': 'business',
  'Environmental science': 'environmental-science',
};

interface OAConcept {
  id: string;
  display_name: string;
  level: number;
  ancestors?: Array<{ id: string }>;
  works_count?: number;
}

/**
 * Fetch OpenAlex concepts / topics. OpenAlex migrated to `/topics` in late
 * 2024 but `/concepts` still responds for backward compatibility. We try
 * `/topics` first (level 0 = domain, level 1 = field), fall back to
 * `/concepts` if the endpoint ever goes away or returns non-2xx.
 */
async function* fetchConcepts(level: number): AsyncGenerator<OAConcept> {
  // Try /topics first — topics don't use `level` in the same way: there's
  // `domains` (19) and `fields` (285). Level 0 → domains, level 1 → fields.
  const topicsPath = level === 0 ? 'domains' : level === 1 ? 'fields' : null;
  if (topicsPath) {
    let cursor = '*';
    while (cursor) {
      const url = new URL(`https://api.openalex.org/${topicsPath}`);
      url.searchParams.set('per-page', '200');
      url.searchParams.set('cursor', cursor);
      url.searchParams.set('mailto', env.POLITE_EMAIL);
      const res = await fetch(url.toString());
      if (res.ok) {
        const body = (await res.json()) as { results: any[]; meta: { next_cursor?: string } };
        for (const t of body.results) {
          yield {
            id: t.id,
            display_name: t.display_name,
            level,
            ancestors: (t.domain ? [{ id: t.domain.id }] : undefined),
            works_count: t.works_count ?? 0,
          };
        }
        cursor = body.meta.next_cursor ?? '';
        continue;
      }
      // Non-2xx from /topics/{domains,fields} — fall through to /concepts.
      break;
    }
  }

  // Legacy / fallback: /concepts with level filter.
  let cursor = '*';
  while (cursor) {
    const url = new URL('https://api.openalex.org/concepts');
    url.searchParams.set('filter', `level:${level}`);
    url.searchParams.set('per-page', '200');
    url.searchParams.set('cursor', cursor);
    url.searchParams.set('mailto', env.POLITE_EMAIL);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`OpenAlex concepts ${res.status}`);
    const body = (await res.json()) as { results: OAConcept[]; meta: { next_cursor?: string } };

    for (const c of body.results) yield c;
    cursor = body.meta.next_cursor ?? '';
  }
}

function conceptIdOnly(url: string): string {
  // 'https://openalex.org/C71924100' -> 'C71924100'
  return url.split('/').pop() ?? url;
}

async function upsertBatch(rows: Array<{
  openalex_id: string;
  level: number;
  name: string;
  parent_ids: string[];
  ancestors: string[];
  works_count: number;
  frame_template: string;
}>) {
  const sb = supabaseAdmin();
  const { error } = await sb.from('field_concepts').upsert(rows, { onConflict: 'openalex_id' });
  if (error) throw new Error(`upsert: ${error.message}`);
}

async function main() {
  let total = 0;

  // Level 0 first — we need their IDs to compute frame_template for level-1 concepts.
  const level0: OAConcept[] = [];
  for await (const c of fetchConcepts(0)) level0.push(c);
  logger.info('level-0', { count: level0.length });

  const level0Rows = level0.map((c) => ({
    openalex_id: conceptIdOnly(c.id),
    level: 0,
    name: c.display_name,
    parent_ids: [],
    ancestors: [],
    works_count: c.works_count ?? 0,
    frame_template: NAME_TO_FRAME[c.display_name] ?? 'generic',
  }));
  await upsertBatch(level0Rows);
  total += level0Rows.length;

  // Build a lookup of level-0 concept-id → frame template, for fast lookup on level-1 inserts.
  const l0Frame: Record<string, string> = {};
  for (const r of level0Rows) l0Frame[r.openalex_id] = r.frame_template;

  // Level 1 — larger, batch into 200-row upserts.
  const batch: any[] = [];
  for await (const c of fetchConcepts(1)) {
    const ancestors = (c.ancestors ?? []).map((a) => conceptIdOnly(a.id));
    const l0Ancestor = ancestors.find((a) => l0Frame[a]);
    const frame = (l0Ancestor && l0Frame[l0Ancestor]) || 'generic';
    batch.push({
      openalex_id: conceptIdOnly(c.id),
      level: 1,
      name: c.display_name,
      parent_ids: ancestors,
      ancestors,
      works_count: c.works_count ?? 0,
      frame_template: frame,
    });
    if (batch.length >= 200) {
      await upsertBatch(batch.splice(0, batch.length));
    }
  }
  if (batch.length) await upsertBatch(batch);
  total += batch.length;

  logger.info('seed-complete', { total });
  // Sanity check: ensure our FIELD_IDS all have an OpenAlex-backed row (or 'generic' fallback).
  const unmapped = Object.values(NAME_TO_FRAME).filter((f) => !FIELD_IDS.includes(f as any));
  if (unmapped.length) logger.warn('unmapped-frames', { unmapped });
}

main().catch((err) => {
  logger.error('fatal', { err: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
