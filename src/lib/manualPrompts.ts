// Reusable custom prompts for the Manual regenerate page (saved in our Neon DB).
// Table is created lazily on first write.

export type ManualPrompt = {id: number; name: string; prompt: string; created_at: string};

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists manual_prompts (
      id         bigserial primary key,
      name       text not null,
      prompt     text not null,
      created_at timestamptz not null default now()
    )
  `;
  ensured = true;
}

export async function listManualPrompts(): Promise<ManualPrompt[]> {
  try {
    await ensureTable();
    const sql = await getSql();
    const rows = (await sql`
      select id, name, prompt, created_at
      from manual_prompts order by created_at desc limit 200
    `) as {id: number | string; name: string; prompt: string; created_at: string}[];
    return rows.map((r) => ({id: Number(r.id), name: String(r.name), prompt: String(r.prompt), created_at: String(r.created_at)}));
  } catch {
    return [];
  }
}

export async function addManualPrompt(name: string, prompt: string): Promise<ManualPrompt | null> {
  const n = String(name || '').trim();
  const p = String(prompt || '').trim();
  if (!n || !p) return null;
  await ensureTable();
  const sql = await getSql();
  const rows = (await sql`
    insert into manual_prompts (name, prompt) values (${n}, ${p})
    returning id, name, prompt, created_at
  `) as {id: number | string; name: string; prompt: string; created_at: string}[];
  const r = rows[0];
  return r ? {id: Number(r.id), name: String(r.name), prompt: String(r.prompt), created_at: String(r.created_at)} : null;
}

export async function deleteManualPrompt(id: number): Promise<void> {
  if (!Number.isFinite(id)) return;
  await ensureTable();
  const sql = await getSql();
  await sql`delete from manual_prompts where id = ${id}`;
}
