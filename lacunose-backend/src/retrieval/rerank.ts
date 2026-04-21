/**
 * Cohere rerank-3 client over `undici.fetch`.
 *
 * If `env.COHERE_API_KEY` is unset, the module degrades gracefully: it skips
 * the network call and just trims the list to `topN`. Quality is worse, but
 * the pipeline still produces output.
 */
import { fetch as undiciFetch } from 'undici';
import type { RetrievedSection } from '@lacunose/types';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';

const logger = log.child('retrieval:rerank');

const COHERE_URL = 'https://api.cohere.com/v2/rerank';
const COHERE_MODEL = 'rerank-v3.5';
const TIMEOUT_MS = 30_000;
const MAX_DOC_CHARS = 8_000; // Cohere caps doc length; trim to be safe

interface CohereRerankResponse {
  results: Array<{ index: number; relevance_score: number }>;
}

/**
 * Re-order `candidates` by semantic relevance to `query`. Returns at most
 * `topN` items. Preserves all original fields and overwrites `score` with
 * the new relevance value.
 */
export async function rerank(
  query: string,
  candidates: RetrievedSection[],
  topN: number = 30,
): Promise<RetrievedSection[]> {
  if (candidates.length === 0) return [];
  if (candidates.length <= topN && !env.COHERE_API_KEY) return candidates;

  if (!env.COHERE_API_KEY) {
    logger.warn('COHERE_API_KEY unset; skipping rerank', {
      inputCount: candidates.length,
      topN,
    });
    return candidates.slice(0, topN);
  }

  const t0 = Date.now();
  const documents = candidates.map((c) => c.text.slice(0, MAX_DOC_CHARS));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await undiciFetch(COHERE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.COHERE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: COHERE_MODEL,
        query,
        documents,
        top_n: Math.min(topN, documents.length),
        return_documents: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      logger.warn('cohere rerank non-2xx; falling back to trim', {
        status: res.status,
        body: body.slice(0, 300),
      });
      return candidates.slice(0, topN);
    }

    const data = (await res.json()) as CohereRerankResponse;
    if (!Array.isArray(data.results)) {
      logger.warn('cohere rerank: unexpected response shape; falling back to trim');
      return candidates.slice(0, topN);
    }

    const out: RetrievedSection[] = [];
    for (const r of data.results) {
      const src = candidates[r.index];
      if (!src) continue;
      out.push({ ...src, score: r.relevance_score });
    }

    logger.info('rerank ok', {
      inputCount: candidates.length,
      outputCount: out.length,
      topN,
      latencyMs: Date.now() - t0,
    });
    return out;
  } catch (e) {
    logger.warn('cohere rerank failed; falling back to trim', {
      error: (e as Error).message,
    });
    return candidates.slice(0, topN);
  } finally {
    clearTimeout(timer);
  }
}
