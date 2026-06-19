import {NextRequest, NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {createSessionToken, AUTH_COOKIE} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === 'string' ? body.password : '';
  const expected = process.env.SITE_PASSWORD;

  if (!expected) {
    return NextResponse.json({error: 'server_not_configured'}, {status: 500});
  }
  // Tolerate trailing/leading whitespace that often sneaks into env values
  if (password.trim() !== expected.trim()) {
    return NextResponse.json({error: 'invalid'}, {status: 401});
  }

  const token = await createSessionToken();
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
