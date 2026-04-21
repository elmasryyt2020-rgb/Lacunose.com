/**
 * Mock LLM provider — deterministic, offline, free.
 *
 * Used by unit tests and local dev. The output is keyed off a hash of the
 * input messages + tier so that the same prompt always yields the same
 * response, which is what tests assert against.
 *
 * The returned content is shaped to look like the real provider output for
 * each tier so downstream JSON parsing still works:
 *  - tier `map`       → array of 2 `GapSignal` objects
 *  - tier `synth`     → array of 3 `CandidateGap` objects
 *  - tier `critique`  → `{ grounded: true, rationale: "mock" }`
 */
import { createHash } from 'node:crypto';
import type {
  ChatOptions,
  ChatResponse,
  LLMMessage,
  ModelTier,
  CandidateGap,
  GapSignal,
} from '@lacunose/types';
import { log } from '../../lib/logger.js';

const clog = log.child('llm:mock');

/** Stable hex digest of a message array — used as a deterministic RNG seed. */
function hashMessages(messages: LLMMessage[], tier: ModelTier): string {
  const payload = JSON.stringify({ tier, messages: messages.map((m) => ({ r: m.role, c: m.content })) });
  return createHash('sha256').update(payload).digest('hex');
}

/** Deterministic integer in [0, max) seeded by a hex digest + salt. */
function seededInt(digest: string, salt: string, max: number): number {
  const h = createHash('sha256').update(digest + salt).digest('hex');
  // Take first 8 hex chars → 32-bit unsigned int.
  const n = parseInt(h.slice(0, 8), 16);
  return n % max;
}

function mockMapResponse(digest: string): GapSignal[] {
  const kinds: GapSignal['kind'][] = ['future-work', 'limitation', 'contradiction-cue', 'methodology-hint'];
  return [0, 1].map((i) => ({
    paper_id: `mock-paper-${seededInt(digest, `p${i}`, 1000)}`,
    section_id: `mock-sec-${seededInt(digest, `s${i}`, 1000)}`,
    kind: kinds[seededInt(digest, `k${i}`, kinds.length)]!,
    phrase: `mock phrase ${i}`,
    quote: `mock verbatim quote ${i}`,
  }));
}

function mockSynthResponse(digest: string): CandidateGap[] {
  return [0, 1, 2].map((i) => ({
    title: `Mock gap ${i}`,
    description: `Mock description for gap ${i}, seeded ${digest.slice(0, 6)}.`,
    category: 'future-work' as const,
    novelty_score: 0.5 + (seededInt(digest, `n${i}`, 50) / 100),
    feasibility_score: 0.5 + (seededInt(digest, `f${i}`, 50) / 100),
    research_question: `How does mock topic ${i} interact with mock population ${i}?`,
    suggested_method: 'mock-rct',
    suggested_n: 100 + seededInt(digest, `nn${i}`, 400),
    suggested_duration_months: 6 + seededInt(digest, `dd${i}`, 18),
    evidence: [
      { paper_id: `mock-paper-${seededInt(digest, `ea${i}`, 1000)}`, quote: `mock evidence quote A-${i}` },
      { paper_id: `mock-paper-${seededInt(digest, `eb${i}`, 1000)}`, quote: `mock evidence quote B-${i}` },
    ],
  }));
}

/**
 * Mock `chat` implementation. Obeys the `ChatOptions` signature so it's
 * plug-in-compatible with the real providers via the router.
 */
export async function chat(opts: ChatOptions, concreteModel: string): Promise<ChatResponse> {
  const start = Date.now();
  const digest = hashMessages(opts.messages, opts.model);

  let content: string;
  if (opts.model === 'map') {
    content = JSON.stringify(mockMapResponse(digest));
  } else if (opts.model === 'synth') {
    content = JSON.stringify(mockSynthResponse(digest));
  } else {
    content = JSON.stringify({ grounded: true, rationale: 'mock' });
  }

  const inputTokens = Math.ceil(
    opts.messages.reduce((s, m) => s + m.content.length, 0) / 4,
  );
  const outputTokens = Math.ceil(content.length / 4);
  const latencyMs = Date.now() - start;

  clog.info('mock chat', {
    tier: opts.model,
    model: concreteModel,
    inputTokens,
    outputTokens,
    latencyMs,
  });

  return {
    content,
    usage: { inputTokens, outputTokens },
    provider: 'mock',
    model: concreteModel,
    latencyMs,
  };
}
