/**
 * REDUCE phase — synthesize candidate gaps from each signal cluster.
 *
 * For each cluster we call the synth-tier model with a strict JSON schema
 * and a system message flagged `cache: true` so the shared prefix reuses
 * Anthropic prompt caching across clusters.
 *
 * Post-processing is strict: every `evidence.quote` must be verbatim
 * (ellipsis-aware) against the text of the section at
 * `sectionsById.get(evidence.section_id)`. A candidate is dropped entirely
 * if ANY piece of its evidence fails verification.
 */
import { z } from 'zod';
import { isVerbatimWithEllipsis } from './verbatim.js';
import type {
  CandidateGap,
  FieldAdapter,
  GapCategory,
  GapSignal,
  RetrievedSection,
  StructuredFrameValue,
} from '@lacunose/types';
import { GAP_CATEGORIES } from '@lacunose/types';
import { llm, parallelMap } from '../llm/index.js';
import { log } from '../lib/logger.js';
import { reduceSystemPrompt, reduceUserPrompt } from './prompts/reduce.js';

const logger = log.child('gap:reduce');

const EvidenceSchema = z.object({
  paper_id: z.string().min(1),
  quote: z.string().min(1).max(2_000),
  section_id: z.string().min(1),
});

const CandidateSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().min(1).max(2_000),
  category: z.enum(GAP_CATEGORIES as unknown as [GapCategory, ...GapCategory[]]),
  novelty_score: z.number().min(1).max(10),
  feasibility_score: z.number().min(1).max(10),
  research_question: z.string().min(1).max(500),
  suggested_method: z.string().min(1).max(500),
  suggested_n: z.number().int().positive().optional(),
  suggested_duration_months: z.number().int().positive().optional(),
  evidence: z.array(EvidenceSchema).min(1).max(12),
});

const CandidatesSchema = z.array(CandidateSchema).max(8);

/**
 * Run the REDUCE phase over every cluster in parallel (concurrency 6).
 *
 * Returns validated + evidence-grounded `CandidateGap[]`. Candidates that
 * cannot be verified are silently dropped and logged.
 */
export async function reducePhase(
  clusters: GapSignal[][],
  sectionsById: Map<string, RetrievedSection>,
  field: FieldAdapter,
  topic: string,
  structuredFrame?: StructuredFrameValue,
): Promise<CandidateGap[]> {
  if (clusters.length === 0) {
    logger.info('reducePhase: empty input', { field: field.id });
    return [];
  }
  const t0 = Date.now();
  const system = reduceSystemPrompt(field);
  const allowedCats = new Set<GapCategory>(field.gapTaxonomy);

  const perCluster = await parallelMap(
    clusters,
    async (cluster, idx) => {
      if (cluster.length === 0) return [];
      const user = reduceUserPrompt({ topic, frame: structuredFrame, cluster, sectionsById });

      let raw: z.infer<typeof CandidatesSchema>;
      try {
        raw = await llm.chatJson({
          model: 'synth',
          messages: [
            { role: 'system', content: system, cache: true },
            { role: 'user', content: user },
          ],
          temperature: 0.3,
          maxTokens: 2_500,
          jsonSchema: { type: 'array' },
          schema: CandidatesSchema,
        });
      } catch (e) {
        logger.warn('reduce call failed', {
          clusterIdx: idx,
          clusterSize: cluster.length,
          error: (e as Error).message,
        });
        return [];
      }

      const clusterPaperIds = new Set(cluster.map((s) => s.paper_id));
      const clusterSectionIds = new Set(cluster.map((s) => s.section_id));

      const verified: CandidateGap[] = [];
      for (const cand of raw) {
        if (!verifyCandidate(cand, clusterPaperIds, clusterSectionIds, sectionsById)) {
          continue;
        }
        // Clamp category to the field's taxonomy (fallback to future-work if model picked one we don't use)
        const category: GapCategory = allowedCats.has(cand.category)
          ? cand.category
          : (field.gapTaxonomy[0] ?? 'future-work');

        verified.push({
          title: cand.title.slice(0, 90),
          description: cand.description,
          category,
          novelty_score: clamp(cand.novelty_score, 1, 10),
          feasibility_score: clamp(cand.feasibility_score, 1, 10),
          research_question: cand.research_question,
          suggested_method: cand.suggested_method,
          ...(cand.suggested_n !== undefined ? { suggested_n: cand.suggested_n } : {}),
          ...(cand.suggested_duration_months !== undefined
              ? { suggested_duration_months: cand.suggested_duration_months }
              : {}),
          evidence: cand.evidence.map((e) => {
            const sec = sectionsById.get(e.section_id);
            return {
              paper_id: e.paper_id,
              quote: e.quote,
              section_id: e.section_id,
              ...(sec?.section_kind ? { section_kind: sec.section_kind } : {}),
            };
          }),
        });
      }
      return verified;
    },
    { concurrency: 6 },
  );

  const flat = perCluster.flat();
  logger.info('reducePhase done', {
    field: field.id,
    clusters: clusters.length,
    candidates: flat.length,
    latencyMs: Date.now() - t0,
  });
  return flat;
}

function verifyCandidate(
  cand: z.infer<typeof CandidateSchema>,
  clusterPaperIds: Set<string>,
  clusterSectionIds: Set<string>,
  sectionsById: Map<string, RetrievedSection>,
): boolean {
  // At least 2 DISTINCT paper_ids
  const distinct = new Set(cand.evidence.map((e) => e.paper_id));
  if (distinct.size < 2) return false;

  for (const ev of cand.evidence) {
    if (!clusterPaperIds.has(ev.paper_id)) return false;
    if (!clusterSectionIds.has(ev.section_id)) return false;
    const sec = sectionsById.get(ev.section_id);
    if (!sec) return false;
    if (!isVerbatimWithEllipsis(ev.quote, sec.text)) return false;
  }
  return true;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
