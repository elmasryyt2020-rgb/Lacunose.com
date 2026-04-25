/**
 * Real semantic embeddings for short texts (cluster phrases, candidate titles)
 * via Cohere `embed-english-v3.0`.
 *
 * Why this exists: cluster.ts and rank.ts originally used the deterministic
 * `hashEmbed` in src/enrich/hashEmbed.ts, which only captures lexical overlap.
 * Two paraphrases of the same gap ("LLM reliability in oncology" /
 * "validation of LLMs for oncologic decisions") would not cluster and would
 * not be detected as near-duplicates by the rank-phase dedupe. Cohere v3 fixes
 * both at ~$0.10 per million input tokens — well under $0.001 per analysis.
 *
 * Behaviour:
 *  - Single batched call per phase (Cohere accepts up to 96 inputs per batch).
 *  - Falls back to `hashEmbed` on any error or when `COHERE_API_KEY` is unset
 *    so the pipeline still runs in dev / CI.
 *  - 1024-dim float vectors, L2-normalized by Cohere; equal-length so the
 *    existing `cosine()` helper in hashEmbed.ts works unchanged.
 */
import { fetch as undiciFetch } from 'undici';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';
import { hashEmbed } from './hashEmbed.js';

const logger = log.child('enrich:cohereEmbed');

const COHERE_URL = 'https://api.cohere.com/v2/embed';
const COHERE_MODEL = 'embed-english-v3.0';
const TIMEOUT_MS = 15_000;
const MAX_BATCH = 96;

export type CohereInputType = 'search_document' | 'search_query' | 'classification' | 'clustering';

interface CohereEmbedResponse {
  embeddings?: { float?: number[][] };
}

/**
 * Embed an array of short texts. Always returns one vector per input, in input
 * order. Empty strings get a zero-vector (cosine to anything = 0).
 *
 * @param texts       inputs to embed (each ≤ 512 tokens; we don't enforce — these are short)
 * @param inputType   Cohere semantic hint. Use 'clustering' for gap signals,
 *                    'classification' for candidate titles being deduped.
 */
export async function embedShortTexts(
  texts: string[],
  inputType: CohereInputType = 'clustering',
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Replace empty inputs with a placeholder so the API doesn't 400; we'll
  // zero them out post-hoc.
  const cleaned = texts.map((t) => (t && t.trim().length > 0 ? t : '__empty__'));
  const emptyMask = texts.map((t) => !t || t.trim().length === 0);

  if (!env.COHERE_API_KEY) {
    logger.debug('COHERE_API_KEY unset; falling back to hashEmbed', { count: texts.length });
    return texts.map((t) => hashEmbed(t || ''));
  }

  const out: number[][] = new Array(texts.length);
  for (let start = 0; start < cleaned.length; start += MAX_BATCH) {
    const batch = cleaned.slice(start, start + MAX_BATCH);
    const vecs = await embedBatch(batch, inputType);
    if (!vecs) {
      // Whole-pipeline fallback: any HTTP failure → hashEmbed every input
      // (consistent ordering preserved; we don't want partial mixed-source
      // vectors that aren't comparable under cosine).
      logger.warn('cohere batch failed; using hashEmbed for all inputs', { count: texts.length });
      return texts.map((t) => hashEmbed(t || ''));
    }
    for (let i = 0; i < vecs.length; i++) {
      out[start + i] = emptyMask[start + i] ? new Array(vecs[i]?.length ?? 1024).fill(0) : (vecs[i] ?? []);
    }
  }
  return out;
}

async function embedBatch(
  texts: string[],
  inputType: CohereInputType,
): Promise<number[][] | null> {
  const t0 = Date.now();
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
        texts,
        input_type: inputType,
        embedding_types: ['float'],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      logger.warn('cohere embed non-2xx', {
        status: res.status,
        body: body.slice(0, 300),
        inputType,
        batchSize: texts.length,
      });
      return null;
    }
    const data = (await res.json()) as CohereEmbedResponse;
    const vecs = data.embeddings?.float;
    if (!Array.isArray(vecs) || vecs.length !== texts.length) {
      logger.warn('cohere embed: unexpected shape', { got: vecs?.length, want: texts.length });
      return null;
    }
    logger.info('cohere embed ok', {
      inputType,
      batchSize: texts.length,
      dim: vecs[0]?.length ?? 0,
      latencyMs: Date.now() - t0,
    });
    return vecs;
  } catch (e) {
    logger.warn('cohere embed failed', { error: (e as Error).message, batchSize: texts.length });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
