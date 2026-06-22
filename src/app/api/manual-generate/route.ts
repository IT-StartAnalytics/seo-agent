import {NextRequest, NextResponse} from 'next/server';

// Webhook that runs a custom-prompt generation in n8n. Configure N8N_MANUAL_GENERATE_URL,
// or it is derived from N8N_REGENERATE_URL (same host, path /webhook/seo-agent/manual-generate).
function manualUrl(): string | null {
  if (process.env.N8N_MANUAL_GENERATE_URL) return process.env.N8N_MANUAL_GENERATE_URL;
  const regen = process.env.N8N_REGENERATE_URL;
  if (regen && regen.includes('/webhook/')) {
    return regen.replace(/(\/webhook\/).*/, '$1seo-agent/manual-generate');
  }
  return null;
}

type GenLang = {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null};

// Accept a few shapes from n8n and normalize to {langs: GenLang[]}.
function normalizeLangs(data: unknown): GenLang[] {
  const raw =
    Array.isArray(data) ? data :
    Array.isArray((data as {langs?: unknown})?.langs) ? (data as {langs: unknown[]}).langs :
    Array.isArray((data as {result?: {langs?: unknown}})?.result?.langs) ? (data as {result: {langs: unknown[]}}).result.langs :
    [];
  return (raw as Record<string, unknown>[])
    .map((r) => ({
      lang: String(r.lang ?? r.language ?? ''),
      h1: (r.h1 ?? r.name ?? null) as string | null,
      meta_title: (r.meta_title ?? r.metaTitle ?? null) as string | null,
      meta_description: (r.meta_description ?? r.metaDescription ?? r.meta_desc ?? null) as string | null
    }))
    .filter((r) => r.lang);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventId = body?.event_id;
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  const model = typeof body?.model === 'string' ? body.model : '';
  const langs = Array.isArray(body?.langs) ? body.langs.map(String).filter(Boolean) : [];
  if (!eventId) return NextResponse.json({ok: false, error: 'event_id required'}, {status: 400});
  if (!prompt) return NextResponse.json({ok: false, error: 'prompt required'}, {status: 400});
  if (!langs.length) return NextResponse.json({ok: false, error: 'langs required'}, {status: 400});

  const url = manualUrl();
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) return NextResponse.json({ok: false, error: 'not_configured'}, {status: 500});

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Webhook-Secret': secret},
      body: JSON.stringify({event_id: String(eventId), prompt, model, langs}),
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data && data.ok === false)) {
      return NextResponse.json({ok: false, status: res.status, error: 'hook_failed', detail: data}, {status: 502});
    }
    const out = normalizeLangs(data);
    if (!out.length) return NextResponse.json({ok: false, error: 'empty_result', detail: data}, {status: 502});
    return NextResponse.json({ok: true, langs: out, model});
  } catch {
    return NextResponse.json({ok: false, error: 'hook_unreachable'}, {status: 502});
  }
}
