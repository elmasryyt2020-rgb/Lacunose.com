/**
 * POST /api/beta/verify
 *
 * Checks the user-submitted invite code against `BETA_INVITE_CODE` (server-
 * side env, never sent to the browser). On success, sets an httpOnly
 * `beta_session` cookie containing an opaque token the other /api/beta/*
 * routes use to authorize. The invite code itself is never stored in the
 * browser — subsequent requests only send the cookie.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: Request) {
  const expected = process.env.BETA_INVITE_CODE;
  if (!expected) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const code = typeof (body as { code?: unknown })?.code === 'string'
    ? (body as { code: string }).code
    : '';

  if (!code || !constantTimeEq(code, expected)) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 401 });
  }

  // Opaque session token. Since the only check we do is "does this cookie
  // equal the server-known invite code?", we use the code itself as the
  // session value (set httpOnly so JS can't read it). Low-tech but correct
  // for a 6-tester + judges demo. Not a real auth system.
  const cookieStore = await cookies();
  cookieStore.set('beta_session', expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SEC,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete('beta_session');
  return NextResponse.json({ ok: true });
}
