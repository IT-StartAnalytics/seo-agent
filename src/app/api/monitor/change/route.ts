import {NextRequest, NextResponse} from 'next/server';
import {applyChangeToBaseline, latestManualPublishAt, recordChange, type SourceChanges} from '@/lib/monitor';

export const dynamic = 'force-dynamic';

// Calendar-date part (YYYY-MM-DD) of a datetime string, ignoring the time-of-day.
function datePart(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // "2026-07-24T22:30..." or "2026-07-24 22:30..."
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}

// True only when the calendar DATE changed (a pure time-of-day shift returns false).
function dateChangedInDates(changes: SourceChanges): boolean {
  const d = changes.dates;
  if (!d) return false;
  const o = d.old || ({} as {from?: unknown; to?: unknown});
  const n = d.new || ({} as {from?: unknown; to?: unknown});
  return datePart(o.from) !== datePart(n.from) || datePart(o.to) !== datePart(n.to);
}

// POST /api/monitor/change  { event_id, changes:{venue?,city?,dates?} }
// Records the before/after, decides whether to auto-regenerate, moves the baseline to
// the new values, and returns { regenerate, action }.
//
// Regenerate rule:
//   - Regenerate when Venue OR City OR the calendar DATE changed.
//   - A Dates change that only shifts the TIME (same day) is flagged, NOT regenerated.
//   - A fresh manual publish also blocks regeneration (don't overwrite hand-edited meta).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventId = String(body?.event_id ?? '').trim();
  const changes = body?.changes && typeof body.changes === 'object' ? (body.changes as SourceChanges) : null;
  if (!eventId || !changes || Object.keys(changes).length === 0) {
    return NextResponse.json({ok: false, regenerate: false, error: 'bad_request'}, {status: 400});
  }

  const hasVenue = !!changes.venue;
  const hasCity = !!changes.city;
  const dateChanged = dateChangedInDates(changes);
  const timeOnly = !!changes.dates && !dateChanged; // dates present but only time moved
  const material = hasVenue || hasCity || dateChanged;

  const protectDays = Number(process.env.MONITOR_MANUAL_PROTECT_DAYS || 30);
  const manualAt = await latestManualPublishAt(eventId).catch(() => null);
  const freshManual = manualAt ? Date.now() - Date.parse(manualAt) < protectDays * 86400000 : false;

  let regenerate: boolean;
  let action: string;
  if (!material) {
    // Only a time-of-day shift (no venue/city/date change) -> flag, keep meta.
    regenerate = false;
    action = 'flagged_time_only';
  } else if (freshManual) {
    regenerate = false;
    action = 'flagged_manual';
  } else {
    regenerate = true;
    action = 'regenerated';
  }

  await recordChange(eventId, changes, action).catch(() => {});
  await applyChangeToBaseline(eventId, changes).catch(() => {});

  return NextResponse.json({ok: true, regenerate, action, time_only: timeOnly});
}
