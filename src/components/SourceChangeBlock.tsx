'use client';

import {useState} from 'react';
import {useRouter} from '@/i18n/navigation';

type FieldChange = {old: unknown; new: unknown};
type SourceChanges = {
  venue?: FieldChange;
  city?: FieldChange;
  dates?: {old: {from: unknown; to: unknown}; new: {from: unknown; to: unknown}};
};

const val = (v: unknown): string => {
  const s = v == null ? '' : String(v).trim();
  return s || '—';
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Render a datetime as a calendar day. Meta only cares about the day, so we drop the time.
// The live GET API sends dates in LOCAL time WITHOUT a timezone (e.g. "2026-10-20 00:59:00"),
// and an event's last session can spill past midnight — that early-morning tail belongs to the
// PREVIOUS day, not a new event day. So for a TZ-less end value before 06:00 we roll the day back.
// Values that carry a timezone (baseline is stored as UTC ISO, e.g. "2026-11-09T21:59:59+00:00")
// are shown by their own day as-is. Parsed from the string directly to avoid TZ reinterpretation.
const fmtDay = (v: unknown, isEnd = false): string => {
  const s = v == null ? '' : String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}))?/);
  if (!m) return val(v);
  const hasTz = /(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(s);
  const hour = m[4] != null ? Number(m[4]) : 12;
  let dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (isEnd && !hasTz && hour < 6) dt = new Date(dt.getTime() - 86400000);
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
};

const dateRange = (d?: {from: unknown; to: unknown}): string => {
  if (!d) return '—';
  const from = fmtDay(d.from, false);
  const to = fmtDay(d.to, true);
  const parts = [from, to].filter((x) => x && x !== '—');
  if (!parts.length) return '—';
  if (from === to) return from; // single calendar day
  return parts.join(' → ');
};

function Line({label, before, after}: {label: string; before: string; after: string}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-1 text-sm">
      <span className="w-16 shrink-0 text-foreground/50">{label}</span>
      <span className="text-foreground/60 line-through break-words">{before}</span>
      <span className="text-foreground/40">→</span>
      <span className="font-medium text-foreground break-words">{after}</span>
    </div>
  );
}

export default function SourceChangeBlock({
  eventId,
  changes,
  action,
  detectedAt
}: {
  eventId: string;
  changes: SourceChanges;
  action: string;
  detectedAt: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  async function markReviewed() {
    if (busy) return;
    setBusy(true);
    const res = await fetch('/api/monitor/resolve', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: eventId})
    });
    setBusy(false);
    if (res.ok) {
      setHidden(true);
      router.refresh();
    }
  }

  const when = (() => {
    const t = new Date(detectedAt);
    return isNaN(t.getTime()) ? '' : t.toLocaleString(undefined, {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
  })();

  return (
    <section className="mt-6 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 dark:text-amber-400" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Source changed</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${action === 'regenerated' ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-foreground/10 text-foreground/60'}`}>
            {action === 'regenerated'
              ? 'sent to regenerate'
              : action === 'flagged_time_only'
              ? 'time change only - not regenerated'
              : action === 'flagged_manual'
              ? 'flagged (manual meta kept)'
              : 'flagged'}
          </span>
        </div>
        <button
          onClick={markReviewed}
          disabled={busy}
          className="rounded-full border border-black/15 dark:border-white/20 bg-card px-3 py-1 text-xs font-medium text-foreground/75 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
        >
          {busy ? '…' : 'Mark reviewed'}
        </button>
      </div>
      <div className="mt-2">
        {changes.venue && <Line label="Venue" before={val(changes.venue.old)} after={val(changes.venue.new)} />}
        {changes.city && <Line label="City" before={val(changes.city.old)} after={val(changes.city.new)} />}
        {changes.dates && <Line label="Dates" before={dateRange(changes.dates.old)} after={dateRange(changes.dates.new)} />}
      </div>
      {when && <div className="mt-1 text-xs text-foreground/45">detected {when}</div>}
    </section>
  );
}
