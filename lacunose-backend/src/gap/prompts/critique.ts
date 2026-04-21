/**
 * Prompt builder for the CRITIQUE phase — evidence-grounding verifier.
 *
 * The critique model re-reads a single candidate gap and returns a boolean
 * verdict on whether every cited quote unambiguously supports the gap claim.
 */
import type { CandidateGap } from '@lacunose/types';
import { GROUNDING_SYSTEM } from '../../llm/index.js';

/**
 * Cacheable system prompt for the critique phase.
 */
export function critiqueSystemPrompt(): string {
  return `${GROUNDING_SYSTEM}

You are a grounding verifier for the Lacunose gap pipeline. You read a single candidate research gap and its evidence (a list of verbatim quotes from papers) and judge whether the evidence actually supports the claim.

Return strict JSON with exactly these fields:
- grounded: boolean — true if every quote unambiguously supports the described gap, false otherwise
- rationale: string (max 280 chars) — brief justification

Be strict. If any quote is tangential, out of context, or does not concretely point at the gap described, return grounded=false. Do not hedge. Do not return markdown.`;
}

/**
 * Build the per-candidate user prompt.
 */
export function critiqueUserPrompt(candidate: CandidateGap): string {
  const quotes = candidate.evidence.map((e, i) => {
    const src = e.paper_id.slice(0, 8);
    return `[${i + 1}] (paper ${src}) "${e.quote}"`;
  }).join('\n');
  return `Gap title: ${candidate.title}
Gap description: ${candidate.description}
Research question: ${candidate.research_question}

Evidence:
${quotes}

Is each quote unambiguously supporting the gap described? Answer strict JSON: {"grounded": boolean, "rationale": "..."}.`;
}
