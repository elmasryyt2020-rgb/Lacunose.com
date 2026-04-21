/**
 * Parse worker — downloads OA PDFs and extracts structured sections via PyMuPDF.
 *
 * Consumes `parse` queue. Best-effort: failures are logged but don't block
 * gap analysis. Sections (abstract, intro, methods, results, discussion,
 * limitations, future_work, conclusion) land in paper_sections.
 */
import '../lib/env.js';
import { Worker } from 'bullmq';
import type { ParseJob } from '@lacunose/types';
import { QUEUE_NAMES } from '@lacunose/types';
import { bullConnection } from '../lib/redis.js';
import { log } from '../lib/logger.js';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { parsePdfToSections } from '../enrich/parsePdf.js';

const logger = log.child('worker:parse');

const worker = new Worker<ParseJob>(
  QUEUE_NAMES.parse,
  async (job) => {
    const { paper_id, pdf_url } = job.data;
    logger.info('start', { paper_id });

    let sections;
    try {
      sections = await parsePdfToSections(pdf_url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('parse-failed', { paper_id, err: msg });
      return;
    }

    if (!sections || sections.length === 0) {
      logger.warn('no-sections', { paper_id });
      return;
    }

    const sb = supabaseAdmin();
    const rows = sections.map((s) => ({
      paper_id,
      kind: s.kind,
      text: s.text,
      position: s.position,
    }));

    // Skip if the paper already has non-abstract sections (we may re-parse)
    const { data: existing } = await sb
      .from('paper_sections')
      .select('id')
      .eq('paper_id', paper_id)
      .neq('kind', 'abstract')
      .limit(1);
    if (existing && existing.length > 0) {
      logger.info('already-parsed', { paper_id });
      return;
    }

    const { error } = await sb.from('paper_sections').insert(rows);
    if (error) {
      logger.error('insert-failed', { paper_id, err: error.message });
      return;
    }

    logger.info('done', { paper_id, sections: rows.length });
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
