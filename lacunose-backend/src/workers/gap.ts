/**
 * Gap worker — the main event.
 *
 * Consumes `gap` queue. Runs the full map-reduce-critique-rank pipeline
 * and streams gap_items into Postgres one-by-one (Realtime broadcasts
 * them to the mobile client as they're inserted).
 */
import '../lib/env.js';
import { Worker } from 'bullmq';
import type { GapJob } from '@lacunose/types';
import { QUEUE_NAMES } from '@lacunose/types';
import { bullConnection } from '../lib/redis.js';
import { log } from '../lib/logger.js';
import { runGapAnalysis } from '../gap/pipeline.js';

const logger = log.child('worker:gap');

const worker = new Worker<GapJob>(
  QUEUE_NAMES.gap,
  async (job) => {
    const { analysis_id, user_id, field, topic, structured_frame, paper_ids, is_anonymous } = job.data;
    logger.info('start', { analysis_id, paper_count: paper_ids.length, isAnonymous: !!is_anonymous });

    const controller = new AbortController();
    // 15 min hard cap — pro map calls are 3-5x slower than flash but 100%
    // reliable; a 40-section corpus at concurrency 12 can take 6-10 min
    // for map alone, plus reduce/critique/synth/rank.
    const jobLifetime = setTimeout(() => controller.abort(), 15 * 60 * 1000);

    try {
      await runGapAnalysis({
        analysisId: analysis_id,
        userId: user_id,
        topic,
        field,
        structuredFrame: structured_frame,
        paperIds: paper_ids,
        signal: controller.signal,
        ...(is_anonymous ? { isAnonymous: true } : {}),
      });
      logger.info('done', { analysis_id });
    } finally {
      clearTimeout(jobLifetime);
    }
  },
  {
    ...bullConnection(),
    concurrency: 1, // one analysis per fork; PM2 runs 2 forks
    // Opus map-reduce across clusters can run 2-5 min; default 30s lock
    // causes silent retries mid-pipeline.
    lockDuration: 600_000,
    stalledInterval: 120_000,
  },
);

worker.on('failed', (job, err) => {
  logger.error('job-failed', { id: job?.id, err: err.message });
});

async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown', { signal });
  try {
    await worker.close();
  } catch (err) {
    logger.error('worker_close_failed', { err: (err as Error).message });
  }
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
