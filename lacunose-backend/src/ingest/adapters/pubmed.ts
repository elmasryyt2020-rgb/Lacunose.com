/**
 * PubMed (E-utilities) adapter — biomed fields only.
 *
 * Two-step: esearch → efetch. Uses regex parsing of the efetch XML — PubMed
 * XML is verbose but fields we need are well-defined. Keeps deps minimal.
 *
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 */
import type { Author, RawPaper } from '@lacunose/types';
import { env } from '../../lib/env.js';
import { log } from '../../lib/logger.js';
import { getText, get } from '../httpClient.js';
import { defaultLimiter } from '../rateLimit.js';
import type { SearchQuery, SourceAdapter } from '../types.js';

const logger = log.child('ingest:pubmed');
const ESEARCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';
const EFETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

interface ESearchResp {
  esearchresult?: {
    idlist?: string[];
    count?: string;
  };
}

/** Unescape the handful of XML entities PubMed actually emits. */
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

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/** Extract first occurrence of <tag>…</tag> and return inner text. */
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

function parseArticle(articleXml: string): RawPaper | null {
  const pmid = firstTag(articleXml, 'PMID');
  if (!pmid) return null;

  const titleRaw = firstTag(articleXml, 'ArticleTitle') ?? '';
  const title = stripTags(decodeXml(titleRaw));
  if (!title) return null;

  // AbstractText can repeat with Label="BACKGROUND" etc. — concat.
  const abstractParts = allTags(articleXml, 'AbstractText').map((s) => stripTags(decodeXml(s)));
  const abstract = abstractParts.length > 0 ? abstractParts.join(' ') : null;

  // DOI lives in ArticleId[IdType="doi"]
  let doi: string | null = null;
  const idRe = /<ArticleId\s+IdType="([^"]+)"\s*>([^<]+)<\/ArticleId>/gi;
  let idm: RegExpExecArray | null;
  while ((idm = idRe.exec(articleXml)) !== null) {
    if (idm[1]?.toLowerCase() === 'doi' && idm[2]) {
      doi = idm[2].toLowerCase().trim();
      break;
    }
  }

  // Year — try PubDate/Year, ArticleDate/Year, MedlineDate
  let year: number | null = null;
  const pubDate = firstTag(articleXml, 'PubDate') ?? firstTag(articleXml, 'ArticleDate');
  if (pubDate) {
    const y = firstTag(pubDate, 'Year');
    if (y) {
      const parsed = parseInt(y, 10);
      if (!Number.isNaN(parsed)) year = parsed;
    } else {
      const medline = firstTag(pubDate, 'MedlineDate');
      if (medline) {
        const m = medline.match(/\d{4}/);
        if (m) year = parseInt(m[0], 10);
      }
    }
  }

  const journal = firstTag(articleXml, 'Title') ?? firstTag(articleXml, 'ISOAbbreviation');
  const venue = journal ? stripTags(decodeXml(journal)) : null;

  // Authors
  const authorXmls = allTags(articleXml, 'Author');
  const authors: Author[] = authorXmls
    .map((ax) => {
      const last = firstTag(ax, 'LastName');
      const fore = firstTag(ax, 'ForeName') ?? firstTag(ax, 'Initials');
      const collective = firstTag(ax, 'CollectiveName');
      const name = collective
        ? stripTags(decodeXml(collective))
        : [fore, last].filter(Boolean).map((s) => stripTags(decodeXml(s!))).join(' ').trim();
      if (!name) return null;
      const out: Author = { name };
      const aff = firstTag(ax, 'Affiliation');
      if (aff) out.affiliation = stripTags(decodeXml(aff));
      return out;
    })
    .filter((a): a is Author => a !== null);

  // MeSH descriptors as field[]
  const meshRe = /<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/gi;
  const mesh: string[] = [];
  let mm: RegExpExecArray | null;
  while ((mm = meshRe.exec(articleXml)) !== null) {
    if (mm[1]) mesh.push(stripTags(decodeXml(mm[1])));
  }

  return {
    source: 'pubmed',
    external_id: pmid,
    pmid,
    doi,
    arxiv_id: null,
    openalex_id: null,
    s2_id: null,
    title,
    abstract,
    year,
    venue,
    field: mesh.length > 0 ? mesh : null,
    authors: authors.length > 0 ? authors : null,
    citation_count: null,
    full_text_url: null,
    references: null,
  };
}

/** Exported so tests / parse workers can reuse. */
export function parsePubmedXml(xml: string): RawPaper[] {
  // Split by PubmedArticle OR PubmedBookArticle
  const articleRe = /<(PubmedArticle|PubmedBookArticle)\b[\s\S]*?<\/\1>/gi;
  const out: RawPaper[] = [];
  let m: RegExpExecArray | null;
  while ((m = articleRe.exec(xml)) !== null) {
    const chunk = m[0];
    try {
      const p = parseArticle(chunk);
      if (p) out.push(p);
    } catch (e) {
      logger.warn('parse error', { error: (e as Error).message });
    }
  }
  return out;
}

export const pubmedAdapter: SourceAdapter = {
  id: 'pubmed',
  label: 'PubMed',
  applicableFields: ['medicine', 'biology', 'psychology', 'environmental-science'],

  async *search(q: SearchQuery, signal?: AbortSignal): AsyncIterable<RawPaper> {
    const limiter = defaultLimiter('pubmed');
    const key = env.PUBMED_API_KEY;
    const pageSize = 200; // PMIDs per esearch page
    let retstart = 0;
    let yielded = 0;

    while (yielded < q.limit) {
      if (signal?.aborted) return;

      const searchParams = new URLSearchParams({
        db: 'pubmed',
        term: q.topic,
        retmode: 'json',
        retmax: String(pageSize),
        retstart: String(retstart),
      });
      if (key) searchParams.set('api_key', key);
      if (q.years) {
        searchParams.set(
          'term',
          `${q.topic} AND (${q.years[0]}:${q.years[1]}[dp])`,
        );
      }

      await limiter.acquire();
      const searchUrl = `${ESEARCH}?${searchParams.toString()}`;
      const searchResp = (await get(searchUrl, { signal })) as ESearchResp;

      const ids = searchResp.esearchresult?.idlist ?? [];
      if (ids.length === 0) break;

      // Fetch the XML for this batch
      const fetchParams = new URLSearchParams({
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml',
      });
      if (key) fetchParams.set('api_key', key);

      await limiter.acquire();
      const fetchUrl = `${EFETCH}?${fetchParams.toString()}`;
      const xml = await getText(fetchUrl, { signal });
      const papers = parsePubmedXml(xml);

      for (const p of papers) {
        if (signal?.aborted) return;
        yield p;
        yielded++;
        if (yielded >= q.limit) break;
      }

      if (ids.length < pageSize) break;
      retstart += pageSize;
    }

    logger.info('search done', { topic: q.topic, yielded });
  },
};
