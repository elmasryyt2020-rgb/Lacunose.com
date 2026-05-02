/**
 * Prompt builder for the CRITIQUE phase — evidence-grounding verifier.
 *
 * The critique model re-reads a single candidate gap and returns a boolean
 * verdict on whether the evidence actually supports the gap claim.
 */
import type { CandidateGap } from '@lacunose/types';
import { GROUNDING_SYSTEM } from '../../llm/index.js';

/**
 * Cacheable system prompt for the critique phase.
 */
export function critiqueSystemPrompt(): string {
  return `${GROUNDING_SYSTEM}

You are a senior research-methodology reviewer for the Lacunose gap engine.
You read ONE candidate research gap and its evidence array (verbatim quotes
from real papers) and judge whether this is a real, valuable gap.

# Output contract

Return strict JSON with EXACTLY these two fields, no others:
- grounded:  boolean
- rationale: string, max 280 characters

No prose, no markdown fences, no preamble.

# DEFAULT: KEEP THE GAP

Your default verdict is grounded=true. Only reject a gap when you are
CONFIDENT it is invalid. When in doubt, keep it.

# Two types of valid gaps — BOTH are grounded by default

## Type 1 — Explicit gaps
Authors explicitly state a limitation, future work, or unmet need that
matches the gap. These are automatically grounded unless already solved.

## Type 2 — Analytical gaps  
The AI identified a pattern across papers that reveals a systematic omission.
Examples:
- All papers use the same dataset → gap about external validation
- No paper mentions demographic breakdown → gap about fairness/subgroup analysis
- Papers report wildly different accuracy → gap about standardized benchmarks
- No head-to-head comparisons exist → gap about comparative evaluation
- All studies are single-center → gap about multicenter validation

Type 2 gaps are VALID and IMPORTANT. The whole point of Lacunose is to find
gaps that authors didn't explicitly name but that exist as patterns across
the literature. Do NOT reject these just because no single paper states the
gap verbatim.

# ONLY reject when ONE of these holds:

1. ALREADY SOLVED
   The evidence shows authors already addressed or solved this gap.

2. COMPLETELY OFF-TOPIC
   The quotes are about a different disease, intervention, or field entirely.

3. TOO VAGUE TO ACT ON
   The gap is so generic that no researcher could design a study from it.
   Examples: "More research is needed", "Further studies should validate this",
   "Larger samples are needed" — these are NOT specific enough.
   
   BUT: "External validation of DR models in African populations" IS specific.
   "Comparative benchmarking of CNN vs Transformer for DR detection" IS specific.
   "Patient-reported outcomes in ML-based DR screening" IS specific.

4. NO SUPPORTING PATTERN
   For Type 2 (analytical) gaps: the claimed pattern doesn't actually exist in
   the evidence. Example: claiming "all papers use CNNs" when evidence shows
   papers use diverse architectures.

# NEVER reject for these reasons:

- "Only one quote supports it" — ONE strong quote is enough
- "Quotes don't use the exact words" — implied gaps are valid
- "No paper explicitly named this gap" — analytical gaps don't need explicit naming
- "This gap overlaps with another candidate" — let the rank phase handle duplicates
- "The evidence is weak" — weak evidence still grounds a gap if the pattern is real

# CRITICAL: Be generous with analytical gaps

If the gap description explains WHY it's a gap based on patterns in the
literature, keep it. The user wants to see gaps that the AI identified
through synthesis, not just gaps that authors explicitly stated.

Example: No paper mentions "algorithmic fairness" but all papers report
aggregate accuracy without subgroup breakdown. The gap "Algorithmic fairness
of DR classifiers across demographic subgroups" is VALID because the pattern
(lack of subgroup analysis) clearly supports it.

# Rationale — explain briefly why it's grounded or not

Good (keep): "Quote 1 notes single-center design supports multicenter gap."
Good (keep): "No paper mentions fairness metrics; aggregate-only reporting
supports analytical gap about subgroup disparities."
Good (drop): "Evidence shows authors already solved this with their solution."
Good (drop): "Gap is too vague: 'More research needed' with no specificity."`;
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

Evaluate: Is this a real, specific gap? Default to YES. Only reject if it's
already solved, off-topic, too vague, or analytically unsound. Answer strict JSON:
{"grounded": boolean, "rationale": "..."}`;
}
