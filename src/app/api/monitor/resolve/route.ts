import {NextRequest, NextResponse} from 'next/server';
import {resolveChanges} from '@/lib/monitor';

export const dynamic = 'force-dynamic';

// POST /api/monitor/resolve  { event_id }
// Marks the event's source-change flags as reviewed (clears the catalog marker).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventId = String(body?.event_id ?? '').trim();
  if (!eventId) return NextResponse.json({ok: false, error: 'event_id required'}, {status: 400});
  await resolveChanges(eventId).catch(() => {});
  return NextResponse.json({ok: true});
}
