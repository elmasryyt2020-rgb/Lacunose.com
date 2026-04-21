/**
 * Ingest worker — fetches the paper corpus for an analysis.
 *
 * Consumes `ingest` queue. On success, enqueues `gap` (or returns done if
 * nothing found). Parse + embed steps run opportunistically as follow-up
 * jobs so the gap engine doesn't block on full-text or embedding work.
 */
import '../lib/env.js';
import { Worker, Queue } from 'bullmq';
import type { IngestJob, GapJob, ParseJob, EmbedJob } from '@lacunose/types';
import { QUEUE_NAMES } from '@lacunose/types';
import { bullConnection } from '../lib/redis.js';
import { log } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { runIngestion } from '../ingest/index.js';

const logger = log.child('worker:ingest');

const gapQueue = new Queue<GapJob>(QUEUE_NAMES.gap, bullConnection());
const parseQueue = new Queue<ParseJob>(QUEUE_NAMES.parse, bullConnection());
const embedQueue = new Queue<EmbedJob>(QUEUE_NAMES.embed, bullConnection());

const worker = new Worker<IngestJob>(
  QUEUE_NAMES.ingest,
  async (job) => {
    const { analysis_id, user_id, topic, field, structured_frame, filters, concept_id } = job.data;
    logger.info('start', { analysis_id, topic, field });

    const sb = supabaseAdmin();
    await sb.from('gap_analyses').update({ status: 'running' }).eq('id', analysis_id);

    try {
      const result = await runIngestion({
        topic,
        field,
        concept_id,
        years: filters?.years,
        include_preprints: filters?.include_preprints,
        open_access_only: filters?.open_access_only,
        limit: 500,
      });

      const paperIds = result.papers.map((p) => p.id);
      logger.info('ingested', { analysis_id, count: paperIds.length });

      if (paperIds.length < 5) {
        await sb
          .from('gap_analyses')
          .update({ status: 'done', completed_at: new Date().toISOString(), error: 'insufficient-corpus' })
          .eq('id', analysis_id);
        // Refund the quota slot — user got nothing useful.
        await sb.rpc('decrement_analyses_used', { p_user: user_id });
        return;
      }

      // Fire-and-forget: parse + embed as best-effort background work.
      // Deterministic jobIds prevent duplicate work on ingest-job retries
      // (BullMQ dedupes by jobId).
      for (const p of result.papers) {
        if (p.full_text_url) {
          await parseQueue.add(
            'parse',
            { paper_id: p.id, pdf_url: p.full_text_url },
            { jobId: `parse:${p.id}`, removeOnComplete: 100, attempts: 2 },
          );
        }
        await embedQueue.add(
          'embed',
          { paper_id: p.id },
          { jobId: `embed:${p.id}`, removeOnComplete: 100, attempts: 2 },
        );
      }

      // Enqueue the gap pipeline. jobId ensures a retried ingest job can't
      // spawn two concurrent gap pipelines that would double-insert gap_items.
      // Give embed a 30s head start so at least most sections have vectors.
      await gapQueue.add(
        'gap',
        {
          analysis_id,
          user_id,
          field,
          topic,
          structured_frame,
          paper_ids: paperIds,
        } satisfies GapJob,
        { jobId: `gap:${analysis_id}`, delay: 30_000, removeOnComplete: 50, attempts: 1 },
      );

      logger.info('queued-gap', { analysis_id, paper_count: paperIds.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('failed', { analysis_id, err: msg, attempt: job.attemptsMade });
      await sb
        .from('gap_analyses')
        .update({ status: 'failed', error: msg, completed_at: new Date().toISOString() })
        .eq('id', analysis_id);
      // Refund only once, on the FINAL attempt (BullMQ retries on transient
      // failures; refunding every attempt over-refunds a flaky run).
      const isFinal = (job.attemptsMade + 1) >= (job.opts.attempts ?? 1);
      if (isFinal) {
        await sb.rpc('decrement_analyses_used', { p_user: user_id });
      }
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
