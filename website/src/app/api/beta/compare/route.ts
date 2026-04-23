/**
 * POST /api/beta/compare
 *
 * Proxies to the backend's /v1/compare. Runs Haiku on the same corpus as a
 * completed Opus analysis and returns both gap lists side-by-side. This is
 * the Day-1 A/B endpoint — judges click "Compare with Haiku" and this fires.
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
    const upstream = await fetch(`${auth.backend}/v1/compare`, {
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
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (err) {
    return headerError(err);
  }
}
