/**
 * Shared BullMQ Queue instances used by the edge-fn to enqueue work.
 * Workers live under src/workers/* and consume from these same queues.
 */
import { Queue } from 'bullmq';
import { QUEUE_NAMES, type IngestJob, type SupportJob } from '@lacunose/types';
import { bullConnection } from '../lib/redis.js';

export const ingestQueue = new Queue<IngestJob>(QUEUE_NAMES.ingest, bullConnection());
export const supportQueue = new Queue<SupportJob>(QUEUE_NAMES.support, bullConnection());

/** Close every queue opened by the edge-fn. Call from the SIGTERM handler. */
export async function closeAllQueues(): Promise<void> {
  await Promise.allSettled([ingestQueue.close(), supportQueue.close()]);
}
