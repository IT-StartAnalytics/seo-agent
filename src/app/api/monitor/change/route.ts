import {NextRequest, NextResponse} from 'next/server';
import {applyChangeToBaseline, latestManualPublishAt, recordChange, type SourceChanges} from '@/lib/monitor';

export const dynamic = 'force-dynamic';

// POST /api/monitor/change  { event_id, changes:{venue?,city?,dates?} }
// Records the before/after, decides whether to auto-regenerate (skipped when a fresh
// manual publish exists — don't overwrite deliberate hand-edited meta), moves the
// baseline to the new values, and returns { regenerate }.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventId = String(body?.event_id ?? '').trim();
  const changes = body?.changes && typeof body.changes === 'object' ? (body.changes as SourceChanges) : null;
  if (!eventId || !changes || Object.keys(changes).length === 0) {
    return NextResponse.json({ok: false, regenerate: false, error: 'bad_request'}, {status: 400});
  }

  const protectDays = Number(process.env.MONITOR_MANUAL_PROTECT_DAYS || 30);
  const manualAt = await latestManualPublishAt(eventId).catch(() => null);
  const freshManual = manualAt ? Date.now() - Date.parse(manualAt) < protectDays * 86400000 : false;
  const regenerate = !freshManual;
  const action = regenerate ? 'regenerated' : 'flagged';

  await recordChange(eventId, changes, action).catch(() => {});
  await applyChangeToBaseline(eventId, changes).catch(() => {});

  return NextResponse.json({ok: true, regenerate, action});
}
