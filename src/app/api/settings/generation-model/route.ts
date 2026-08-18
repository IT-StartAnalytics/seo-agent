import {NextRequest, NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {AUTH_COOKIE, verifySessionToken} from '@/lib/auth';
import {getGenerationModel, setGenerationModel, isAllowedModel, ALLOWED_MODELS} from '@/lib/settings';

// n8n reads the active generation model here (no secret needed - it is just a model name).
export async function GET() {
  const model = await getGenerationModel();
  return NextResponse.json({model, allowed: ALLOWED_MODELS});
}

// The UI saves the active model. Session-gated (same cookie as the rest of the app).
export async function POST(req: NextRequest) {
  const store = await cookies();
  const authed = await verifySessionToken(store.get(AUTH_COOKIE)?.value);
  if (!authed) return NextResponse.json({ok: false, error: 'unauthorized'}, {status: 401});

  const body = await req.json().catch(() => ({}));
  const model = body?.model;
  if (!isAllowedModel(model)) return NextResponse.json({ok: false, error: 'model not allowed'}, {status: 400});

  try {
    await setGenerationModel(String(model));
    return NextResponse.json({ok: true, model});
  } catch {
    return NextResponse.json({ok: false, error: 'db_error'}, {status: 500});
  }
}
