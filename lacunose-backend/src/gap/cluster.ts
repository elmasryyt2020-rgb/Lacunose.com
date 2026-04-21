/**
 * CLUSTER phase — group gap signals into coherent clusters.
 *
 * Strategy:
 *   1. Embed each signal's `phrase` via the shared hash-embed helper.
 *   2. Run HDBSCAN (`hdbscan-ts`) with `minClusterSize: 2, minSamples: 1`.
 *   3. If HDBSCAN returns fewer than 4 clusters OR every point is noise,
 *      fall back to bucketing by signal `kind` (future-work / limitation /
 *      contradiction-cue / methodology-hint).
 *   4. Always emit 4-8 clusters. Noise / singletons are folded into a single
 *      "misc" cluster when that keeps us in [4, 8].
 *
 * HDBSCAN labels: integer cluster IDs (0..k-1), or -1 for noise.
 */
import type { GapSignal } from '@lacunose/types';
import { log } from '../lib/logger.js';
import { hashEmbed } from '../enrich/hashEmbed.js';

const logger = log.child('gap:cluster');

const MIN_CLUSTERS = 4;
const MAX_CLUSTERS = 8;

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

  // Embed phrases once
  const vectors = signals.map((s) => hashEmbed(s.phrase));

  const hdb = await loadHdbscan();
  if (hdb) {
    const labels = tryHdbscan(hdb, vectors);
    if (labels && labels.length === signals.length) {
      const grouped = groupByLabel(signals, labels);
      if (grouped.length >= MIN_CLUSTERS) {
        logger.info('clusterSignals via HDBSCAN', {
          inputCount: signals.length,
          outputClusters: grouped.length,
          latencyMs: Date.now() - t0,
        });
        return trimClusters(grouped);
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
