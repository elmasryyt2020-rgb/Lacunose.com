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
    const { analysis_id, user_id, field, topic, structured_frame, paper_ids } = job.data;
    logger.info('start', { analysis_id, paper_count: paper_ids.length });

    const controller = new AbortController();
    const jobLifetime = setTimeout(() => controller.abort(), 6 * 60 * 1000); // 6 min hard cap

    try {
      await runGapAnalysis({
        analysisId: analysis_id,
        userId: user_id,
        topic,
        field,
        structuredFrame: structured_frame,
        paperIds: paper_ids,
        signal: controller.signal,
      });
      logger.info('done', { analysis_id });
    } finally {
      clearTimeout(jobLifetime);
    }
  },
  { ...bullConnection(), concurrency: 1 }, // one analysis per fork; PM2 runs 2 forks
);

worker.on('failed', (job, err) => {
  logger.error('job-failed', { id: job?.id, err: err.message });
});

process.on('SIGTERM', () => {
  void worker.close().then(() => process.exit(0));
});
