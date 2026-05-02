/**
 * Public API for the LLM abstraction layer.
 *
 * Calling code imports ONLY this module:
 *
 *   import { llm } from '../llm/index.js';
 *   const res = await llm.chat({ model: 'map', messages: [...] });
 *
 * The active provider is controlled by `env.LLM_PROVIDER`; the caller never
 * sees vendor model names.
 */
import { z } from 'zod';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { ChatOptions, ChatResponse, LLMProviderId } from '@lacunose/types';
import { activeProvider, providerChat, resolveModel } from './router.js';
import { getCached, setCached } from './cache.js';
import { estimateCostUsd } from './usage.js';
import { record as recordUsage } from './accumulator.js';
import { log } from '../lib/logger.js';

const clog = log.child('llm');

/**
 * Usage-tracking context — the gap pipeline wraps its run in
 * `withUsageTracking(analysisId, async () => { … })` so every LLM call
 * underneath automatically rolls into the totals for that analysis.
 */
const usageCtx = new AsyncLocalStorage<{ analysisId: string }>();
export function withUsageTracking<T>(analysisId: string, fn: () => Promise<T>): Promise<T> {
  return usageCtx.run({ analysisId }, fn);
}

/**
 * Dispatch a chat call to the active provider.
 *
 * Flow:
 *  1. If `opts.cache` is set, look up the cache. On hit, return immediately.
 *  2. Resolve the semantic tier to a concrete vendor model.
 *  3. Call the provider's `chat` function.
 *  4. Record usage + latency + estimated cost.
 *  5. Write the response back to the cache (if applicable).
 */
async function chat(opts: ChatOptions): Promise<ChatResponse> {
  if (opts.cache) {
    const hit = await getCached(opts.cache.key);
    if (hit) {
      clog.info('cache hit', {
        key: opts.cache.key,
        provider: hit.provider,
        model: hit.model,
        tier: opts.model,
      });
      return hit;
    }
  }

  const concreteModel = resolveModel(opts.model);
  const providerFn = providerChat();
  const started = Date.now();

  let res: ChatResponse;
  try {
    res = await providerFn(opts, concreteModel);
  } catch (e) {
    clog.error('provider call failed', {
      provider: activeProvider,
      tier: opts.model,
      model: concreteModel,
      latencyMs: Date.now() - started,
      error: (e as Error).message,
    });
    throw e;
  }

  const costUsd = estimateCostUsd(res);
  clog.info('chat ok', {
    provider: res.provider,
    tier: opts.model,
    model: res.model,
    latencyMs: res.latencyMs,
    inputTokens: res.usage.inputTokens,
    outputTokens: res.usage.outputTokens,
    cachedInputTokens: res.usage.cachedInputTokens ?? 0,
    costUsd: Number(costUsd.toFixed(6)),
    cached: false,
  });

  // Roll into the current analysis' usage accumulator, if any.
  const ctx = usageCtx.getStore();
  if (ctx) {
    try { recordUsage(ctx.analysisId, res); } catch { /* never let telemetry break a pipeline */ }
  }

  if (opts.cache) {
    // Fire-and-forget — cache write failures must not block the caller.
    void setCached(opts.cache.key, res, opts.cache.ttlSec);
  }
  return res;
}

/**
 * Helper for structured JSON extraction with Zod schema validation.
 *
 * Runs `chat()` with `jsonSchema` set (which each provider implements in the
 * way that vendor supports best), then parses + validates the content with
 * the supplied Zod schema. Throws a descriptive error on parse or shape
 * failure — the caller can decide whether to retry or surface the error.
 */
async function chatJson<T>(opts: ChatOptions & { schema: z.ZodType<T> }): Promise<T> {
  const { schema, ...rest } = opts;
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await chat(rest);
    // Haiku 4.5 routinely wraps JSON in ```json ... ``` markdown fences despite
    // the no-fences instruction in the system prompt. Under LLM_PROVIDER=anthropic
    // (Haiku on MAP+CRITIQUE), this caused 100% of MAP responses to fail JSON.parse,
    // short-circuiting the pipeline to "insufficient-signal" with 0 final gaps.
    // The fence-stripping mirrors what scopedLLM.ts already does for the SSE path.
    const stripped = res.content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        clog.warn('chatJson JSON parse failed, retrying', { model: res.model, attempt: attempt + 1 });
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw new Error(
        `llm.chatJson: response was not valid JSON (model=${res.model}): ${(e as Error).message}. ` +
        `Raw content (first 200 chars): ${res.content.slice(0, 200)}`,
      );
    }
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      if (attempt < MAX_RETRIES) {
        clog.warn('chatJson schema validation failed, retrying', { model: res.model, attempt: attempt + 1 });
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw new Error(
        `llm.chatJson: JSON did not match schema (model=${res.model}): ` +
        JSON.stringify(validated.error.flatten()),
      );
    }
    return validated.data;
  }
  // Unreachable — every path above either returns or throws.
  throw new Error('llm.chatJson: exhausted retries');
}

/**
 * The single exported surface for the rest of the codebase. Importing this
 * object is sufficient to perform any LLM call in the system.
 */
export const llm: {
  chat: (opts: ChatOptions) => Promise<ChatResponse>;
  chatJson: <T>(opts: ChatOptions & { schema: z.ZodType<T> }) => Promise<T>;
  provider: LLMProviderId;
} = {
  chat,
  chatJson,
  provider: activeProvider,
};

// Re-export a few internals that the gap-engine code imports directly.
export { estimateTokens, exceedsBudget, chunkItems } from './chunk.js';
export { parallelMap } from './parallel.js';
export { estimateCostUsd } from './usage.js';
export { GROUNDING_SYSTEM } from './prompts/system-grounding.js';
