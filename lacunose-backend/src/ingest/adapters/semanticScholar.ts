/**
 * Semantic Scholar (S2) adapter — universal, with cross-field coverage.
 *
 * Docs: https://api.semanticscholar.org/api-docs/graph
 * Requires SEMANTIC_SCHOLAR_API_KEY for the 1 req/sec authenticated tier.
 */
import type { Author, RawPaper } from '@lacunose/types';
import { env } from '../../lib/env.js';
import { log } from '../../lib/logger.js';
import { get, HttpError } from '../httpClient.js';
import { defaultLimiter } from '../rateLimit.js';
import type { SearchQuery, SourceAdapter } from '../types.js';

const logger = log.child('ingest:s2');
const BASE = 'https://api.semanticscholar.org/graph/v1/paper/search';

const FIELDS = [
  'externalIds',
  'title',
  'abstract',
  'year',
  'venue',
  'authors.name',
  'authors.externalIds',
  'citationCount',
  'fieldsOfStudy',
  'tldr',
  'references.externalIds',
  'openAccessPdf',
].join(',');

interface S2Author {
  name?: string;
  externalIds?: { ORCID?: string } | null;
}

interface S2Paper {
  paperId?: string;
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    PubMed?: string;
    PubMedCentral?: string;
  } | null;
  title?: string;
  abstract?: string | null;
  year?: number | null;
  venue?: string | null;
  authors?: S2Author[] | null;
  citationCount?: number | null;
  fieldsOfStudy?: string[] | null;
  tldr?: { text?: string | null } | null;
  references?: Array<{ externalIds?: { DOI?: string } | null }> | null;
  openAccessPdf?: { url?: string | null } | null;
}

interface S2Response {
  data?: S2Paper[];
  total?: number;
  offset?: number;
  next?: number;
}

function mapPaper(p: S2Paper): RawPaper | null {
  if (!p.paperId || !p.title) return null;
  const doi = p.externalIds?.DOI?.toLowerCase() ?? null;
  const arxiv_id = p.externalIds?.ArXiv ?? null;
  const pmid = p.externalIds?.PubMed ?? null;

  const authors: Author[] = (p.authors ?? [])
    .map((a) => {
      if (!a.name) return null;
      const out: Author = { name: a.name };
      if (a.externalIds?.ORCID) out.orcid = a.externalIds.ORCID;
      return out;
    })
    .filter((a): a is Author => a !== null);

  const references = (p.references ?? [])
    .map((r) => r.externalIds?.DOI?.toLowerCase() ?? '')
    .filter((s) => s.length > 0);

  // Prefer the real abstract, fall back to tldr.text.
  const abstract = p.abstract ?? p.tldr?.text ?? null;

  return {
    source: 's2',
    external_id: p.paperId,
    s2_id: p.paperId,
    doi,
    arxiv_id,
    pmid,
    openalex_id: null,
    title: p.title,
    abstract,
    year: p.year ?? null,
    venue: p.venue ?? null,
    field: p.fieldsOfStudy && p.fieldsOfStudy.length > 0 ? p.fieldsOfStudy : null,
    authors: authors.length > 0 ? authors : null,
    citation_count: p.citationCount ?? null,
    full_text_url: p.openAccessPdf?.url ?? null,
    references: references.length > 0 ? references : null,
  };
}

export const semanticScholarAdapter: SourceAdapter = {
  id: 's2',
  label: 'Semantic Scholar',
  applicableFields: 'all',

  async *search(q: SearchQuery, signal?: AbortSignal): AsyncIterable<RawPaper> {
    const limiter = defaultLimiter('s2');
    const pageSize = 100;
    let offset = 0;
    let yielded = 0;

    const headers: Record<string, string> = {};
    if (env.SEMANTIC_SCHOLAR_API_KEY) {
      headers['x-api-key'] = env.SEMANTIC_SCHOLAR_API_KEY;
    }

    while (yielded < q.limit) {
      if (signal?.aborted) return;

      const params = new URLSearchParams({
        query: q.topic,
        limit: String(pageSize),
        offset: String(offset),
        fields: FIELDS,
      });
      if (q.years) {
        params.set('year', `${q.years[0]}-${q.years[1]}`);
      }
      if (q.open_access_only) {
        params.set('openAccessPdf', '');
      }

      await limiter.acquire();
      const url = `${BASE}?${params.toString()}`;
      let data: S2Response;
      try {
        data = (await get(url, { signal, headers })) as S2Response;
      } catch (e) {
        if (e instanceof HttpError && e.status === 404) {
          // No results at this offset — stop cleanly
          break;
        }
        throw e;
      }

      const results = data.data ?? [];
      for (const p of results) {
        if (signal?.aborted) return;
        const mapped = mapPaper(p);
        if (!mapped) continue;
        yield mapped;
        yielded++;
        if (yielded >= q.limit) break;
      }

      if (results.length < pageSize) break;
      if (data.next == null) break;
      offset = data.next;
    }

    logger.info('search done', { topic: q.topic, yielded });
  },
};
