/**
 * POST /api/beta/analyze
 *
 * Proxies a create-analysis request to the backend's /v1/beta/analyze after
 * confirming the caller holds the beta_session cookie. Adds the
 * X-Beta-Invite header server-side so the invite code never touches the
 * browser.
 */
import { NextResponse } from 'next/server';
import { requireBetaSession, headerError } from '../../../../lib/betaSession';

export async function POST(request: Request) {
  const auth = await requireBetaSession();
  if (!auth.ok) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${auth.backend}/v1/beta/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Beta-Invite': auth.inviteCode,
      },
      body: JSON.stringify(payload),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (err) {
    return headerError(err);
  }
}
