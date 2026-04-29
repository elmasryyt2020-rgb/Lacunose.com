/**
 * Provider + model-tier router.
 *
 * Given `env.LLM_PROVIDER` and a semantic `ModelTier`, returns:
 *  - the concrete vendor model string for the call, and
 *  - a `chat` function that knows how to talk to that provider.
 *
 * Calling code never names a vendor model; this is the ONLY place that
 * mapping exists. Adding a new model or re-mapping a tier is a single edit
 * here.
 *
 * Tier matrix:
 *
 * | Tier     | anthropic                  | anthropic-allopus | deepseek          | mock          |
 * |----------|----------------------------|-------------------|-------------------|---------------|
 * | synth    | claude-opus-4-7            | claude-opus-4-7   | deepseek-v4-pro   | mock-reasoner |
 * | map      | claude-haiku-4-5-20251001  | claude-opus-4-7   | deepseek-v4-flash | mock-chat     |
 * | critique | claude-haiku-4-5-20251001  | claude-opus-4-7   | deepseek-v4-flash | mock-chat     |
 *
 * DeepSeek pricing (per 1M tokens, as of 2026-04):
 *   v4-pro    — input $0.435 (miss) / $0.003625 (hit), output $0.87. Promo
 *               75% discount until 2026-05-31. Thinking on by default.
 *   v4-flash  — input $0.14  (miss) / $0.0028   (hit), output $0.28.
 *   Both: 1M context, 384K max output, JSON output + tool calls supported.
 */
import type { ChatOptions, ChatResponse, LLMProviderId, ModelTier } from '@lacunose/types';
import { env } from '../lib/env.js';
import * as anthropic from './providers/anthropic.js';
import * as deepseek from './providers/deepseek.js';
import * as mock from './providers/mock.js';

// Anthropic model IDs come from env so ops can flip to a dated suffix
// (e.g. `claude-opus-4-7-20260310`) without a code change if the catalog
// advances mid-hackathon.
const OPUS = env.ANTHROPIC_OPUS_MODEL;
const HAIKU = env.ANTHROPIC_HAIKU_MODEL;

const MODEL_MATRIX: Record<LLMProviderId, Record<ModelTier, string>> = {
  'anthropic': {
    synth:    OPUS,
    map:      HAIKU,
    critique: HAIKU,
  },
  'anthropic-allopus': {
    synth:    OPUS,
    map:      OPUS,
    critique: OPUS,
  },
  'deepseek': {
    // V4 models — both support response_format json_object, tool calls, and 1M
    // context. Pro defaults to thinking-on; flash defaults to thinking-on but
    // for our map/critique workload (substring extraction + boolean verdict)
    // thinking buys nothing useful — we accept the slightly higher output token
    // count rather than guess at a thinking-disable param the SDK may not
    // expose. Flip to thinking-off via DeepSeek's `chat_template_kwargs` if
    // costs require it later.
    synth:    'deepseek-v4-pro',
    map:      'deepseek-v4-flash',
    critique: 'deepseek-v4-flash',
  },
  'mock': {
    synth:    'mock-reasoner',
    map:      'mock-chat',
    critique: 'mock-chat',
  },
};

export type ProviderChatFn = (opts: ChatOptions, concreteModel: string) => Promise<ChatResponse>;

/** Active provider id, derived from env at import time. */
export const activeProvider: LLMProviderId = env.LLM_PROVIDER;

/**
 * Resolve a semantic `ModelTier` to the concrete vendor model string for the
 * currently-active provider.
 */
export function resolveModel(tier: ModelTier): string {
  const byTier = MODEL_MATRIX[activeProvider];
  const concrete = byTier[tier];
  if (!concrete) {
    throw new Error(`router: no model mapping for provider=${activeProvider} tier=${tier}`);
  }
  return concrete;
}

/**
 * Return the `chat` function for the currently-active provider. The returned
 * function accepts `(opts, concreteModel)` — callers should pair it with
 * `resolveModel()`.
 */
export function providerChat(): ProviderChatFn {
  switch (activeProvider) {
    case 'anthropic':
    case 'anthropic-allopus':
      return anthropic.chat;
    case 'deepseek':
      return deepseek.chat;
    case 'mock':
      return mock.chat;
    default: {
      const exhaustive: never = activeProvider;
      throw new Error(`router: unknown provider ${String(exhaustive)}`);
    }
  }
}
