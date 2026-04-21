/**
 * Embed worker — vectorizes paper sections.
 *
 * Consumes `embed` queue. Prefers S2's cached SPECTER2 embeddings;
 * falls back to a deterministic hash-embedding placeholder for v1
 * (see src/enrich/hashEmbed.ts for why).
 */
import '../lib/env.js';
import { Worker } from 'bullmq';
import type { EmbedJob } from '@lacunose/types';
import { QUEUE_NAMES } from '@lacunose/types';
import { bullConnection } from '../lib/redis.js';
import { log } from '../lib/logger.js';
import { embedAllSections } from '../enrich/embed.js';

const logger = log.child('worker:embed');

const worker = new Worker<EmbedJob>(
  QUEUE_NAMES.embed,
  async (job) => {
    const { paper_id } = job.data;
    try {
      await embedAllSections(paper_id);
      logger.info('done', { paper_id });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('failed', { paper_id, err: msg });
      throw err;
    }
  },
  { ...bullConnection(), concurrency: 2 },
);

worker.on('failed', (job, err) => {
  logger.error('job-failed', { id: job?.id, err: err.message });
});

process.on('SIGTERM', () => {
  void worker.close().then(() => process.exit(0));
});
