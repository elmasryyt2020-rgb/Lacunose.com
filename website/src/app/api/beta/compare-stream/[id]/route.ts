/**
 * GET /api/beta/compare-stream/:id?token=...
 *
 * SSE proxy to the backend's /v1/beta/compare-stream/:id. Streams Haiku-tier
 * gap-by-gap output for the same paper corpus the original Opus analysis ran
 * on, so the web /app can render an Opus-vs-Haiku side-by-side from second 0.
 *
 * The browser EventSource API can't set custom headers, so we authenticate
 * the *user* via the `beta_session` cookie (same as every other /api/beta/*
 * route) and add the server-side X-Beta-Invite header on the proxied request.
 *
 * Streaming requires the Node runtime — the Edge runtime would buffer.
 */
import { requireBetaSession } from '../../../../../lib/betaSession';

export const runtime = 'nodejs';
// Disable static optimization; SSE responses must always be live.
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireBetaSession();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response(JSON.stringify({ error: 'missing_token' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Surface client-side aborts to the upstream backend so it can cancel any
  // in-flight Anthropic calls instead of finishing a run no one will read.
  const upstreamAbort = new AbortController();
  request.signal.addEventListener('abort', () => upstreamAbort.abort());

  let upstream: Response;
  try {
    upstream = await fetch(
      `${auth.backend}/v1/beta/compare-stream/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'X-Beta-Invite': auth.inviteCode,
          Accept: 'text/event-stream',
        },
        signal: upstreamAbort.signal,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'upstream_failed', detail: msg }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pass through non-2xx responses (e.g. 401/404 from the backend) without
  // upgrading them to a stream — clients should see the JSON error.
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  }

  // Pipe upstream straight through. We don't reframe events here — the
  // backend already emits valid SSE.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
