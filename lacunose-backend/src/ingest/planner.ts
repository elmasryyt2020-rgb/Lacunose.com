/**
 * Query planner — maps a field ID to the ordered set of adapters
 * that should be fanned out in parallel.
 *
 * Rules:
 *   - Always: openalex + s2 + crossref (universal coverage)
 *   - Biomed (medicine, biology, psychology, environmental-science):
 *       + pubmed + europepmc
 *   - CS/physics/math/engineering/materials: + arxiv
 *   - Unknown / 'generic': universal only
 */
import { arxivAdapter } from './adapters/arxiv.js';
import { crossrefAdapter } from './adapters/crossref.js';
import { europepmcAdapter } from './adapters/europepmc.js';
import { openalexAdapter } from './adapters/openalex.js';
import { pubmedAdapter } from './adapters/pubmed.js';
import { semanticScholarAdapter } from './adapters/semanticScholar.js';
import type { SourceAdapter } from './types.js';

const BIOMED = new Set(['medicine', 'biology', 'psychology', 'environmental-science']);
const ARXIV_FIELDS = new Set([
  'computer-science',
  'physics',
  'mathematics',
  'engineering',
  'materials',
  'statistics',
]);

/** Ordered list of adapters to query for a given field. */
export function planQuery(field?: string): SourceAdapter[] {
  const out: SourceAdapter[] = [openalexAdapter, semanticScholarAdapter, crossrefAdapter];
  if (!field) return out;

  const f = field.toLowerCase();
  if (BIOMED.has(f)) {
    out.push(pubmedAdapter, europepmcAdapter);
  }
  if (ARXIV_FIELDS.has(f)) {
    out.push(arxivAdapter);
  }
  return out;
}

/** All adapters, regardless of field. Useful for admin/debug tooling. */
export function allAdapters(): SourceAdapter[] {
  return [
    openalexAdapter,
    semanticScholarAdapter,
    crossrefAdapter,
    pubmedAdapter,
    europepmcAdapter,
    arxivAdapter,
  ];
}
