import {NextRequest, NextResponse} from 'next/server';
import {normalizeEmail, isEmailAllowed, hashCode, generateCode} from '@/lib/auth';
import {setLoginCode} from '@/lib/loginCodes';

const CODE_TTL_MIN = 10;

// Webhook that emails the login code (n8n). Configure N8N_LOGIN_CODE_URL, or it is
// derived from N8N_REGENERATE_URL (same host, path /webhook/seo-agent/login-code).
function loginCodeUrl(): string | null {
  if (process.env.N8N_LOGIN_CODE_URL) return process.env.N8N_LOGIN_CODE_URL;
  const regen = process.env.N8N_REGENERATE_URL;
  if (regen && regen.includes('/webhook/')) {
    return regen.replace(/(\/webhook\/).*/, '$1seo-agent/login-code');
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email);
  if (!email || !email.includes('@')) {
    return NextResponse.json({ok: false, error: 'invalid_email'}, {status: 400});
  }
  if (!isEmailAllowed(email)) {
    return NextResponse.json({ok: false, error: 'not_allowed'}, {status: 403});
  }

  const url = loginCodeUrl();
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) {
    return NextResponse.json({ok: false, error: 'not_configured'}, {status: 500});
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000).toISOString();

  try {
    await setLoginCode(email, hashCode(code, email), expiresAt);
  } catch {
    return NextResponse.json({ok: false, error: 'store_failed'}, {status: 500});
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Webhook-Secret': secret},
      body: JSON.stringify({email, code, ttl_minutes: CODE_TTL_MIN}),
      cache: 'no-store'
    });
    if (!res.ok) {
      return NextResponse.json({ok: false, error: 'send_failed', status: res.status}, {status: 502});
    }
  } catch {
    return NextResponse.json({ok: false, error: 'send_unreachable'}, {status: 502});
  }

  return NextResponse.json({ok: true, ttl_minutes: CODE_TTL_MIN});
}
