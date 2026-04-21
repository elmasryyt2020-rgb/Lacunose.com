/**
 * Cost accounting helper.
 *
 * Converts a provider-normalized `ChatResponse.usage` to an estimated USD cost.
 * Rates are hard-coded per model (published list prices, USD per 1M tokens).
 *
 * Note: Anthropic's cache_read tokens are billed at a large discount (10%);
 * DeepSeek publishes cache-hit rates too but we treat cached input as the
 * same cheaper tier (they round to ~similar effective prices).
 */
import type { ChatResponse } from '@lacunose/types';

interface Rates {
  /** USD per 1M input tokens (non-cached). */
  input: number;
  /** USD per 1M output tokens. */
  output: number;
  /** USD per 1M cached-input tokens (cache read). */
  cachedInput: number;
}

const RATES: Record<string, Rates> = {
  'claude-opus-4-7':              { input: 15.0, output: 75.0, cachedInput: 1.5 },
  'claude-haiku-4-5-20251001':    { input: 1.0,  output: 5.0,  cachedInput: 0.1 },
  'deepseek-reasoner':            { input: 0.55, output: 2.19, cachedInput: 0.55 },
  'deepseek-chat':                { input: 0.27, output: 1.10, cachedInput: 0.27 },
  // mock tiers are free
  'mock-reasoner':                { input: 0.0,  output: 0.0,  cachedInput: 0.0 },
  'mock-chat':                    { input: 0.0,  output: 0.0,  cachedInput: 0.0 },
};

/**
 * Estimate USD cost for a single `ChatResponse` based on its reported usage.
 * Unknown models return `0` (we'd rather under-report than crash telemetry).
 */
export function estimateCostUsd(res: ChatResponse): number {
  const rate = RATES[res.model];
  if (!rate) return 0;
  const cachedIn = res.usage.cachedInputTokens ?? 0;
  // For Anthropic, `input_tokens` already excludes the cache-read portion; for
  // DeepSeek, `prompt_tokens` includes them. We normalize at the provider
  // layer so that `inputTokens` here represents "fresh, non-cached input".
  const freshIn = Math.max(0, res.usage.inputTokens);
  const out = res.usage.outputTokens;
  const costPerToken = (amount: number, perMillion: number) => (amount * perMillion) / 1_000_000;
  return (
    costPerToken(freshIn, rate.input) +
    costPerToken(cachedIn, rate.cachedInput) +
    costPerToken(out, rate.output)
  );
}
