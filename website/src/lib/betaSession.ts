/**
 * Shared helpers for the /api/beta/* route handlers.
 *
 * Gates requests on the httpOnly `beta_session` cookie set by /api/beta/verify,
 * then forwards to the backend with the server-side X-Beta-Invite header.
 */
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireBetaSession(): Promise<
  | { ok: true; inviteCode: string; backend: string }
  | { ok: false; response: NextResponse }
> {
  const expected = process.env.BETA_INVITE_CODE;
  const backend = process.env.LACUNOSE_BACKEND_URL ?? 'http://localhost:4000';
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'server_not_configured' }, { status: 500 }),
    };
  }
  const cookieStore = await cookies();
  const session = cookieStore.get('beta_session')?.value;
  if (!session || session !== expected) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true, inviteCode: expected, backend };
}

export function headerError(err: unknown): NextResponse {
  const msg = err instanceof Error ? err.message : String(err);
  return NextResponse.json({ error: 'upstream_failed', detail: msg }, { status: 502 });
}
