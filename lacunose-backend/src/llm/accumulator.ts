/**
 * Per-analysis LLM-usage accumulator.
 *
 * Used so the gap pipeline can roll every `llm.chat(...)` call's token
 * counts into one `cost_tokens` record persisted on `gap_analyses`.
 *
 * The accumulator is process-local (Map keyed by analysisId). We don't
 * persist it across restarts — if a worker dies mid-pipeline, the analysis
 * is already marked `failed` with status=running; the cost row is
 * best-effort telemetry, not billing-critical.
 */
import type { ChatResponse } from '@lacunose/types';
import { estimateCostUsd } from './usage.js';

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  costUsd: number;
  calls: number;
  providers: string[];
  models: string[];
}

const totals = new Map<string, UsageTotals>();

export function startTracking(analysisId: string): void {
  totals.set(analysisId, {
    inputTokens: 0, outputTokens: 0, cachedInputTokens: 0,
    costUsd: 0, calls: 0, providers: [], models: [],
  });
}

export function record(analysisId: string, res: ChatResponse): void {
  const t = totals.get(analysisId);
  if (!t) return;
  t.inputTokens += res.usage.inputTokens;
  t.outputTokens += res.usage.outputTokens;
  t.cachedInputTokens += res.usage.cachedInputTokens ?? 0;
  t.costUsd += estimateCostUsd(res);
  t.calls += 1;
  if (!t.providers.includes(res.provider)) t.providers.push(res.provider);
  if (!t.models.includes(res.model)) t.models.push(res.model);
}

export function collect(analysisId: string): UsageTotals | undefined {
  const t = totals.get(analysisId);
  totals.delete(analysisId);
  return t;
}
