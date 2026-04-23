/**
 * Scoped LLM factory — lets one process run the gap pipeline with explicit
 * per-tier models, bypassing the env-fixed `activeProvider` in router.ts.
 *
 * The global `llm` singleton in ./index.ts resolves models via
 * `env.LLM_PROVIDER`, which is read once at import time. That's fine for the
 * normal path (every analysis runs with the same provider), but the /v1/compare
 * endpoint needs to run the pipeline twice in the same process — once with
 * Opus at every tier, once with Haiku at every tier. We can't mutate
 * `activeProvider` at runtime, so instead we build a mini llm-shaped object
 * that calls providers/anthropic.ts directly with caller-supplied model strings.
 *
 * Usage:
 *   const haikuLLM = createScopedLLM({
 *     mapModel:      'claude-haiku-4-5-20251001',
 *     synthModel:    'claude-haiku-4-5-20251001',
 *     critiqueModel: 'claude-haiku-4-5-20251001',
 *   });
 *   await mapPhase(sections, adapter, topic, undefined, signal, haikuLLM);
 *
 * The returned object exposes the same `.chat()` + `.chatJson()` surface the
 * gap phases already use, plus `.usage()` to collect token + cost totals for
 * the compare response.
 */
import { z } from 'zod';
import type { ChatOptions, ChatResponse } from '@lacunose/types';
import { chat as anthropicChat } from './providers/anthropic.js';
import { estimateCostUsd } from './usage.js';
import { log } from '../lib/logger.js';

const clog = log.child('llm:scoped');

export interface ModelOverrideSpec {
  /** Concrete vendor model for map-tier calls (high-volume, per-section). */
  mapModel: string;
  /** Concrete vendor model for synth-tier calls (reduce, high-quality). */
  synthModel: string;
  /** Concrete vendor model for critique-tier calls. */
  critiqueModel: string;
  /** Optional label for log lines (e.g. "haiku-all" or "opus-all"). */
  label?: string;
}

export interface UsageSnapshot {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  costUsd: number;
  calls: number;
  models: string[];
}

/**
 * Shape the gap phases need from `llm`. Kept minimal so that callers can type
 * their phase wrappers against a narrow interface without pulling in the full
 * global llm object.
 */
export interface ScopedLLM {
  chat: (opts: ChatOptions) => Promise<ChatResponse>;
  chatJson: <T>(opts: ChatOptions & { schema: z.ZodType<T> }) => Promise<T>;
  /** Return a copy of the accumulated usage. */
  usage: () => UsageSnapshot;
}

/**
 * Build a scoped LLM instance. Each call through `chat` / `chatJson`
 * contributes to a private accumulator accessible via `.usage()`.
 */
export function createScopedLLM(spec: ModelOverrideSpec): ScopedLLM {
  const acc: UsageSnapshot = {
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    costUsd: 0,
    calls: 0,
    models: [],
  };

  function resolveModel(tier: ChatOptions['model']): string {
    switch (tier) {
      case 'map':      return spec.mapModel;
      case 'synth':    return spec.synthModel;
      case 'critique': return spec.critiqueModel;
      default:         return spec.synthModel;
    }
  }

  async function chat(opts: ChatOptions): Promise<ChatResponse> {
    const concreteModel = resolveModel(opts.model);
    const res = await anthropicChat(opts, concreteModel);
    acc.inputTokens += res.usage.inputTokens;
    acc.outputTokens += res.usage.outputTokens;
    acc.cachedInputTokens += res.usage.cachedInputTokens ?? 0;
    acc.costUsd += estimateCostUsd(res);
    acc.calls += 1;
    if (!acc.models.includes(res.model)) acc.models.push(res.model);
    clog.info('scoped chat ok', {
      label: spec.label ?? 'unlabeled',
      tier: opts.model,
      model: concreteModel,
      latencyMs: res.latencyMs,
      inputTokens: res.usage.inputTokens,
      outputTokens: res.usage.outputTokens,
    });
    return res;
  }

  async function chatJson<T>(opts: ChatOptions & { schema: z.ZodType<T> }): Promise<T> {
    const { schema, ...rest } = opts;
    const res = await chat(rest);
    // Haiku frequently wraps JSON in markdown fences (```json ... ```) despite
    // the no-fences instruction in the system prompt. Strip them before parsing
    // so the Haiku column of /v1/compare doesn't die on every other call.
    const stripped = res.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch (e) {
      throw new Error(
        `scopedLLM.chatJson: response was not valid JSON (model=${res.model}): ${(e as Error).message}. ` +
        `Raw content (first 200 chars): ${res.content.slice(0, 200)}`,
      );
    }
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      throw new Error(
        `scopedLLM.chatJson: JSON did not match schema (model=${res.model}): ` +
        JSON.stringify(validated.error.flatten()),
      );
    }
    return validated.data;
  }

  return {
    chat,
    chatJson,
    usage: () => ({ ...acc }),
  };
}
