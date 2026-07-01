import {NextResponse} from 'next/server';
import {getMonitorSourceEvents} from '@/lib/events';
import {listBaseline, seedBaseline} from '@/lib/monitor';

export const dynamic = 'force-dynamic';

// GET /api/monitor/list
// Returns the baseline (last-known Venue/City/Dates) for on-sale + generated events.
// Seeds a baseline for any such event we don't track yet (first-seen = current values).
export async function GET() {
  try {
    const src = await getMonitorSourceEvents();
    await seedBaseline(src).catch(() => {});
    const base = await listBaseline();
    const srcIds = new Set(src.map((e) => e.event_id));
    // Only loop events still on-sale + generated; off-sale/removed drop out (baseline row stays).
    const rows = base
      .filter((b) => srcIds.has(b.event_id))
      .map((b) => ({
        event_id: b.event_id,
        venue: b.venue ?? '',
        city: b.city ?? '',
        date_from: b.date_from ?? '',
        date_to: b.date_to ?? '',
        language: 'en'
      }));
    return NextResponse.json(rows);
  } catch {
    // Never break the monitor loop — return an empty list on any failure.
    return NextResponse.json([]);
  }
}
