/**
 * Europe PMC adapter — biomed-oriented, but also indexes preprints.
 *
 * Docs: https://europepmc.org/RestfulWebService
 */
import type { Author, RawPaper } from '@lacunose/types';
import { log } from '../../lib/logger.js';
import { get } from '../httpClient.js';
import { defaultLimiter } from '../rateLimit.js';
import type { SearchQuery, SourceAdapter } from '../types.js';

const logger = log.child('ingest:europepmc');
const BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

interface EPMCAuthor {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  authorId?: { type?: string; value?: string };
  affiliation?: string;
}

interface EPMCResult {
  id?: string;
  pmid?: string;
  doi?: string;
  title?: string;
  abstractText?: string;
  pubYear?: string;
  journalTitle?: string;
  authorList?: { author?: EPMCAuthor[] };
  citedByCount?: number;
  isOpenAccess?: 'Y' | 'N';
  fullTextUrlList?: { fullTextUrl?: Array<{ url?: string; documentStyle?: string }> };
}

interface EPMCResponse {
  hitCount?: number;
  nextCursorMark?: string;
  resultList?: { result?: EPMCResult[] };
}

function mapResult(r: EPMCResult): RawPaper | null {
  const title = r.title?.trim();
  if (!title) return null;

  const doi = r.doi?.toLowerCase() ?? null;
  const pmid = r.pmid ?? null;
  const externalId = pmid ?? doi ?? r.id ?? null;
  if (!externalId) return null;

  const authors: Author[] = (r.authorList?.author ?? [])
    .map((a) => {
      const name =
        a.fullName?.trim() ??
        [a.firstName, a.lastName].filter(Boolean).join(' ').trim();
      if (!name) return null;
      const out: Author = { name };
      if (a.affiliation) out.affiliation = a.affiliation;
      if (a.authorId?.type?.toLowerCase() === 'orcid' && a.authorId.value) {
        out.orcid = a.authorId.value;
      }
      return out;
    })
    .filter((a): a is Author => a !== null);

  const pdfUrl = r.fullTextUrlList?.fullTextUrl?.find((u) =>
    (u.documentStyle ?? '').toLowerCase().includes('pdf'),
  )?.url;

  const year = r.pubYear ? parseInt(r.pubYear, 10) : null;

  return {
    source: 'europepmc',
    external_id: externalId,
    pmid,
    doi,
    arxiv_id: null,
    openalex_id: null,
    s2_id: null,
    title,
    abstract: r.abstractText ?? null,
    year: year && !Number.isNaN(year) ? year : null,
    venue: r.journalTitle ?? null,
    field: null,
    authors: authors.length > 0 ? authors : null,
    citation_count: r.citedByCount ?? null,
    full_text_url: pdfUrl ?? null,
    references: null,
  };
}

export const europepmcAdapter: SourceAdapter = {
  id: 'europepmc',
  label: 'Europe PMC',
  applicableFields: ['medicine', 'biology', 'psychology', 'environmental-science'],

  async *search(q: SearchQuery, signal?: AbortSignal): AsyncIterable<RawPaper> {
    const limiter = defaultLimiter('europepmc');
    const pageSize = 100;
    let cursor: string | null = '*';
    let yielded = 0;

    while (yielded < q.limit && cursor) {
      if (signal?.aborted) return;

      // EPMC advanced query terms: TITLE_ABS:"topic" + optional date filter
      let queryStr = q.topic;
      if (q.years) queryStr += ` AND (PUB_YEAR:[${q.years[0]} TO ${q.years[1]}])`;
      if (q.open_access_only) queryStr += ' AND OPEN_ACCESS:Y';

      const params = new URLSearchParams({
        query: queryStr,
        format: 'json',
        pageSize: String(pageSize),
        cursorMark: cursor,
        resultType: 'core',
      });

      await limiter.acquire();
      const url = `${BASE}?${params.toString()}`;
      const data = (await get(url, { signal })) as EPMCResponse;

      const results = data.resultList?.result ?? [];
      for (const r of results) {
        if (signal?.aborted) return;
        const mapped = mapResult(r);
        if (!mapped) continue;
        yield mapped;
        yielded++;
        if (yielded >= q.limit) break;
      }

      const next = data.nextCursorMark;
      if (!next || next === cursor || results.length === 0) break;
      cursor = next;
    }

    logger.info('search done', { topic: q.topic, yielded });
  },
};
