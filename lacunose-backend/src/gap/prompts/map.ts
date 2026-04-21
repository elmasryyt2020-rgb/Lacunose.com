/**
 * Prompt builders for the MAP phase — per-section gap-signal extraction.
 *
 * The system message is intentionally identical across all map calls in one
 * analysis so that Anthropic prompt caching kicks in (`cache: true`). The
 * user message is the variable part: topic + frame + paper meta + section text.
 */
import type { FieldAdapter, RetrievedSection, StructuredFrameValue } from '@lacunose/types';
import { GROUNDING_SYSTEM } from '../../llm/index.js';

/**
 * Build the cacheable system prompt for a given field adapter.
 */
export function mapSystemPrompt(field: FieldAdapter): string {
  return `You extract research-gap signals from a single section of a paper.

${field.promptHints.system}

${GROUNDING_SYSTEM}

For the given section text, return a JSON array of 0-3 gap signals. Each signal has:
- kind: 'future-work' | 'limitation' | 'contradiction-cue' | 'methodology-hint'
- phrase: short extracted phrase describing the gap (max 140 chars)
- quote: the verbatim substring of the section that supports the signal (max 400 chars; use "..." for elision)

Return [] if the section contains no gap signals. Return strict JSON only — no markdown fences, no prose.`;
}

/**
 * Build the per-section user prompt for one map call.
 */
export function mapUserPrompt(
  section: RetrievedSection,
  topic: string,
  frame?: StructuredFrameValue,
): string {
  const frameStr = frame && Object.keys(frame).length > 0
    ? JSON.stringify(frame)
    : '{}';
  const venue = section.paper_venue ? section.paper_venue : 'unknown venue';
  const year = section.paper_year ?? 'unknown year';
  const paperLine = `${section.paper_title} (${year}, ${venue})`;
  return `Topic: ${topic}
Structured frame: ${frameStr}
Paper: ${paperLine}
Section (${section.section_kind}):
${section.text}

Return JSON array only.`;
}
