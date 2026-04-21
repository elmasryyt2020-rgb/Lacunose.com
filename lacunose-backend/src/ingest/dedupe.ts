/**
 * Cross-source deduplication.
 *
 * Merge precedence (strongest → weakest ID):
 *   DOI exact > PMID exact > arXiv ID exact > OpenAlex ID exact
 *   Fuzzy: Jaro-Winkler(title) ≥ 0.92 AND ≥1 overlapping author last name.
 *
 * Source preference for authoritative metadata:
 *   pubmed > europepmc > s2 > openalex > arxiv > crossref
 */
import type { PaperSource, RawPaper } from '@lacunose/types';

// --------------------------------------------------------------------------
// Jaro-Winkler (self-contained)
// --------------------------------------------------------------------------

function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches: boolean[] = new Array(a.length).fill(false);
  const bMatches: boolean[] = new Array(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
}

export function jaroWinkler(a: string, b: string, p = 0.1): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  const jr = jaro(na, nb);

  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(na.length, nb.length));
  for (let i = 0; i < maxPrefix; i++) {
    if (na[i] === nb[i]) prefix++;
    else break;
  }
  return jr + prefix * p * (1 - jr);
}

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// --------------------------------------------------------------------------
// Source preference
// --------------------------------------------------------------------------

const SOURCE_RANK: Record<PaperSource, number> = {
  pubmed:    6,
  europepmc: 5,
  s2:        4,
  openalex:  3,
  arxiv:     2,
  crossref:  1,
  unpaywall: 0,
};

function sourceRank(s: string): number {
  // Handle comma-joined sources produced by earlier mergeTwo() calls.
  // Take the max rank among the listed sources.
  let best = -1;
  for (const part of s.split(',')) {
    const trimmed = part.trim() as PaperSource;
    const rank = SOURCE_RANK[trimmed] ?? -1;
    if (rank > best) best = rank;
  }
  return best;
}

function preferred(a: RawPaper, b: RawPaper): RawPaper {
  return sourceRank(a.source) >= sourceRank(b.source) ? a : b;
}

// --------------------------------------------------------------------------
// Author-overlap helper
// --------------------------------------------------------------------------

function lastNameSet(p: RawPaper): Set<string> {
  const out = new Set<string>();
  for (const a of p.authors ?? []) {
    const parts = a.name.trim().split(/\s+/);
    const last = parts[parts.length - 1];
    if (last && last.length > 1) out.add(last.toLowerCase());
  }
  return out;
}

function authorsOverlap(a: RawPaper, b: RawPaper): boolean {
  const ta = lastNameSet(a);
  const tb = lastNameSet(b);
  if (ta.size === 0 || tb.size === 0) return false;
  for (const name of ta) if (tb.has(name)) return true;
  return false;
}

// --------------------------------------------------------------------------
// Merge two records
// --------------------------------------------------------------------------

function longer(a: string | null | undefined, b: string | null | undefined): string | null {
  const la = a?.length ?? 0;
  const lb = b?.length ?? 0;
  return la >= lb ? (a ?? null) : (b ?? null);
}

function pickNonNull<T>(a: T | null | undefined, b: T | null | undefined): T | null {
  if (a !== null && a !== undefined) return a;
  if (b !== null && b !== undefined) return b;
  return null;
}

function unionArr<T>(
  a: T[] | null | undefined,
  b: T[] | null | undefined,
  key: (x: T) => string,
): T[] | null {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const arr of [a, b]) {
    if (!arr) continue;
    for (const v of arr) {
      const k = key(v);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(v);
    }
  }
  return out.length > 0 ? out : null;
}

export function mergeTwo(a: RawPaper, b: RawPaper): RawPaper {
  const strong = preferred(a, b);
  const weak = strong === a ? b : a;

  // Union sources into a comma-joined string; preserve strong.source as primary.
  // `source` is typed PaperSource on the wire; we keep that but the merged record
  // may contain a comma list of sources if upstream callers inspect it.
  const sourceList = Array.from(new Set([strong.source, weak.source]));
  const sourceCombined = sourceList.join(',') as PaperSource;

  return {
    source: sourceCombined,
    external_id: strong.external_id,
    doi:         pickNonNull(strong.doi,         weak.doi),
    pmid:        pickNonNull(strong.pmid,        weak.pmid),
    arxiv_id:    pickNonNull(strong.arxiv_id,    weak.arxiv_id),
    openalex_id: pickNonNull(strong.openalex_id, weak.openalex_id),
    s2_id:       pickNonNull(strong.s2_id,       weak.s2_id),
    title:       strong.title || weak.title,
    abstract:    longer(strong.abstract, weak.abstract),
    year:        pickNonNull(strong.year,   weak.year),
    venue:       pickNonNull(strong.venue,  weak.venue),
    field:       unionArr(strong.field, weak.field, (s) => s.toLowerCase()),
    authors:     (strong.authors && strong.authors.length > 0 ? strong.authors : weak.authors) ?? null,
    citation_count: Math.max(strong.citation_count ?? 0, weak.citation_count ?? 0) || null,
    full_text_url:  pickNonNull(strong.full_text_url, weak.full_text_url),
    references: unionArr(strong.references, weak.references, (s) => s.toLowerCase()),
  };
}

// --------------------------------------------------------------------------
// Bucket-and-merge dedupe
// --------------------------------------------------------------------------

function norm(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  return t.length > 0 ? t : null;
}

export function dedupe(papers: RawPaper[]): RawPaper[] {
  if (papers.length === 0) return [];

  // Phase 1: exact-ID merge using union-find over 4 ID types.
  const parent: number[] = papers.map((_, i) => i);
  const find = (i: number): number => {
    let r = i;
    while (parent[r] !== r) r = parent[r]!;
    let cur = i;
    while (parent[cur] !== r) {
      const next = parent[cur]!;
      parent[cur] = r;
      cur = next;
    }
    return r;
  };
  const union = (i: number, j: number) => {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  };

  const doiMap = new Map<string, number>();
  const pmidMap = new Map<string, number>();
  const arxivMap = new Map<string, number>();
  const oaMap = new Map<string, number>();
  const s2Map = new Map<string, number>();

  for (let i = 0; i < papers.length; i++) {
    const p = papers[i]!;
    const doi = norm(p.doi);
    const pmid = norm(p.pmid);
    const arxiv = norm(p.arxiv_id);
    const oa = norm(p.openalex_id);
    const s2 = norm(p.s2_id);

    if (doi) {
      const prev = doiMap.get(doi);
      if (prev !== undefined) union(prev, i);
      else doiMap.set(doi, i);
    }
    if (pmid) {
      const prev = pmidMap.get(pmid);
      if (prev !== undefined) union(prev, i);
      else pmidMap.set(pmid, i);
    }
    if (arxiv) {
      const prev = arxivMap.get(arxiv);
      if (prev !== undefined) union(prev, i);
      else arxivMap.set(arxiv, i);
    }
    if (oa) {
      const prev = oaMap.get(oa);
      if (prev !== undefined) union(prev, i);
      else oaMap.set(oa, i);
    }
    if (s2) {
      const prev = s2Map.get(s2);
      if (prev !== undefined) union(prev, i);
      else s2Map.set(s2, i);
    }
  }

  // Phase 2: fuzzy title + author-overlap within year buckets.
  // We only compare papers that are *not already unified* via an ID.
  // Use a coarse year bucket (±1) to keep the comparison O(n) per bucket.
  const yearBuckets = new Map<number, number[]>();
  for (let i = 0; i < papers.length; i++) {
    const y = papers[i]!.year ?? 0;
    const bucket = yearBuckets.get(y) ?? [];
    bucket.push(i);
    yearBuckets.set(y, bucket);
  }

  const years = Array.from(yearBuckets.keys()).sort((a, b) => a - b);
  for (const y of years) {
    const candidates: number[] = [];
    for (const dy of [-1, 0, 1]) {
      const b = yearBuckets.get(y + dy);
      if (b) candidates.push(...b);
    }
    for (let a = 0; a < candidates.length; a++) {
      for (let b = a + 1; b < candidates.length; b++) {
        const ia = candidates[a]!;
        const ib = candidates[b]!;
        if (find(ia) === find(ib)) continue;
        const pa = papers[ia]!;
        const pb = papers[ib]!;
        if (pa.title.length < 10 || pb.title.length < 10) continue;
        const jw = jaroWinkler(pa.title, pb.title);
        if (jw < 0.92) continue;
        if (!authorsOverlap(pa, pb)) continue;
        union(ia, ib);
      }
    }
  }

  // Phase 3: fold into cluster representatives, merging pairwise.
  const clusters = new Map<number, RawPaper>();
  for (let i = 0; i < papers.length; i++) {
    const root = find(i);
    const existing = clusters.get(root);
    clusters.set(root, existing ? mergeTwo(existing, papers[i]!) : papers[i]!);
  }
  return Array.from(clusters.values());
}
