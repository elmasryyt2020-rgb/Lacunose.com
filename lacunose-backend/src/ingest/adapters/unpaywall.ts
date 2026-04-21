/**
 * Unpaywall — full-text resolver, not a search adapter.
 * Used by the parse worker to find an open-access PDF URL for a known DOI.
 *
 * Docs: https://unpaywall.org/products/api
 */
import { env } from '../../lib/env.js';
import { log } from '../../lib/logger.js';
import { get, HttpError } from '../httpClient.js';
import { defaultLimiter } from '../rateLimit.js';

const logger = log.child('ingest:unpaywall');
const BASE = 'https://api.unpaywall.org/v2';

interface UnpaywallResponse {
  doi?: string;
  is_oa?: boolean;
  best_oa_location?: {
    url_for_pdf?: string | null;
    url?: string | null;
  } | null;
}

/**
 * Returns the best open-access PDF URL for a DOI, or null if none exists.
 * Never throws for "not found" — callers can chain resolvers.
 */
export async function resolveOA(doi: string, signal?: AbortSignal): Promise<string | null> {
  if (!doi) return null;
  const clean = doi.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '');
  if (!clean) return null;

  const limiter = defaultLimiter('unpaywall');
  const url = `${BASE}/${encodeURIComponent(clean)}?email=${encodeURIComponent(env.POLITE_EMAIL)}`;

  await limiter.acquire();
  try {
    const data = (await get(url, { signal })) as UnpaywallResponse;
    return data.best_oa_location?.url_for_pdf ?? data.best_oa_location?.url ?? null;
  } catch (e) {
    if (e instanceof HttpError && (e.status === 404 || e.status === 422)) {
      return null;
    }
    logger.warn('resolveOA failed', { doi: clean, error: (e as Error).message });
    return null;
  }
}

export const unpaywall = {
  id: 'unpaywall' as const,
  resolveOA,
};
