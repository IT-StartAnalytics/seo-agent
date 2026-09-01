import {NextRequest, NextResponse} from 'next/server';
import {getEventIndexBatch} from '@/lib/events';

// Per-page indexation for the events list. The browser posts the event_ids currently shown
// (and, in the background, the rest) so the Index column and the no-index filter cover every
// event regardless of the catalog's capped bulk load.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  try {
    return NextResponse.json(await getEventIndexBatch(ids));
  } catch (e) {
    console.error('event-index batch error', e);
    return NextResponse.json({error: 'failed'}, {status: 500});
  }
}
