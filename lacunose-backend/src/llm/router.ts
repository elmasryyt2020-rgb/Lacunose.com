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
 * | synth    | claude-opus-4-7            | claude-opus-4-7   | deepseek-reasoner | mock-reasoner |
 * | map      | claude-haiku-4-5-20251001  | claude-opus-4-7   | deepseek-chat     | mock-chat     |
 * | critique | claude-haiku-4-5-20251001  | claude-opus-4-7   | deepseek-chat     | mock-chat     |
 */
import type { ChatOptions, ChatResponse, LLMProviderId, ModelTier } from '@lacunose/types';
import { env } from '../lib/env.js';
import * as anthropic from './providers/anthropic.js';
import * as deepseek from './providers/deepseek.js';
import * as mock from './providers/mock.js';

const MODEL_MATRIX: Record<LLMProviderId, Record<ModelTier, string>> = {
  'anthropic': {
    synth:    'claude-opus-4-7',
    map:      'claude-haiku-4-5-20251001',
    critique: 'claude-haiku-4-5-20251001',
  },
  'anthropic-allopus': {
    synth:    'claude-opus-4-7',
    map:      'claude-opus-4-7',
    critique: 'claude-opus-4-7',
  },
  'deepseek': {
    synth:    'deepseek-reasoner',
    map:      'deepseek-chat',
    critique: 'deepseek-chat',
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
