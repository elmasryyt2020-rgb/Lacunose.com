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

You are a grounding verifier for the Lacunose gap pipeline. You read ONE
candidate research gap (title, description, research question) and its
evidence array (verbatim quotes from real papers) and judge whether the
evidence actually supports the gap.

# Output contract

Return strict JSON with EXACTLY these two fields, no others:
- grounded:  boolean
- rationale: string, max 280 characters

No prose, no markdown fences, no preamble.

# Verdict rules — apply mechanically, not impressionistically

Return grounded=true ONLY when ALL of the following hold:
  1. At least 2 of the quotes EACH name (or strongly imply) the same gap
     described in the candidate's title/description.
  2. Every quote is on-topic for the gap (it is about the same population /
     intervention / outcome / methodology, not a distant cousin).
  3. The gap is not contradicted by any quote.

Return grounded=false when ANY of the following hold:
  a. Only one quote actually supports the gap and the rest are tangential
     (e.g. they describe related work but not the gap itself).
  b. A quote describes the SOLUTION (something already done) rather than an
     unmet need — UNLESS the gap is about extending/replicating that solution
     and the description says so explicitly.
  c. The quotes describe a different gap than the title claims.
  d. The candidate's research_question cannot be answered using the kind of
     study the quotes' findings imply is feasible.

Be strict but not pedantic. A gap whose evidence is "imperfect but clearly
pointing at the same hole" is grounded. A gap whose evidence is "two unrelated
quotes that mention the same disease" is not.

# Rationale — describe the WHY, not the verdict

Bad rationale: "The evidence supports the gap." (vacuous)
Good rationale: "Both quotes from Smith 2024 and Lee 2025 explicitly note that
no trial has tested intervention X in patients over 80 — direct match to the
gap." (cites why)

Bad rationale: "Not grounded enough."
Good rationale: "Quote 1 is about adverse events, not about the long-term
efficacy gap the title claims; quote 3 doesn't mention the population at all."`;
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
