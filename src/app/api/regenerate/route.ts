import {NextRequest, NextResponse} from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventId = body?.event_id;
  if (!eventId) {
    return NextResponse.json({error: 'event_id required'}, {status: 400});
  }

  const hook = process.env.N8N_REGENERATE_URL;
  if (!hook) {
    return NextResponse.json({error: 'not_configured'}, {status: 500});
  }

  try {
    const res = await fetch(hook, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: String(eventId)})
    });
    if (!res.ok) {
      return NextResponse.json({error: 'hook_failed', status: res.status}, {status: 502});
    }
    return NextResponse.json({ok: true});
  } catch {
    return NextResponse.json({error: 'hook_unreachable'}, {status: 502});
  }
}
