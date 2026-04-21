/**
 * CRITIQUE phase — ungrounded-candidate filter.
 *
 * Calls the critique-tier model once per candidate. Any candidate whose
 * response is `grounded: false` is dropped. Network / parse failures are
 * treated as "grounded: true" — we'd rather under-filter than throw away a
 * real gap because of a flaky LLM call.
 */
import { z } from 'zod';
import type { CandidateGap, FieldAdapter } from '@lacunose/types';
import { llm, parallelMap } from '../llm/index.js';
import { log } from '../lib/logger.js';
import { critiqueSystemPrompt, critiqueUserPrompt } from './prompts/critique.js';

const logger = log.child('gap:critique');

const VerdictSchema = z.object({
  grounded: z.boolean(),
  rationale: z.string().max(600),
});

/**
 * Filter `candidates` to only those judged grounded. Concurrency: 12.
 *
 * `field` is accepted for logging/prompt-scoping consistency but does not
 * currently parameterize the critique prompt.
 */
export async function critiquePhase(
  candidates: CandidateGap[],
  field: FieldAdapter,
): Promise<CandidateGap[]> {
  if (candidates.length === 0) {
    logger.info('critiquePhase: empty input');
    return [];
  }
  const t0 = Date.now();
  const system = critiqueSystemPrompt();

  const verdicts = await parallelMap(
    candidates,
    async (cand) => {
      try {
        const verdict = await llm.chatJson({
          model: 'critique',
          messages: [
            { role: 'system', content: system, cache: true },
            { role: 'user', content: critiqueUserPrompt(cand) },
          ],
          temperature: 0.0,
          maxTokens: 400,
          jsonSchema: { type: 'object' },
          schema: VerdictSchema,
        });
        return verdict;
      } catch (e) {
        logger.warn('critique call failed; keeping candidate', {
          title: cand.title.slice(0, 60),
          error: (e as Error).message,
        });
        return { grounded: true, rationale: 'critique-call-failed' };
      }
    },
    { concurrency: 12 },
  );

  const kept: CandidateGap[] = [];
  let dropped = 0;
  for (let i = 0; i < candidates.length; i++) {
    const v = verdicts[i];
    const c = candidates[i];
    if (!c) continue;
    if (v && v.grounded) {
      kept.push(c);
    } else {
      dropped += 1;
      logger.debug('critique dropped candidate', {
        title: c.title.slice(0, 60),
        rationale: v?.rationale ?? '',
      });
    }
  }

  logger.info('critiquePhase done', {
    field: field.id,
    inputCount: candidates.length,
    outputCount: kept.length,
    dropped,
    latencyMs: Date.now() - t0,
  });
  return kept;
}
