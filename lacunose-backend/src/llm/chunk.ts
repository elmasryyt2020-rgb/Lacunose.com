/**
 * Token-budget chunker.
 *
 * We use a char-based approximation (4 chars ≈ 1 token for English) — this is
 * a safety valve, not a billing oracle. The pipeline rule is "never send
 * >100_000 tokens to one LLM call"; this module enforces that cheaply without
 * pulling in a tokenizer dependency.
 */
import type { LLMMessage } from '@lacunose/types';

/** Rough token estimate for a string. 4 chars ≈ 1 English token. */
export function estimateTokens(s: string): number {
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}

/**
 * Sum of estimated tokens across all message contents + any tool-call JSON.
 * Ignores message role overhead since it's tiny compared to content.
 */
function totalMessageTokens(messages: LLMMessage[]): number {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(m.content);
    if (m.tool_calls) {
      for (const tc of m.tool_calls) {
        total += estimateTokens(JSON.stringify(tc.input));
      }
    }
  }
  return total;
}

/**
 * Returns true if the total message payload exceeds `maxTokens`. Use this to
 * guard a single LLM call — split upstream if it does.
 */
export function exceedsBudget(messages: LLMMessage[], maxTokens: number): boolean {
  return totalMessageTokens(messages) > maxTokens;
}

/**
 * Splits a long array of items into chunks where each chunk's total estimated
 * tokens (via `getText`) is ≤ `budget`. An individual item larger than
 * `budget` is placed in its own chunk — we never drop data, but callers
 * should upstream-truncate oversized single items before calling this.
 */
export function chunkItems<T>(
  items: T[],
  getText: (t: T) => string,
  budget: number,
): T[][] {
  if (budget <= 0) throw new Error('chunkItems: budget must be > 0');
  const chunks: T[][] = [];
  let current: T[] = [];
  let currentTokens = 0;

  for (const item of items) {
    const itemTokens = estimateTokens(getText(item));
    // Oversized single item: flush current (if any) and give the big one its own chunk.
    if (itemTokens > budget) {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
        currentTokens = 0;
      }
      chunks.push([item]);
      continue;
    }
    // Normal case: if adding this would blow the budget, start a new chunk.
    if (currentTokens + itemTokens > budget && current.length > 0) {
      chunks.push(current);
      current = [];
      currentTokens = 0;
    }
    current.push(item);
    currentTokens += itemTokens;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
