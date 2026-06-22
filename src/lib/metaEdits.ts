// Editable meta tags drafted in our own Neon database (writable).
// Table is created lazily on first write.

export type MetaEdit = {
  lang: string;
  h1: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists meta_edits (
      event_id         text not null,
      lang             text not null,
      h1               text,
      meta_title       text,
      meta_description text,
      updated_at       timestamptz not null default now(),
      primary key (event_id, lang)
    )
  `;
  ensured = true;
}

export async function getMetaEdits(eventId: string): Promise<Record<string, MetaEdit>> {
  try {
    const sql = await getSql();
    const rows = (await sql`
      select lang, h1, meta_title, meta_description
      from meta_edits where event_id = ${eventId}
    `) as MetaEdit[];
    const out: Record<string, MetaEdit> = {};
    for (const r of rows) out[r.lang] = r;
    return out;
  } catch {
    return {};
  }
}

export async function setMetaEdits(eventId: string, edits: MetaEdit[]): Promise<void> {
  await ensureTable();
  const sql = await getSql();
  for (const e of edits) {
    await sql`
      insert into meta_edits (event_id, lang, h1, meta_title, meta_description, updated_at)
      values (${eventId}, ${e.lang}, ${e.h1 ?? null}, ${e.meta_title ?? null}, ${e.meta_description ?? null}, now())
      on conflict (event_id, lang) do update
        set h1 = excluded.h1,
            meta_title = excluded.meta_title,
            meta_description = excluded.meta_description,
            updated_at = now()
    `;
  }
}

let ensuredHist = false;
async function ensureHistTable() {
  if (ensuredHist) return;
  const sql = await getSql();
  await sql`
    create table if not exists meta_publish_history (
      id         bigserial primary key,
      event_id   text not null,
      langs      jsonb not null,
      created_at timestamptz not null default now()
    )
  `;
  ensuredHist = true;
}

export async function addPublishHistory(eventId: string, langs: MetaEdit[]): Promise<void> {
  await ensureHistTable();
  const sql = await getSql();
  await sql`insert into meta_publish_history (event_id, langs) values (${eventId}, ${JSON.stringify(langs)}::jsonb)`;
}

export type PublishHistoryRow = {created_at: string; langs: MetaEdit[]};

export async function getPublishHistory(eventId: string): Promise<PublishHistoryRow[]> {
  try {
    const sql = await getSql();
    const rows = (await sql`
      select langs, created_at from meta_publish_history
      where event_id = ${eventId} order by created_at desc limit 30
    `) as {langs: MetaEdit[]; created_at: string}[];
    return rows.map((r) => ({created_at: String(r.created_at), langs: r.langs || []}));
  } catch {
    return [];
  }
}

// Latest manual publish per event (for a batch of ids) — used so the catalog list
// can show the newest version by chronology, including manual edits.
export async function getLatestPublishBatch(
  ids: string[]
): Promise<Record<string, PublishHistoryRow>> {
  const clean = ids.map(String).filter(Boolean);
  if (!clean.length) return {};
  try {
    const sql = await getSql();
    const rows = (await sql`
      select distinct on (event_id) event_id, langs, created_at
      from meta_publish_history
      where event_id = any(${clean})
      order by event_id, created_at desc
    `) as {event_id: string; langs: MetaEdit[]; created_at: string}[];
    const out: Record<string, PublishHistoryRow> = {};
    for (const r of rows) out[String(r.event_id)] = {created_at: String(r.created_at), langs: r.langs || []};
    return out;
  } catch {
    return {};
  }
}
