// Source-change monitor state, stored in our own Neon DB (writable).
// Tables are created lazily on first use.
//
// monitor_baseline  - last-known Venue/City/Dates per event (the reference the n8n
//                     monitor compares the current Supabase snapshot against).
// monitor_changes   - detected changes (before/after), whether we re-generated or
//                     only flagged, and whether a human has reviewed it.

export type BaselineRow = {
  event_id: string;
  venue: string | null;
  city: string | null;
  date_from: string | null;
  date_to: string | null;
};

export type FieldChange = {old: unknown; new: unknown};
export type SourceChanges = {
  venue?: FieldChange;
  city?: FieldChange;
  dates?: {old: {from: unknown; to: unknown}; new: {from: unknown; to: unknown}};
};

export type ChangeRow = {
  event_id: string;
  changes: SourceChanges;
  action: string; // 'regenerated' | 'flagged'
  resolved: boolean;
  detected_at: string;
};

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

let ensured = false;
async function ensureTables() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists monitor_baseline (
      event_id   text primary key,
      venue      text,
      city       text,
      date_from  text,
      date_to    text,
      updated_at timestamptz not null default now()
    )
  `;
  await sql`
    create table if not exists monitor_changes (
      id          bigserial primary key,
      event_id    text not null,
      changes     jsonb not null,
      action      text not null,
      resolved    boolean not null default false,
      detected_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists monitor_changes_event_idx on monitor_changes (event_id, detected_at desc)`;
  ensured = true;
}

// Return every baseline row we track.
export async function listBaseline(): Promise<BaselineRow[]> {
  try {
    await ensureTables();
    const sql = await getSql();
    const rows = (await sql`
      select event_id, venue, city, date_from, date_to from monitor_baseline
    `) as BaselineRow[];
    return rows.map((r) => ({...r, event_id: String(r.event_id)}));
  } catch {
    return [];
  }
}

// Insert baselines for events we don't track yet (first-seen = current values).
// Never overwrites an existing baseline (that holds the known/reference state).
export async function seedBaseline(rows: BaselineRow[]): Promise<void> {
  const clean = rows.filter((r) => r && r.event_id);
  if (!clean.length) return;
  await ensureTables();
  const sql = await getSql();
  for (const r of clean) {
    await sql`
      insert into monitor_baseline (event_id, venue, city, date_from, date_to, updated_at)
      values (${String(r.event_id)}, ${r.venue ?? ''}, ${r.city ?? ''}, ${r.date_from ?? ''}, ${r.date_to ?? ''}, now())
      on conflict (event_id) do nothing
    `;
  }
}

// After a change is acknowledged, move the baseline to the new values so we don't
// re-alert on the same change next hour.
export async function applyChangeToBaseline(eventId: string, changes: SourceChanges): Promise<void> {
  await ensureTables();
  const sql = await getSql();
  const cur = (await sql`select venue, city, date_from, date_to from monitor_baseline where event_id = ${eventId}`) as BaselineRow[];
  const c = cur[0] || ({} as BaselineRow);
  const venue = changes.venue && 'new' in changes.venue ? String(changes.venue.new ?? '') : c.venue ?? '';
  const city = changes.city && 'new' in changes.city ? String(changes.city.new ?? '') : c.city ?? '';
  const date_from = changes.dates?.new ? String(changes.dates.new.from ?? '') : c.date_from ?? '';
  const date_to = changes.dates?.new ? String(changes.dates.new.to ?? '') : c.date_to ?? '';
  await sql`
    insert into monitor_baseline (event_id, venue, city, date_from, date_to, updated_at)
    values (${eventId}, ${venue}, ${city}, ${date_from}, ${date_to}, now())
    on conflict (event_id) do update
      set venue = excluded.venue, city = excluded.city,
          date_from = excluded.date_from, date_to = excluded.date_to, updated_at = now()
  `;
}

export async function recordChange(eventId: string, changes: SourceChanges, action: string): Promise<void> {
  await ensureTables();
  const sql = await getSql();
  await sql`
    insert into monitor_changes (event_id, changes, action)
    values (${eventId}, ${JSON.stringify(changes)}::jsonb, ${action})
  `;
}

// Newest unresolved change per event (for the "Source changed" catalog filter).
export async function getUnresolvedChangeIds(): Promise<string[]> {
  try {
    await ensureTables();
    const sql = await getSql();
    const rows = (await sql`
      select distinct event_id from monitor_changes where resolved = false
    `) as {event_id: string}[];
    return rows.map((r) => String(r.event_id));
  } catch {
    return [];
  }
}

// Latest unresolved change for one event (for the before/after block on the card).
export async function getLatestUnresolvedChange(eventId: string): Promise<ChangeRow | null> {
  try {
    await ensureTables();
    const sql = await getSql();
    const rows = (await sql`
      select event_id, changes, action, resolved, detected_at
      from monitor_changes
      where event_id = ${eventId} and resolved = false
      order by detected_at desc limit 1
    `) as ChangeRow[];
    const r = rows[0];
    if (!r) return null;
    return {
      event_id: String(r.event_id),
      changes: (r.changes || {}) as SourceChanges,
      action: String(r.action),
      resolved: Boolean(r.resolved),
      detected_at: String(r.detected_at)
    };
  } catch {
    return null;
  }
}

export async function resolveChanges(eventId: string): Promise<void> {
  await ensureTables();
  const sql = await getSql();
  await sql`update monitor_changes set resolved = true where event_id = ${eventId} and resolved = false`;
}

// Timestamp of the most recent manual publish for an event (Neon meta_publish_history),
// used to protect fresh hand-edited meta from auto-regeneration.
export async function latestManualPublishAt(eventId: string): Promise<string | null> {
  try {
    const sql = await getSql();
    const rows = (await sql`
      select created_at from meta_publish_history
      where event_id = ${eventId} order by created_at desc limit 1
    `) as {created_at: string}[];
    return rows[0] ? String(rows[0].created_at) : null;
  } catch {
    return null;
  }
}
