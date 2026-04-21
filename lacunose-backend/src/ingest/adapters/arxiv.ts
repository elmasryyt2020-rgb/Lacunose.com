/**
 * arXiv adapter — preprints for CS / physics / math / stat / quant-bio etc.
 *
 * Docs: https://info.arxiv.org/help/api/basics.html
 * Response is Atom XML; we parse a minimal subset via regex.
 */
import type { Author, RawPaper } from '@lacunose/types';
import { log } from '../../lib/logger.js';
import { getText } from '../httpClient.js';
import { defaultLimiter } from '../rateLimit.js';
import type { SearchQuery, SourceAdapter } from '../types.js';

const logger = log.child('ingest:arxiv');
const BASE = 'http://export.arxiv.org/api/query';

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function firstTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = xml.match(re);
  return m?.[1] ?? null;
}

function allTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'gi');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const inner = m[1];
    if (inner !== undefined) out.push(inner);
  }
  return out;
}

function parseEntry(entryXml: string): RawPaper | null {
  const rawId = firstTag(entryXml, 'id');
  if (!rawId) return null;
  const idUrl = rawId.trim();
  // Strip the version suffix (…v2) — otherwise dedupe against other sources
  // (OpenAlex, S2) that report the canonical non-versioned ID fails.
  const rawArxivId = idUrl.includes('/abs/') ? idUrl.split('/abs/')[1]?.trim() : undefined;
  const arxiv_id = rawArxivId ? rawArxivId.replace(/v\d+$/i, '') : null;
  if (!arxiv_id) return null;

  const title = collapseWs(decodeXml(firstTag(entryXml, 'title') ?? ''));
  if (!title) return null;

  const summary = firstTag(entryXml, 'summary');
  const abstract = summary ? collapseWs(decodeXml(summary)) : null;

  const published = firstTag(entryXml, 'published');
  let year: number | null = null;
  if (published) {
    const parsed = new Date(published.trim());
    if (!Number.isNaN(parsed.getTime())) year = parsed.getUTCFullYear();
  }

  // Authors — each <author><name>…</name></author>
  const authorXmls = allTags(entryXml, 'author');
  const authors: Author[] = authorXmls
    .map((ax) => {
      const name = firstTag(ax, 'name');
      if (!name) return null;
      return { name: collapseWs(decodeXml(name)) };
    })
    .filter((a): a is Author => a !== null);

  // Categories: <category term="cs.LG" ... />
  const catRe = /<category\s+term="([^"]+)"/gi;
  const cats: string[] = [];
  let cm: RegExpExecArray | null;
  while ((cm = catRe.exec(entryXml)) !== null) {
    if (cm[1]) cats.push(cm[1]);
  }

  // arXiv namespaced DOI: <arxiv:doi>10.…</arxiv:doi>
  const doiMatch = entryXml.match(/<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/i);
  const doi = doiMatch?.[1]?.toLowerCase().trim() ?? null;

  // PDF link
  const pdfMatch = entryXml.match(/<link\b[^>]*title="pdf"[^>]*href="([^"]+)"/i);
  const pdfUrl = pdfMatch?.[1] ?? null;

  return {
    source: 'arxiv',
    external_id: arxiv_id,
    arxiv_id,
    doi,
    pmid: null,
    openalex_id: null,
    s2_id: null,
    title,
    abstract,
    year,
    venue: 'arXiv',
    field: cats.length > 0 ? cats : null,
    authors: authors.length > 0 ? authors : null,
    citation_count: null,
    full_text_url: pdfUrl,
    references: null,
  };
}

export const arxivAdapter: SourceAdapter = {
  id: 'arxiv',
  label: 'arXiv',
  applicableFields: [
    'computer-science',
    'physics',
    'mathematics',
    'engineering',
    'materials',
  ],

  async *search(q: SearchQuery, signal?: AbortSignal): AsyncIterable<RawPaper> {
    const limiter = defaultLimiter('arxiv');
    const pageSize = 100;
    let start = 0;
    let yielded = 0;

    while (yielded < q.limit) {
      if (signal?.aborted) return;

      const params = new URLSearchParams({
        search_query: `all:${q.topic}`,
        start: String(start),
        max_results: String(pageSize),
        sortBy: 'relevance',
      });

      await limiter.acquire();
      const url = `${BASE}?${params.toString()}`;
      const xml = await getText(url, { signal });

      const entries = allTags(xml, 'entry');
      if (entries.length === 0) break;

      let countThisPage = 0;
      for (const ex of entries) {
        if (signal?.aborted) return;
        const p = parseEntry(ex);
        if (!p) continue;
        // If years filter specified, drop out-of-range.
        if (q.years && p.year != null && (p.year < q.years[0] || p.year > q.years[1])) continue;
        yield p;
        yielded++;
        countThisPage++;
        if (yielded >= q.limit) break;
      }

      if (entries.length < pageSize || countThisPage === 0) break;
      start += pageSize;
    }

    logger.info('search done', { topic: q.topic, yielded });
  },
};
