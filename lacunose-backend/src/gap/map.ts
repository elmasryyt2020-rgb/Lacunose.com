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
import { z } from 'zod';
import type {
  FieldAdapter,
  GapSignal,
  RetrievedSection,
  StructuredFrameValue,
} from '@lacunose/types';
import { llm, parallelMap } from '../llm/index.js';
import { log } from '../lib/logger.js';
import { mapSystemPrompt, mapUserPrompt } from './prompts/map.js';

const logger = log.child('gap:map');

const SignalSchema = z.object({
  kind: z.enum(['future-work', 'limitation', 'contradiction-cue', 'methodology-hint']),
  phrase: z.string().min(1).max(280),
  quote: z.string().min(1).max(2_000),
});
const SignalsSchema = z.array(SignalSchema).max(6); // tolerate slight overshoot

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
): Promise<GapSignal[]> {
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
      try {
        const raw = await llm.chatJson({
          model: 'map',
          messages: [
            { role: 'system', content: system, cache: true },
            { role: 'user', content: user },
          ],
          temperature: 0.2,
          maxTokens: 800,
          jsonSchema: { type: 'array' },
          schema: SignalsSchema,
          ...(signal ? { signal } : {}),
        });

        for (const s of raw) {
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

/**
 * Verbatim check with tolerance for "..." elision.
 *
 * If the quote contains "..." (ASCII) or "…" (U+2026), split on it and
 * require every non-empty fragment to appear in `source` in order.
 */
function isVerbatimWithEllipsis(quote: string, source: string): boolean {
  if (!quote || !source) return false;
  const parts = quote.split(/\.{3}|…/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return false;
  let cursor = 0;
  for (const part of parts) {
    const idx = source.indexOf(part, cursor);
    if (idx === -1) return false;
    cursor = idx + part.length;
  }
  return true;
}
