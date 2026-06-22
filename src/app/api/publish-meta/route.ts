import {NextRequest, NextResponse} from 'next/server';
import {addPublishHistory} from '@/lib/metaEdits';

function publishUrl(): string | null {
  if (process.env.N8N_PUBLISH_URL) return process.env.N8N_PUBLISH_URL;
  const regen = process.env.N8N_REGENERATE_URL;
  if (regen && regen.includes('/webhook/')) {
    return regen.replace(/(\/webhook\/).*/, '$1seo-agent/publish-meta');
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventId = body?.event_id;
  const edits = Array.isArray(body?.edits) ? body.edits : [];
  if (!eventId) return NextResponse.json({ok: false, error: 'event_id required'}, {status: 400});

  const url = publishUrl();
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) return NextResponse.json({ok: false, error: 'not_configured'}, {status: 500});

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Webhook-Secret': secret},
      body: JSON.stringify({event_id: String(eventId), langs: edits}),
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return NextResponse.json({ok: false, status: res.status, ...data}, {status: 502});
    }
    const snapshot = edits.filter(
      (e: {h1?: string | null; meta_title?: string | null; meta_description?: string | null}) =>
        e.h1 || e.meta_title || e.meta_description
    );
    if (snapshot.length) await addPublishHistory(String(eventId), snapshot).catch(() => {});
    return NextResponse.json({ok: true, ...data});
  } catch {
    return NextResponse.json({ok: false, error: 'hook_unreachable'}, {status: 502});
  }
}
