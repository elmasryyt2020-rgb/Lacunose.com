/**
 * Persistence layer for deduped RawPapers.
 *
 * Supabase upsert doesn't handle a composite OR-conflict cleanly, so we do
 * find-or-insert via .select().or(...).limit(1), then insert-or-update in
 * batches of 50. Also emits paper_sections rows for each abstract.
 *
 * Returns a Map from source-native ID → canonical papers.id.
 */
import type { Paper, PaperSource, RawPaper } from '@lacunose/types';
import { log } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';

const logger = log.child('ingest:persist');
const BATCH = 50;

type PaperRow = {
  id?: string;
  doi: string | null;
  pmid: string | null;
  arxiv_id: string | null;
  openalex_id: string | null;
  s2_id: string | null;
  title: string;
  abstract: string | null;
  year: number | null;
  venue: string | null;
  field: string[] | null;
  authors: unknown;
  citation_count: number | null;
  full_text_url: string | null;
  source: string;
};

function rowFromRaw(p: RawPaper): PaperRow {
  return {
    doi: p.doi ?? null,
    pmid: p.pmid ?? null,
    arxiv_id: p.arxiv_id ?? null,
    openalex_id: p.openalex_id ?? null,
    s2_id: p.s2_id ?? null,
    title: p.title,
    abstract: p.abstract ?? null,
    year: p.year ?? null,
    venue: p.venue ?? null,
    field: p.field ?? null,
    authors: p.authors ?? null,
    citation_count: p.citation_count ?? null,
    full_text_url: p.full_text_url ?? null,
    source: p.source,
  };
}

/** Build an OR filter string for `.or()` matching any of the populated IDs. */
function idFilter(p: RawPaper): string {
  const clauses: string[] = [];
  if (p.doi)         clauses.push(`doi.eq.${escape(p.doi)}`);
  if (p.pmid)        clauses.push(`pmid.eq.${escape(p.pmid)}`);
  if (p.arxiv_id)    clauses.push(`arxiv_id.eq.${escape(p.arxiv_id)}`);
  if (p.openalex_id) clauses.push(`openalex_id.eq.${escape(p.openalex_id)}`);
  if (p.s2_id)       clauses.push(`s2_id.eq.${escape(p.s2_id)}`);
  return clauses.join(',');
}

function escape(s: string): string {
  // PostgREST or-syntax values — commas & parens must be quoted. Wrap always.
  return `"${s.replace(/"/g, '\\"')}"`;
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/**
 * Upsert papers and return persisted Paper rows + a source-ID → paper_id map.
 */
export async function persistPapers(
  papers: RawPaper[],
): Promise<{ rows: Paper[]; idMap: Map<string, string> }> {
  const sb = supabaseAdmin();
  const idMap = new Map<string, string>();
  const outRows: Paper[] = [];

  for (const batch of chunks(papers, BATCH)) {
    // 1. Look up existing rows for this batch in one OR'd query.
    const orParts = batch.map(idFilter).filter((s) => s.length > 0);
    const existing: PaperRow[] = [];
    if (orParts.length > 0) {
      // PostgREST caps `.or()` length; do it chunked if very large.
      const { data, error } = await sb
        .from('papers')
        .select('id,doi,pmid,arxiv_id,openalex_id,s2_id,title,abstract,year,venue,field,authors,citation_count,full_text_url,source,ingested_at')
        .or(orParts.join(','));
      if (error) {
        logger.warn('lookup failed; falling back to per-paper find', { error: error.message });
      } else if (data) {
        existing.push(...(data as unknown as PaperRow[]));
      }
    }

    // Index existing rows by each of their IDs
    const byId = new Map<string, PaperRow>();
    for (const r of existing) {
      if (r.doi)         byId.set(`doi:${r.doi}`, r);
      if (r.pmid)        byId.set(`pmid:${r.pmid}`, r);
      if (r.arxiv_id)    byId.set(`arxiv:${r.arxiv_id}`, r);
      if (r.openalex_id) byId.set(`oa:${r.openalex_id}`, r);
      if (r.s2_id)       byId.set(`s2:${r.s2_id}`, r);
    }

    const toInsert: PaperRow[] = [];
    const toUpdate: Array<{ id: string; row: PaperRow }> = [];

    for (const p of batch) {
      const keys = [
        p.doi ? `doi:${p.doi}` : null,
        p.pmid ? `pmid:${p.pmid}` : null,
        p.arxiv_id ? `arxiv:${p.arxiv_id}` : null,
        p.openalex_id ? `oa:${p.openalex_id}` : null,
        p.s2_id ? `s2:${p.s2_id}` : null,
      ].filter((k): k is string => k !== null);

      const hit = keys.map((k) => byId.get(k)).find((r) => r !== undefined);

      if (hit?.id) {
        toUpdate.push({ id: hit.id, row: rowFromRaw(p) });
      } else {
        toInsert.push(rowFromRaw(p));
      }
    }

    // 2. Bulk insert new rows
    if (toInsert.length > 0) {
      const { data, error } = await sb
        .from('papers')
        .insert(toInsert)
        .select('id,doi,pmid,arxiv_id,openalex_id,s2_id,title,abstract,year,venue,field,authors,citation_count,full_text_url,source,ingested_at');
      if (error) {
        logger.error('insert failed', { error: error.message, count: toInsert.length });
      } else if (data) {
        for (const r of data as unknown as Paper[]) {
          outRows.push(r);
          recordIds(r, idMap);
        }
      }
    }

    // 3. Update existing rows one-by-one (Supabase doesn't bulk update easily)
    for (const u of toUpdate) {
      const { data, error } = await sb
        .from('papers')
        .update(u.row)
        .eq('id', u.id)
        .select('id,doi,pmid,arxiv_id,openalex_id,s2_id,title,abstract,year,venue,field,authors,citation_count,full_text_url,source,ingested_at')
        .single();
      if (error) {
        logger.warn('update failed', { id: u.id, error: error.message });
      } else if (data) {
        const row = data as unknown as Paper;
        outRows.push(row);
        recordIds(row, idMap);
      }
    }
  }

  // 4. Emit paper_sections(kind='abstract') for any paper that has an abstract
  //    and doesn't already have one on file.
  await insertAbstractSections(outRows);

  return { rows: outRows, idMap };
}

function recordIds(r: Paper, idMap: Map<string, string>) {
  if (r.doi)         idMap.set(`doi:${r.doi}`, r.id);
  if (r.pmid)        idMap.set(`pmid:${r.pmid}`, r.id);
  if (r.arxiv_id)    idMap.set(`arxiv:${r.arxiv_id}`, r.id);
  if (r.openalex_id) idMap.set(`oa:${r.openalex_id}`, r.id);
  if (r.s2_id)       idMap.set(`s2:${r.s2_id}`, r.id);
}

async function insertAbstractSections(rows: Paper[]): Promise<void> {
  const sb = supabaseAdmin();
  const withAbs = rows.filter((r) => r.abstract && r.abstract.length > 0);
  if (withAbs.length === 0) return;

  // Fetch existing abstract sections in one shot
  const ids = withAbs.map((r) => r.id);
  const { data: existing, error } = await sb
    .from('paper_sections')
    .select('paper_id,kind')
    .in('paper_id', ids)
    .eq('kind', 'abstract');
  if (error) {
    logger.warn('paper_sections lookup failed', { error: error.message });
  }
  const have = new Set((existing ?? []).map((r: { paper_id: string }) => r.paper_id));

  const newRows = withAbs
    .filter((r) => !have.has(r.id))
    .map((r) => ({
      paper_id: r.id,
      kind: 'abstract',
      text: r.abstract,
      position: 0,
    }));

  if (newRows.length === 0) return;

  for (const batch of chunks(newRows, BATCH)) {
    const { error: insErr } = await sb.from('paper_sections').insert(batch);
    if (insErr) logger.warn('paper_sections insert failed', { error: insErr.message });
  }
}

/** Re-export a small helper type for callers of runIngestion. */
export type PersistResult = { rows: Paper[]; idMap: Map<string, string> };

// Type guard used upstream so this file can ensure the RawPaper.source field
// is still one of the canonical PaperSource values (dedupe may produce a
// comma-joined list — persisted as-is into `papers.source`).
export function normalizeSource(source: string): PaperSource {
  const first = source.split(',')[0] as PaperSource;
  return first;
}
