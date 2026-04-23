/**
 * GET /api/beta/analyze/:id?token=...
 *
 * Polls the backend for status + gap_items. The claim_token travels in the
 * query string (it's a capability token, not a secret — by design, the
 * backend treats it as the auth boundary for the analysis row).
 */
import { NextResponse } from 'next/server';
import { requireBetaSession, headerError } from '../../../../../lib/betaSession';

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
    return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${auth.backend}/v1/beta/analyze/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: { 'X-Beta-Invite': auth.inviteCode },
      },
    );
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        // Poll responses should never be cached by intermediaries.
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return headerError(err);
  }
}
