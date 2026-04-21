/**
 * OpenAlex adapter — universal (all fields).
 *
 * Docs: https://docs.openalex.org/api-entities/works/search-works
 * Uses the "polite pool" via a `mailto` query param + User-Agent.
 */
import type { Author, RawPaper } from '@lacunose/types';
import { env } from '../../lib/env.js';
import { log } from '../../lib/logger.js';
import { get } from '../httpClient.js';
import { defaultLimiter } from '../rateLimit.js';
import type { SearchQuery, SourceAdapter } from '../types.js';

const logger = log.child('ingest:openalex');
const BASE = 'https://api.openalex.org/works';

/**
 * OpenAlex stores abstracts as a position → tokens inverted index.
 * Reconstruct into plain text.
 */
export function reconstructAbstract(invertedIndex: Record<string, number[]> | null | undefined): string {
  if (!invertedIndex) return '';
  const positions: Array<[number, string]> = [];
  for (const word of Object.keys(invertedIndex)) {
    const idxs = invertedIndex[word];
    if (!idxs) continue;
    for (const i of idxs) positions.push([i, word]);
  }
  positions.sort((a, b) => a[0] - b[0]);
  return positions.map((p) => p[1]).join(' ');
}

interface OAAuthor {
  author?: { display_name?: string; orcid?: string | null };
  raw_affiliation_string?: string | null;
}

interface OAWork {
  id?: string;
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  abstract_inverted_index?: Record<string, number[]> | null;
  publication_year?: number | null;
  host_venue?: { display_name?: string | null } | null;
  primary_location?: { source?: { display_name?: string | null } | null } | null;
  authorships?: OAAuthor[] | null;
  cited_by_count?: number | null;
  referenced_works?: string[] | null;
  concepts?: Array<{ display_name?: string | null; level?: number | null }> | null;
  open_access?: { oa_url?: string | null; is_oa?: boolean } | null;
}

interface OAResponse {
  results?: OAWork[];
  meta?: { next_cursor?: string | null; count?: number };
}

function buildFilter(q: SearchQuery): string {
  const parts: string[] = ['is_paratext:false'];
  if (q.concept_id) parts.push(`concepts.id:${q.concept_id}`);
  if (q.years) parts.push(`publication_year:${q.years[0]}-${q.years[1]}`);
  if (q.open_access_only) parts.push('open_access.is_oa:true');
  if (q.include_preprints === false) {
    // OpenAlex uses `type` = 'article'|'preprint'|...
    parts.push('type:article|review|book-chapter');
  }
  return parts.join(',');
}

function mapWork(w: OAWork): RawPaper | null {
  if (!w.id) return null;
  const openalex_id = w.id.split('/').pop() ?? null;
  const doi = w.doi ? w.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase() : null;
  const title = (w.title ?? w.display_name ?? '').trim();
  if (!title) return null;

  const abstractText = reconstructAbstract(w.abstract_inverted_index);
  const venue =
    w.host_venue?.display_name ??
    w.primary_location?.source?.display_name ??
    null;

  const authors: Author[] = (w.authorships ?? [])
    .map((a) => {
      const name = a.author?.display_name?.trim();
      if (!name) return null;
      const author: Author = { name };
      if (a.author?.orcid) author.orcid = a.author.orcid;
      if (a.raw_affiliation_string) author.affiliation = a.raw_affiliation_string;
      return author;
    })
    .filter((a): a is Author => a !== null);

  const field = (w.concepts ?? [])
    .filter((c) => (c.level ?? 99) <= 2)
    .map((c) => c.display_name ?? '')
    .filter((s) => s.length > 0);

  const references = (w.referenced_works ?? [])
    .map((r) => r.split('/').pop() ?? '')
    .filter((s) => s.length > 0);

  return {
    source: 'openalex',
    external_id: openalex_id ?? w.id,
    doi,
    openalex_id,
    pmid: null,
    arxiv_id: null,
    s2_id: null,
    title,
    abstract: abstractText || null,
    year: w.publication_year ?? null,
    venue,
    field: field.length > 0 ? field : null,
    authors: authors.length > 0 ? authors : null,
    citation_count: w.cited_by_count ?? null,
    full_text_url: w.open_access?.oa_url ?? null,
    references: references.length > 0 ? references : null,
  };
}

export const openalexAdapter: SourceAdapter = {
  id: 'openalex',
  label: 'OpenAlex',
  applicableFields: 'all',

  async *search(q: SearchQuery, signal?: AbortSignal): AsyncIterable<RawPaper> {
    const limiter = defaultLimiter('openalex');
    const filter = buildFilter(q);
    let cursor: string | null = '*';
    let yielded = 0;

    while (cursor && yielded < q.limit) {
      if (signal?.aborted) return;

      const params = new URLSearchParams({
        search: q.topic,
        per_page: '50',
        cursor,
        mailto: env.POLITE_EMAIL,
      });
      if (filter) params.set('filter', filter);

      await limiter.acquire();
      const url = `${BASE}?${params.toString()}`;
      const data = (await get(url, { signal })) as OAResponse;

      const results = data.results ?? [];
      for (const w of results) {
        if (signal?.aborted) return;
        const paper = mapWork(w);
        if (!paper) continue;
        yield paper;
        yielded++;
        if (yielded >= q.limit) break;
      }

      cursor = data.meta?.next_cursor ?? null;
      if (results.length === 0) break;
    }

    logger.info('search done', { topic: q.topic, yielded });
  },
};
