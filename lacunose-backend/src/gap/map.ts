/**
 * MAP phase — extract per-section gap signals.
 *
 * For each retrieved section we ask the map-tier model for up to 3
 * `GapSignal`s. The system message is flagged `cache: true` so Anthropic
 * prompt caching shortcircuits the shared prefix across the ~30 calls that
 * make up one analysis.
 *
 * Post-processing is strict: every returned signal's `quote` must be a
 * verbatim substring of the section it came from, else we drop it.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type {
  FieldAdapter,
  GapSignal,
  RetrievedSection,
  StructuredFrameValue,
} from '@lacunose/types';
import { llm, parallelMap } from '../llm/index.js';
import type { ScopedLLM } from '../llm/scopedLLM.js';
import { log } from '../lib/logger.js';
import { isVerbatimWithEllipsis } from './verbatim.js';
import { mapSystemPrompt, mapUserPrompt } from './prompts/map.js';

// Bumped when the prompt or schema changes — invalidates all cached map
// responses. Bump on every meaningful prompt change in prompts/map.ts.
const MAP_PROMPT_VERSION = 'v4-2026-04-aggressive-flash';
// 70 days — same input + temperature 0 = same output, so we can cache long.
const MAP_CACHE_TTL_SEC = 60 * 60 * 24 * 70;

// A tiny subset of the llm surface the gap phases actually use. The global
// `llm` export and any `ScopedLLM` both satisfy this shape, so phases can be
// invoked with either — unit pipeline paths pass the default, /v1/compare
// passes a Haiku-pinned scoped instance.
type PhaseLLM = Pick<typeof llm, 'chatJson'> | ScopedLLM;

const logger = log.child('gap:map');

const SignalSchema = z.object({
  kind: z.enum(['future-work', 'limitation', 'contradiction-cue', 'methodology-hint']),
  phrase: z.string().min(1).max(280),
  quote: z.string().min(1).max(2_000),
});
// Prompt asks for 0-8; tolerate one extra so a slight overshoot doesn't void
// the whole section's signals.
// Wrapped in an object so DeepSeek can use response_format: { type: 'json_object' }.
const SignalsSchema = z.object({
  signals: z.array(SignalSchema).max(9),
});

/**
 * Run the MAP phase over `sections`. Returns the union of all validated
 * signals across sections, with `paper_id` / `section_id` back-filled from
 * each source section.
 *
 * Concurrency: 12. Respects `signal` (AbortSignal) on every call.
 */
export async function mapPhase(
  sections: RetrievedSection[],
  field: FieldAdapter,
  topic: string,
  structuredFrame?: StructuredFrameValue,
  signal?: AbortSignal,
  llmOverride?: PhaseLLM,
): Promise<GapSignal[]> {
  // Default to the global llm singleton. Compare path passes a Haiku-pinned
  // ScopedLLM so the same pipeline runs on a different model without
  // touching env.LLM_PROVIDER.
  const llmInstance: PhaseLLM = llmOverride ?? llm;
  if (sections.length === 0) {
    logger.info('mapPhase: empty input', { field: field.id });
    return [];
  }
  const t0 = Date.now();

  const system = mapSystemPrompt(field);

  const perSection = await parallelMap(
    sections,
    async (section) => {
      if (signal?.aborted) return [];
      const user = mapUserPrompt(section, topic, structuredFrame);
      const extracted: GapSignal[] = [];
      // Cache key: deterministic hash of every input that affects the answer.
      // With temperature 0 and the same prompt version, identical inputs MUST
      // produce identical outputs — safe to reuse for 10 weeks. Includes
      // section text (not just id) so a re-ingested section with different
      // text gets a fresh entry.
      const cacheKey = `gap:map:${MAP_PROMPT_VERSION}:${
        createHash('sha256')
          .update(field.id)
          .update('|')
          .update(topic)
          .update('|')
          .update(JSON.stringify(structuredFrame ?? {}))
          .update('|')
          .update(section.section_id)
          .update('|')
          .update(section.text)
          .digest('hex')
      }`;
      try {
        const raw = await llmInstance.chatJson({
          model: 'map',
          messages: [
            { role: 'system', content: system, cache: true },
            { role: 'user', content: user },
          ],
          temperature: 0,
          maxTokens: 6000,
          jsonSchema: { type: 'object' },
          schema: SignalsSchema,
          cache: { key: cacheKey, ttlSec: MAP_CACHE_TTL_SEC },
          ...(signal ? { signal } : {}),
        });

        for (const s of raw.signals) {
          // VERBATIM guardrail: the quote must appear in the section text.
          if (!isVerbatimWithEllipsis(s.quote, section.text)) {
            continue;
          }
          extracted.push({
            paper_id: section.paper_id,
            section_id: section.section_id,
            kind: s.kind,
            phrase: s.phrase.slice(0, 140),
            quote: s.quote,
          });
        }
      } catch (e) {
        logger.warn('map extraction failed for section', {
          paperId: section.paper_id,
          sectionId: section.section_id,
          error: (e as Error).message,
        });
      }
      return extracted;
    },
    { concurrency: 12 },
  );

  const flat: GapSignal[] = perSection.flat();
  logger.info('mapPhase done', {
    field: field.id,
    inputCount: sections.length,
    outputCount: flat.length,
    latencyMs: Date.now() - t0,
  });
  return flat;
}

// Verbatim guardrail lives in ../verbatim.ts so map and reduce share it
// (and share the same NFKC + smart-quote + whitespace normalizations).
