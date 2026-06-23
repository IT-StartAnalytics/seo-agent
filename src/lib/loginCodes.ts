// One-time email login codes, stored in our Neon DB. Table created lazily.

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists login_codes (
      email      text primary key,
      code_hash  text not null,
      expires_at timestamptz not null,
      attempts   int not null default 0,
      created_at timestamptz not null default now()
    )
  `;
  ensured = true;
}

export async function setLoginCode(email: string, codeHash: string, expiresAtISO: string): Promise<void> {
  await ensureTable();
  const sql = await getSql();
  await sql`
    insert into login_codes (email, code_hash, expires_at, attempts, created_at)
    values (${email}, ${codeHash}, ${expiresAtISO}, 0, now())
    on conflict (email) do update
      set code_hash = excluded.code_hash,
          expires_at = excluded.expires_at,
          attempts = 0,
          created_at = now()
  `;
}

export type LoginCodeRow = {code_hash: string; expires_at: string; attempts: number};

export async function getLoginCode(email: string): Promise<LoginCodeRow | null> {
  try {
    await ensureTable();
    const sql = await getSql();
    const rows = (await sql`
      select code_hash, expires_at, attempts from login_codes where email = ${email}
    `) as {code_hash: string; expires_at: string; attempts: number | string}[];
    const r = rows[0];
    return r ? {code_hash: String(r.code_hash), expires_at: String(r.expires_at), attempts: Number(r.attempts)} : null;
  } catch {
    return null;
  }
}

export async function bumpAttempts(email: string): Promise<void> {
  try {
    const sql = await getSql();
    await sql`update login_codes set attempts = attempts + 1 where email = ${email}`;
  } catch {
    // ignore
  }
}

export async function clearLoginCode(email: string): Promise<void> {
  try {
    const sql = await getSql();
    await sql`delete from login_codes where email = ${email}`;
  } catch {
    // ignore
  }
}
