/**
 * Crossref adapter — universal metadata source.
 *
 * Docs: https://api.crossref.org/swagger-ui/index.html
 * Polite pool: include mailto query param.
 */
import type { Author, RawPaper } from '@lacunose/types';
import { env } from '../../lib/env.js';
import { log } from '../../lib/logger.js';
import { get } from '../httpClient.js';
import { defaultLimiter } from '../rateLimit.js';
import type { SearchQuery, SourceAdapter } from '../types.js';

const logger = log.child('ingest:crossref');
const BASE = 'https://api.crossref.org/works';

interface CRAuthor {
  given?: string;
  family?: string;
  ORCID?: string;
  affiliation?: Array<{ name?: string }>;
}

interface CRItem {
  DOI?: string;
  title?: string[];
  abstract?: string;
  'container-title'?: string[];
  published?: { 'date-parts'?: number[][] };
  'published-print'?: { 'date-parts'?: number[][] };
  'published-online'?: { 'date-parts'?: number[][] };
  created?: { 'date-parts'?: number[][] };
  author?: CRAuthor[];
  'is-referenced-by-count'?: number;
  reference?: Array<{ DOI?: string }>;
  URL?: string;
  subject?: string[];
}

interface CRResponse {
  status?: string;
  message?: {
    items?: CRItem[];
    'total-results'?: number;
    'next-cursor'?: string;
  };
}

function extractYear(item: CRItem): number | null {
  const parts =
    item.published?.['date-parts'] ??
    item['published-online']?.['date-parts'] ??
    item['published-print']?.['date-parts'] ??
    item.created?.['date-parts'];
  const first = parts?.[0];
  if (!first) return null;
  const year = first[0];
  return typeof year === 'number' ? year : null;
}

function stripHtml(s: string): string {
  // Crossref abstracts are JATS XML — strip all tags.
  return s
    .replace(/<jats:[^>]+>|<\/jats:[^>]+>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapItem(item: CRItem): RawPaper | null {
  if (!item.DOI) return null;
  const title = item.title?.[0]?.trim();
  if (!title) return null;

  const doi = item.DOI.toLowerCase();
  const abstract = item.abstract ? stripHtml(item.abstract) : null;

  const authors: Author[] = (item.author ?? [])
    .map((a) => {
      const name = [a.given, a.family].filter(Boolean).join(' ').trim();
      if (!name) return null;
      const out: Author = { name };
      if (a.ORCID) out.orcid = a.ORCID;
      const aff = a.affiliation?.[0]?.name;
      if (aff) out.affiliation = aff;
      return out;
    })
    .filter((a): a is Author => a !== null);

  const references = (item.reference ?? [])
    .map((r) => r.DOI?.toLowerCase() ?? '')
    .filter((s) => s.length > 0);

  return {
    source: 'crossref',
    external_id: doi,
    doi,
    pmid: null,
    arxiv_id: null,
    openalex_id: null,
    s2_id: null,
    title,
    abstract,
    year: extractYear(item),
    venue: item['container-title']?.[0] ?? null,
    field: item.subject && item.subject.length > 0 ? item.subject : null,
    authors: authors.length > 0 ? authors : null,
    citation_count: item['is-referenced-by-count'] ?? null,
    full_text_url: item.URL ?? null,
    references: references.length > 0 ? references : null,
  };
}

export const crossrefAdapter: SourceAdapter = {
  id: 'crossref',
  label: 'Crossref',
  applicableFields: 'all',

  async *search(q: SearchQuery, signal?: AbortSignal): AsyncIterable<RawPaper> {
    const limiter = defaultLimiter('crossref');
    const rows = 50;
    let cursor: string | null = '*';
    let yielded = 0;

    // Crossref recommends cursor pagination ("deep paging") for large result sets.
    while (yielded < q.limit) {
      if (signal?.aborted) return;

      const params = new URLSearchParams({
        query: q.topic,
        rows: String(rows),
        cursor: cursor ?? '*',
        mailto: env.POLITE_EMAIL,
      });
      if (q.years) {
        params.set('filter', `from-pub-date:${q.years[0]},until-pub-date:${q.years[1]}`);
      }

      await limiter.acquire();
      const url = `${BASE}?${params.toString()}`;
      const data = (await get(url, { signal })) as CRResponse;

      const items = data.message?.items ?? [];
      for (const item of items) {
        if (signal?.aborted) return;
        const mapped = mapItem(item);
        if (!mapped) continue;
        yield mapped;
        yielded++;
        if (yielded >= q.limit) break;
      }

      const next = data.message?.['next-cursor'];
      if (!next || items.length === 0) break;
      cursor = next;
    }

    logger.info('search done', { topic: q.topic, yielded });
  },
};
