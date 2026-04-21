/**
 * RANK phase — score, dedupe, and trim candidates to the final top-10.
 *
 * Scoring:
 *   score = 0.5 * novelty + 0.3 * feasibility + 0.2 * evidence_density
 *   where evidence_density = min(evidence.length / 4, 1) * 10
 *
 * Dedupe:
 *   - Embed each title via the hash-embed helper.
 *   - For any pair with cosine(titleA, titleB) > 0.85, drop the one with the
 *     LOWER novelty_score (ties broken by lower feasibility, then by evidence
 *     count). Keep the other.
 *
 * Finally, sort by descending score and return the top-10.
 */
import type { CandidateGap } from '@lacunose/types';
import { log } from '../lib/logger.js';
import { cosine, hashEmbed } from '../enrich/hashEmbed.js';

const logger = log.child('gap:rank');

const SIM_THRESHOLD = 0.85;

interface Scored {
  index: number;
  candidate: CandidateGap;
  score: number;
  density: number;
  titleVec: number[];
  dropped: boolean;
}

/**
 * Score, dedupe, and truncate to the top-10.
 */
export function rankGaps(candidates: CandidateGap[]): CandidateGap[] {
  if (candidates.length === 0) return [];
  const t0 = Date.now();

  const scored: Scored[] = candidates.map((c, i) => {
    const density = Math.min(c.evidence.length / 4, 1) * 10;
    const score = 0.5 * c.novelty_score + 0.3 * c.feasibility_score + 0.2 * density;
    return {
      index: i,
      candidate: c,
      score,
      density,
      titleVec: hashEmbed(c.title),
      dropped: false,
    };
  });

  // Pairwise dedupe — n is small (<=32), O(n^2) is fine
  for (let i = 0; i < scored.length; i++) {
    const a = scored[i];
    if (!a || a.dropped) continue;
    for (let j = i + 1; j < scored.length; j++) {
      const b = scored[j];
      if (!b || b.dropped) continue;
      const sim = cosine(a.titleVec, b.titleVec);
      if (sim > SIM_THRESHOLD) {
        // Drop the lower-novelty item; tiebreak by feasibility, then evidence len
        const loser = preferWinner(a, b);
        loser.dropped = true;
      }
    }
  }

  const kept = scored
    .filter((s) => !s.dropped)
    .sort((x, y) => y.score - x.score)
    .slice(0, 10);

  const out: CandidateGap[] = kept.map((s) => ({
    ...s.candidate,
    // stash the density for downstream persistence; no schema-level impact
  }));

  logger.info('rankGaps done', {
    inputCount: candidates.length,
    outputCount: out.length,
    latencyMs: Date.now() - t0,
  });
  return out;
}

/**
 * Exposed so the pipeline can persist the computed density without
 * recomputing it.
 */
export function evidenceDensity(candidate: CandidateGap): number {
  return Math.min(candidate.evidence.length / 4, 1) * 10;
}

function preferWinner(a: Scored, b: Scored): Scored {
  // Return the one to DROP
  if (a.candidate.novelty_score !== b.candidate.novelty_score) {
    return a.candidate.novelty_score < b.candidate.novelty_score ? a : b;
  }
  if (a.candidate.feasibility_score !== b.candidate.feasibility_score) {
    return a.candidate.feasibility_score < b.candidate.feasibility_score ? a : b;
  }
  if (a.candidate.evidence.length !== b.candidate.evidence.length) {
    return a.candidate.evidence.length < b.candidate.evidence.length ? a : b;
  }
  // Final tiebreak: drop the later-indexed one for determinism
  return a.index > b.index ? a : b;
}
