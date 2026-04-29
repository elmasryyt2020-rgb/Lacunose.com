/**
 * CLUSTER phase — group gap signals into coherent clusters.
 *
 * Strategy:
 *   1. Embed each signal's `phrase` via the shared hash-embed helper.
 *   2. Run HDBSCAN (`hdbscan-ts`) with `minClusterSize: 2, minSamples: 1`.
 *   3. If HDBSCAN returns fewer than MIN_CLUSTERS clusters OR every point is
 *      noise, fall back to bucketing by signal `kind` (future-work /
 *      limitation / contradiction-cue / methodology-hint).
 *   4. Always emit MIN_CLUSTERS-MAX_CLUSTERS clusters. Noise / singletons are
 *      folded into a single "misc" cluster when that keeps us in range.
 *
 * HDBSCAN labels: integer cluster IDs (0..k-1), or -1 for noise.
 */
import type { GapSignal } from '@lacunose/types';
import { log } from '../lib/logger.js';
import { embedShortTexts } from '../enrich/cohereEmbed.js';

const logger = log.child('gap:cluster');

// Bumped 4→6 / 8→10 (2026-04) to feed the reduce phase enough clusters that
// 8-12 final gaps is reliable. Each cluster yields exactly 3 candidates after
// the prompt change, so 6-10 clusters → 18-30 raw candidates → ~10-12 surviving
// rank+dedupe.
const MIN_CLUSTERS = 6;
const MAX_CLUSTERS = 10;

// hdbscan-ts typings are loose across versions — import dynamically and
// probe for the expected shape at runtime. reason: single third-party dep
// with multiple published APIs (class-based / function-based).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _hdb: any | null = null;
async function loadHdbscan(): Promise<unknown> {
  if (_hdb) return _hdb;
  try {
    const mod = await import('hdbscan-ts');
    _hdb = mod;
    return mod;
  } catch (e) {
    logger.warn('hdbscan-ts unavailable; using kind fallback', {
      error: (e as Error).message,
    });
    return null;
  }
}

/**
 * Cluster `signals` into 4-8 groups. Order within each cluster preserves the
 * input order so downstream prompts are reproducible.
 */
export async function clusterSignals(signals: GapSignal[]): Promise<GapSignal[][]> {
  if (signals.length === 0) return [];
  const t0 = Date.now();

  if (signals.length <= MIN_CLUSTERS) {
    // Tiny input: 1 cluster per kind-bucket, no HDBSCAN
    const buckets = bucketByKind(signals);
    logger.info('clusterSignals tiny-input fallback', {
      inputCount: signals.length,
      outputClusters: buckets.length,
      latencyMs: Date.now() - t0,
    });
    return padClusters(buckets);
  }

  // Embed phrases once via Cohere v3 ('clustering' input type). Falls back to
  // hashEmbed inside the helper if COHERE_API_KEY is unset, so dev/CI still
  // run end-to-end.
  const vectors = await embedShortTexts(signals.map((s) => s.phrase), 'clustering');

  const hdb = await loadHdbscan();
  if (hdb) {
    const labels = tryHdbscan(hdb, vectors);
    if (labels && labels.length === signals.length) {
      const grouped = groupByLabel(signals, labels);
      if (grouped.length >= MIN_CLUSTERS) {
        // CRITICAL: merge any single-paper clusters into the nearest
        // multi-paper cluster. The reduce phase requires ≥2 distinct paper
        // IDs per candidate (verifyCandidate enforces this); leaving
        // single-paper clusters in place causes them to be silently skipped,
        // halving the candidate count for some topics. Merging instead means
        // each surviving cluster has signal from ≥2 papers and reduce can
        // actually run.
        const merged = mergeSinglePaperClusters(grouped);
        logger.info('clusterSignals via HDBSCAN', {
          inputCount: signals.length,
          rawClusters: grouped.length,
          outputClusters: merged.length,
          mergedSinglePaper: grouped.length - merged.length,
          latencyMs: Date.now() - t0,
        });
        return trimClusters(merged);
      }
    }
  }

  // Fallback: bucket by kind
  const byKind = bucketByKind(signals);
  logger.info('clusterSignals via kind fallback', {
    inputCount: signals.length,
    outputClusters: byKind.length,
    latencyMs: Date.now() - t0,
  });
  return padClusters(byKind);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Try to run HDBSCAN under whichever API shape the installed version exposes.
 * Returns integer label array (same length as input) or null.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tryHdbscan(mod: any, vectors: number[][]): number[] | null {
  const opts = { minClusterSize: 2, minSamples: 1 };
  try {
    // Common shape: `Hdbscan` class with fit(X) → labels
    if (typeof mod?.Hdbscan === 'function') {
      const h = new mod.Hdbscan(opts);
      const res = h.fit(vectors);
      if (Array.isArray(res?.labels)) return res.labels as number[];
      if (Array.isArray(res)) return res as number[];
    }
    // Alt shape: lowercase class
    if (typeof mod?.HDBSCAN === 'function') {
      const h = new mod.HDBSCAN(opts);
      const res = h.fit(vectors);
      if (Array.isArray(res?.labels)) return res.labels as number[];
      if (Array.isArray(res)) return res as number[];
    }
    // Alt shape: functional export `hdbscan(X, opts)`
    if (typeof mod?.hdbscan === 'function') {
      const res = mod.hdbscan(vectors, opts);
      if (Array.isArray(res?.labels)) return res.labels as number[];
      if (Array.isArray(res)) return res as number[];
    }
    // Alt shape: default export
    if (typeof mod?.default === 'function') {
      const res = mod.default(vectors, opts);
      if (Array.isArray(res?.labels)) return res.labels as number[];
      if (Array.isArray(res)) return res as number[];
    }
  } catch (e) {
    logger.warn('hdbscan invocation failed; using fallback', {
      error: (e as Error).message,
    });
  }
  return null;
}

function groupByLabel(signals: GapSignal[], labels: number[]): GapSignal[][] {
  const byLabel = new Map<number, GapSignal[]>();
  const misc: GapSignal[] = [];
  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const lbl = labels[i];
    if (!sig) continue;
    if (lbl === undefined || lbl === -1) {
      misc.push(sig);
      continue;
    }
    const arr = byLabel.get(lbl) ?? [];
    arr.push(sig);
    byLabel.set(lbl, arr);
  }
  const clusters = Array.from(byLabel.values()).sort((a, b) => b.length - a.length);
  if (misc.length > 0) clusters.push(misc);
  return clusters.filter((c) => c.length > 0);
}

function bucketByKind(signals: GapSignal[]): GapSignal[][] {
  const buckets = new Map<string, GapSignal[]>();
  for (const s of signals) {
    const arr = buckets.get(s.kind) ?? [];
    arr.push(s);
    buckets.set(s.kind, arr);
  }
  return Array.from(buckets.values()).filter((a) => a.length > 0);
}

/**
 * Ensure we have at least `MIN_CLUSTERS` by splitting the largest bucket
 * in half until the count is reached. Never grows above `MAX_CLUSTERS`.
 */
function padClusters(input: GapSignal[][]): GapSignal[][] {
  let clusters = input.slice();
  while (clusters.length < MIN_CLUSTERS) {
    clusters.sort((a, b) => b.length - a.length);
    const biggest = clusters.shift();
    if (!biggest || biggest.length < 2) {
      if (biggest) clusters.unshift(biggest);
      break;
    }
    const mid = Math.floor(biggest.length / 2);
    clusters.push(biggest.slice(0, mid));
    clusters.push(biggest.slice(mid));
  }
  return trimClusters(clusters);
}

function trimClusters(clusters: GapSignal[][]): GapSignal[][] {
  if (clusters.length <= MAX_CLUSTERS) return clusters;
  // Sort by size descending; merge the tail into the smallest "misc"
  const sorted = clusters.slice().sort((a, b) => b.length - a.length);
  const kept = sorted.slice(0, MAX_CLUSTERS - 1);
  const tail = sorted.slice(MAX_CLUSTERS - 1).flat();
  if (tail.length > 0) kept.push(tail);
  return kept;
}

/**
 * Merge clusters that contain signals from only one paper into the nearest
 * multi-paper cluster. Cohere v3 embeddings cluster tightly enough that
 * signals from the same paper often end up in their own cluster, which the
 * reduce phase then silently skips because verifyCandidate requires ≥2 papers
 * of evidence per candidate. Without this merge, ~30-50% of clusters can be
 * wasted on real-world topics — the difference between a 9-gap and a 1-gap
 * final result on the same topic.
 *
 * Algorithm:
 *   1. Partition into multi-paper (≥2 distinct papers) and single-paper.
 *   2. For each single-paper cluster, append its signals to the smallest
 *      multi-paper cluster (gives every multi-paper cluster a chance to grow,
 *      keeps total cluster count stable).
 *   3. If there are NO multi-paper clusters at all (rare, very narrow topic),
 *      return the input unchanged so the reduce phase can still try the
 *      largest single-paper bucket — better than emitting nothing.
 */
function mergeSinglePaperClusters(clusters: GapSignal[][]): GapSignal[][] {
  const multi: GapSignal[][] = [];
  const single: GapSignal[][] = [];
  for (const c of clusters) {
    const distinctPapers = new Set(c.map((s) => s.paper_id)).size;
    (distinctPapers >= 2 ? multi : single).push(c);
  }
  if (multi.length === 0) return clusters;
  if (single.length === 0) return multi;
  // Append each single-paper bucket to whichever multi-paper cluster has the
  // fewest signals at the moment of merge — this keeps the surviving clusters
  // roughly balanced rather than dumping everything into the biggest.
  for (const orphan of single) {
    multi.sort((a, b) => a.length - b.length);
    multi[0]!.push(...orphan);
  }
  return multi;
}
