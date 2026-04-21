/**
 * Thin polite-HTTP wrapper around undici.fetch used by every source adapter.
 *
 * - Injects a `User-Agent: Lacunose/1.0 (mailto:…)` header.
 * - 30s timeout per attempt.
 * - Retries up to 3 times on 5xx / ECONNRESET / ETIMEDOUT with exp backoff.
 * - Throws a structured HttpError on final failure.
 */
import { fetch as undiciFetch } from 'undici';
import { env } from '../lib/env.js';
import { log } from '../lib/logger.js';

const logger = log.child('ingest:http');

export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body?: string;

  constructor(message: string, status: number, url: string, body?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

export interface GetOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** If true, parse response as text rather than JSON. */
  asText?: boolean;
  /** Override timeout (ms). Default 30_000. */
  timeoutMs?: number;
  /** Override retry count. Default 3. */
  retries?: number;
}

const USER_AGENT = `Lacunose/1.0 (mailto:${env.POLITE_EMAIL})`;
const BACKOFF_MS = [500, 2_000, 8_000];

/** Transient network errors that should trigger a retry. */
const TRANSIENT_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED']);

function isTransient(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const anyErr = err as { code?: string; cause?: { code?: string } };
  const code = anyErr.code ?? anyErr.cause?.code;
  if (code && TRANSIENT_CODES.has(code)) return true;
  // undici TimeoutError
  if ((err as { name?: string }).name === 'TimeoutError') return true;
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retries + polite headers. Returns the raw Response on success;
 * callers typically won't use this directly (use `get` instead).
 */
async function httpFetch(url: string, opts: GetOptions = {}): Promise<{ status: number; body: string }> {
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await undiciFetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json, application/xml;q=0.9, */*;q=0.1',
          ...opts.headers,
        },
        signal: controller.signal,
      });

      const body = await res.text();

      if (res.status >= 500 && attempt < retries) {
        logger.warn('5xx retrying', { url, status: res.status, attempt });
        lastErr = new HttpError(`HTTP ${res.status}`, res.status, url, body.slice(0, 500));
      } else if (res.status === 429 && attempt < retries) {
        // Back off for rate-limit too
        logger.warn('429 retrying', { url, attempt });
        lastErr = new HttpError(`HTTP 429`, 429, url, body.slice(0, 500));
      } else if (!res.ok) {
        throw new HttpError(`HTTP ${res.status} for ${url}`, res.status, url, body.slice(0, 500));
      } else {
        return { status: res.status, body };
      }
    } catch (e) {
      lastErr = e;
      if (e instanceof HttpError) {
        // Already wrapped; only retried for 5xx/429 above
        if (attempt >= retries) throw e;
      } else if (opts.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      } else if (isTransient(e) && attempt < retries) {
        logger.warn('transient error retrying', { url, attempt, error: (e as Error).message });
      } else {
        throw e;
      }
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
    }

    const backoff = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 8_000;
    await sleep(backoff);
  }

  if (lastErr instanceof HttpError) throw lastErr;
  throw new HttpError(
    `HTTP request failed after ${retries + 1} attempts: ${(lastErr as Error)?.message ?? 'unknown'}`,
    0,
    url,
  );
}

/** GET + JSON parse. Parses nothing if `asText: true`. */
export async function get(url: string, opts: GetOptions = {}): Promise<unknown> {
  const { body } = await httpFetch(url, opts);
  if (opts.asText) return body;
  if (body.length === 0) return null;
  try {
    return JSON.parse(body);
  } catch (e) {
    throw new HttpError(
      `JSON parse failed for ${url}: ${(e as Error).message}`,
      0,
      url,
      body.slice(0, 500),
    );
  }
}

/** GET + return raw text (Atom XML, PubMed XML, …). */
export async function getText(url: string, opts: GetOptions = {}): Promise<string> {
  const { body } = await httpFetch(url, { ...opts, asText: true });
  return body;
}

export const httpClient = {
  get,
  getText,
  HttpError,
};
