/**
 * Deterministic hash-based sentence embedding — PLACEHOLDER ONLY.
 *
 * This module exists because we need *some* 768-dim float vector for every
 * paper section in order for the retrieval + clustering code paths to run
 * end-to-end. It is NOT a quality embedding:
 *
 *   - It uses 24 parallel SHA-256 hashes over word-level n-grams and folds
 *     them into a 768-float vector in the range [-1, 1].
 *   - Semantic similarity is approximated by lexical overlap only; paraphrases
 *     will not cluster.
 *   - It is fully deterministic: embedding the same string twice yields the
 *     same vector, which is what the pipeline actually requires to be correct.
 *
 * REPLACE ME IN v1.1: either SPECTER2 via onnxruntime-node on the VPS, or a
 * hosted inference endpoint. The public signature (`hashEmbed(text): number[]`)
 * matches what the v1.1 replacement should expose so swap-out is one import.
 */
import { createHash } from 'node:crypto';

const DIM = 768;
const N_HASHES = 24;                 // 24 x 32 bytes = 768 floats
const BYTES_PER_HASH = 32;

/**
 * Deterministic 768-dim vector for `text`. Unit-normalized (L2 = 1).
 *
 * Fold strategy: lowercase + strip punctuation, form word-level bigrams and
 * trigrams, hash each with SHA-256 under 24 distinct salts, and scatter the
 * resulting bytes into fixed positions. Finally, L2-normalize.
 */
export function hashEmbed(text: string): number[] {
  const tokens = tokenize(text);
  // Deduplicate ngrams so "the the the" doesn't dominate.
  const ngrams = Array.from(new Set(buildNgrams(tokens, [1, 2, 3])));
  // Sorted so embed("foo bar") === embed("bar foo") — order invariance is
  // required for clustering to work even at lexical-overlap fidelity.
  ngrams.sort();

  const accum = new Float64Array(DIM);

  // Bag-of-ngrams: each ngram independently contributes to the accumulator
  // under all 24 salts. Additive (order-free) + idf-ish log damping so a
  // single dominant ngram doesn't obliterate the rest.
  const weight = 1 / Math.log2(2 + ngrams.length);
  for (const g of ngrams) {
    for (let s = 0; s < N_HASHES; s++) {
      const digest = createHash('sha256')
        .update(`lacunose-hashEmbed-salt-${s}`)
        .update('\x1f')
        .update(g)
        .digest();
      const base = s * BYTES_PER_HASH;
      for (let b = 0; b < BYTES_PER_HASH; b++) {
        const byte = digest[b] ?? 0;
        // Map byte to roughly [-1, 1] and scale by per-ngram weight.
        accum[base + b] = (accum[base + b] ?? 0) + ((byte - 127.5) / 127.5) * weight;
      }
    }
  }

  // L2-normalize so cosine similarity behaves sensibly.
  let norm = 0;
  for (let i = 0; i < DIM; i++) {
    const v = accum[i] ?? 0;
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  const out = new Array<number>(DIM);
  for (let i = 0; i < DIM; i++) {
    out[i] = (accum[i] ?? 0) / norm;
  }
  return out;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function buildNgrams(tokens: string[], sizes: number[]): string[] {
  const out: string[] = [];
  for (const n of sizes) {
    for (let i = 0; i + n <= tokens.length; i++) {
      out.push(tokens.slice(i, i + n).join(' '));
    }
  }
  return out;
}

/**
 * Cosine similarity between two equal-length vectors.
 * Exposed so rank-dedupe can reuse it without re-normalizing.
 */
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
