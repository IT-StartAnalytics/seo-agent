import {NextRequest, NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {normalizeEmail, isEmailAllowed, hashCode, createSessionToken, AUTH_COOKIE} from '@/lib/auth';
import {getLoginCode, bumpAttempts, clearLoginCode} from '@/lib/loginCodes';

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  const code = String(body?.code || '').trim();
  if (!email || !code) return NextResponse.json({ok: false, error: 'missing'}, {status: 400});
  if (!isEmailAllowed(email)) return NextResponse.json({ok: false, error: 'not_allowed'}, {status: 403});

  const row = await getLoginCode(email);
  if (!row) return NextResponse.json({ok: false, error: 'no_code'}, {status: 401});

  if (Date.parse(row.expires_at) < Date.now()) {
    await clearLoginCode(email);
    return NextResponse.json({ok: false, error: 'expired'}, {status: 401});
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await clearLoginCode(email);
    return NextResponse.json({ok: false, error: 'too_many_attempts'}, {status: 429});
  }

  if (hashCode(code, email) !== row.code_hash) {
    await bumpAttempts(email);
    return NextResponse.json({ok: false, error: 'invalid_code'}, {status: 401});
  }

  // Success: consume the code and issue the session cookie.
  await clearLoginCode(email);
  const token = await createSessionToken(email);
  const store = await cookies();
  store.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
  return NextResponse.json({ok: true});
}
