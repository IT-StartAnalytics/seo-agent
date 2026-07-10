import {NextRequest, NextResponse} from 'next/server';

// Webhook that pushes a performer list to the Google Sheet and fetches worldwide volumes in n8n.
// Configure N8N_ARTISTS_TO_SHEET_URL, or it is derived from N8N_REGENERATE_URL
// (same host, path /webhook/seo-agent/artists-to-sheet), exactly like manual-generate.
function artistsUrl(): string | null {
  if (process.env.N8N_ARTISTS_TO_SHEET_URL) return process.env.N8N_ARTISTS_TO_SHEET_URL;
  const regen = process.env.N8N_REGENERATE_URL;
  if (regen && regen.includes('/webhook/')) {
    return regen.replace(/(\/webhook\/).*/, '$1seo-agent/artists-to-sheet');
  }
  return null;
}

// The generator writes this sentinel instead of an empty array. It is an answer, not a name.
const SENTINEL = 'no artist at the event';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventId = body?.event_id != null ? String(body.event_id).trim() : '';
  const eventUrl = typeof body?.event_url === 'string' ? body.event_url.trim() : '';

  const artists = (Array.isArray(body?.artists) ? body.artists : [])
    .map((a: unknown) => String(a ?? '').trim())
    .filter((a: string) => a && a.toLowerCase() !== SENTINEL);

  if (!eventId) return NextResponse.json({ok: false, error: 'event_id required'}, {status: 400});
  if (!artists.length) return NextResponse.json({ok: false, error: 'no_artists'}, {status: 400});

  const url = artistsUrl();
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) return NextResponse.json({ok: false, error: 'not_configured'}, {status: 500});

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Webhook-Secret': secret},
      body: JSON.stringify({event_id: eventId, event_url: eventUrl, artists}),
      cache: 'no-store'
    });
    if (!res.ok) {
      return NextResponse.json({ok: false, error: 'hook_failed', status: res.status}, {status: 502});
    }
    // Fire-and-forget by design: n8n answers on receipt, the sheet is the place to read results.
    return NextResponse.json({ok: true, sent: artists.length});
  } catch {
    return NextResponse.json({ok: false, error: 'hook_unreachable'}, {status: 502});
  }
}
