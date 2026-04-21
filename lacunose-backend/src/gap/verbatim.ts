/**
 * Verbatim-quote verification for the grounding guardrail.
 *
 * The LLM is told to quote the source paper exactly, but models routinely:
 *   • emit curly quotes ("…") when the source has straight ("…"),
 *   • collapse multiple whitespace chars into one space,
 *   • strip or add trailing punctuation,
 *   • hyphenate line-breaks (PDF artifacts the other way round).
 *
 * A raw `source.indexOf(quote)` check therefore drops 30–60% of otherwise
 * correct quotes — the single most impactful silent-quality bug in the
 * pipeline. This helper normalizes both sides with NFKC + Unicode quote
 * folding + whitespace collapsing before substring check, then splits on
 * ellipsis so the model can elide internal spans with "…" / "...".
 */

/**
 * Apply all normalizations we're willing to tolerate:
 *   1. NFKC so visually-identical codepoints (e.g. ligatures, fullwidth) fold.
 *   2. Fold curly/smart quotes → straight.
 *   3. Fold unicode dashes → ASCII hyphen.
 *   4. Collapse all whitespace runs (incl. newlines, non-breaking space) → single space.
 *   5. Lowercase to eliminate case-only mismatches.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    // Smart quotes → straight
    .replace(/[‘’‚‛‹›]/g, "'")
    .replace(/[“”„‟«»]/g, '"')
    // Various dashes → '-'
    .replace(/[‐-―−]/g, '-')
    // Soft hyphen (used in PDFs for line-break hyphenation) → drop
    .replace(/­/g, '')
    // Zero-width + non-breaking spaces → regular space
    .replace(/[ ​‌‍﻿]/g, ' ')
    // Collapse all whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const ELLIPSIS_SPLIT = /\s*(?:\.{3,}|…)\s*/;

/**
 * Returns true if `quote` is verbatim-contained in `source`, after
 * normalization and splitting on ellipses.
 */
export function isVerbatimWithEllipsis(quote: string, source: string): boolean {
  if (!quote || !source) return false;
  const normQuote = normalize(quote);
  const normSource = normalize(source);
  if (normQuote.length < 3) return false;

  // Fast path: whole quote appears as one substring.
  if (normSource.includes(normQuote)) return true;

  // Slow path: split on "..." / "…" and require each part to appear in order.
  const parts = normQuote.split(ELLIPSIS_SPLIT).filter((p) => p.length >= 3);
  if (parts.length < 2) return false; // single-part already failed
  let cursor = 0;
  for (const part of parts) {
    const at = normSource.indexOf(part, cursor);
    if (at === -1) return false;
    cursor = at + part.length;
  }
  return true;
}
