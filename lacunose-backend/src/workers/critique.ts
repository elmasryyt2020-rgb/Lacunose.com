/**
 * Critique worker — placeholder.
 *
 * In v1 the critique pass runs inline inside the gap pipeline (src/gap/critique.ts),
 * so this worker is currently a no-op. It exists in the PM2 ecosystem so we can
 * split critique into its own queue later if gap-engine throughput becomes a bottleneck.
 */
import '../lib/env.js';
import { Worker } from 'bullmq';
import { QUEUE_NAMES } from '@lacunose/types';
import { bullConnection } from '../lib/redis.js';
import { log } from '../lib/logger.js';

const logger = log.child('worker:critique');

const worker = new Worker(
  QUEUE_NAMES.critique,
  async (job) => {
    logger.info('noop', { id: job.id });
  },
  { ...bullConnection(), concurrency: 1 },
);

worker.on('failed', (job, err) => {
  logger.error('job-failed', { id: job?.id, err: err.message });
});

async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown', { signal });
  try { await worker.close(); } catch (err) { logger.error('worker_close_failed', { err: (err as Error).message }); }
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
