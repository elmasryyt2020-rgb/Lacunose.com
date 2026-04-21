/**
 * Support worker — bridges Zoho Mail and the in-app chat.
 *
 * Two responsibilities:
 *   1. Consume `support` queue (send_outbound) → SMTP send via Zoho.
 *   2. Periodically poll Zoho IMAP for inbound replies, thread them,
 *      insert into support_messages, and fan out as push + in-app notification.
 */
import '../lib/env.js';
import { Worker, Queue } from 'bullmq';
import type { SupportJob } from '@lacunose/types';
import { QUEUE_NAMES } from '@lacunose/types';
import { bullConnection } from '../lib/redis.js';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { handleOutbound, handleInboundPoll } from '../email/supportBridge.js';

const logger = log.child('worker:support');

const supportQueue = new Queue<SupportJob>(QUEUE_NAMES.support, bullConnection());

// Seed a repeating poll job every SUPPORT_POLL_INTERVAL_MS (defaults to 30s).
await supportQueue.add(
  'poll_inbox_repeat',
  { kind: 'poll_inbox' },
  {
    repeat: { every: env.SUPPORT_POLL_INTERVAL_MS },
    jobId: 'poll_inbox_repeat',
    removeOnComplete: 5,
  },
);

const worker = new Worker<SupportJob>(
  QUEUE_NAMES.support,
  async (job) => {
    const data = job.data;
    if (data.kind === 'send_outbound') {
      await handleOutbound(data);
      logger.info('outbound-sent', { thread: data.thread_id });
      return;
    }
    if (data.kind === 'poll_inbox') {
      await handleInboundPoll();
      return;
    }
  },
  { ...bullConnection(), concurrency: 1 },
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
  try {
    await supportQueue.close();
  } catch {}
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
