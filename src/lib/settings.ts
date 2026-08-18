// Small key/value app settings in our own Neon DB (writable). Lazy-created.
// Currently holds the active content-generation model, chosen in the UI and read by n8n.

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

// Models the operator may pick for generation. Order = display order; first = default.
// Keep in sync with the pricing table in aiUsage.ts (used for cost). buildBody in n8n adapts
// automatically: gpt-5.6* -> reasoning + prompt cache; older models -> temperature, no cache.
export const ALLOWED_MODELS: {id: string; label: string; note: string}[] = [
  {id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', note: 'reasoning + prompt cache; best quality'},
  {id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', note: 'fast, cheap, no reasoning'},
  {id: 'gpt-4.1', label: 'GPT-4.1', note: 'stronger than mini, pricier'},
  {id: 'gpt-4o', label: 'GPT-4o', note: 'legacy flagship'},
  {id: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'cheapest legacy'}
];
export const DEFAULT_MODEL = ALLOWED_MODELS[0].id;

const KEY_MODEL = 'generation_model';

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists app_settings (
      key        text primary key,
      value      text not null,
      updated_at timestamptz not null default now()
    )
  `;
  ensured = true;
}

export function isAllowedModel(m: unknown): boolean {
  return typeof m === 'string' && ALLOWED_MODELS.some((x) => x.id === m);
}

export async function getGenerationModel(): Promise<string> {
  try {
    await ensureTable();
    const sql = await getSql();
    const rows = (await sql`select value from app_settings where key = ${KEY_MODEL}`) as {value: string}[];
    const v = rows[0]?.value;
    return isAllowedModel(v) ? (v as string) : DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export async function setGenerationModel(model: string): Promise<void> {
  if (!isAllowedModel(model)) throw new Error('model not allowed');
  await ensureTable();
  const sql = await getSql();
  await sql`
    insert into app_settings (key, value, updated_at)
    values (${KEY_MODEL}, ${model}, now())
    on conflict (key) do update set value = ${model}, updated_at = now()
  `;
}
