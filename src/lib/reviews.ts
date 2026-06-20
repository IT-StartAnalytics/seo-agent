// Review state for generated events, stored in our own Neon database (writable).
// Table is created lazily on first write, so no manual migration is needed.

export type ReviewStatus = 'approved' | 'rejected';

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists event_reviews (
      event_id   text primary key,
      status     text not null check (status in ('approved','rejected')),
      note       text,
      updated_at timestamptz not null default now()
    )
  `;
  ensured = true;
}

export async function getAllReviews(): Promise<Map<string, ReviewStatus>> {
  try {
    const sql = await getSql();
    const rows = (await sql`select event_id, status from event_reviews`) as {
      event_id: string;
      status: ReviewStatus;
    }[];
    return new Map(rows.map((r) => [String(r.event_id), r.status]));
  } catch {
    return new Map();
  }
}

export async function getReview(eventId: string): Promise<ReviewStatus | null> {
  try {
    const sql = await getSql();
    const rows = (await sql`select status from event_reviews where event_id = ${eventId} limit 1`) as {
      status: ReviewStatus;
    }[];
    return rows[0]?.status ?? null;
  } catch {
    return null;
  }
}

export async function setReview(
  eventId: string,
  status: ReviewStatus | null,
  note?: string | null
): Promise<void> {
  await ensureTable();
  const sql = await getSql();
  if (status === null) {
    await sql`delete from event_reviews where event_id = ${eventId}`;
    return;
  }
  await sql`
    insert into event_reviews (event_id, status, note, updated_at)
    values (${eventId}, ${status}, ${note ?? null}, now())
    on conflict (event_id) do update
      set status = excluded.status, note = excluded.note, updated_at = now()
  `;
}
