// DataForSEO geo/language reference lists, proxied through n8n and cached in Neon.
// The endpoints are free (cost: 0) but the lists are large, so we cache them.
// Table is created lazily on first use (no manual migration).

export type GeoItem = {
  location_code: number;
  location_name: string;
  location_type?: string | null;
  country_iso_code?: string | null;
};

export type LangItem = {language_code: string; language_name: string};

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists dfs_geo_cache (
      cache_key  text primary key,
      payload    jsonb not null,
      fetched_at timestamptz not null default now()
    )
  `;
  ensured = true;
}

// n8n reference webhook. Configure N8N_DF_GEO_URL, or it is derived from
// N8N_REGENERATE_URL (same host, path /webhook/seo-agent/df-geo).
function hookUrl(): string | null {
  if (process.env.N8N_DF_GEO_URL) return process.env.N8N_DF_GEO_URL;
  const regen = process.env.N8N_REGENERATE_URL;
  if (regen && regen.includes('/webhook/')) {
    return regen.replace(/(\/webhook\/).*/, '$1seo-agent/df-geo');
  }
  return null;
}

async function fetchFromN8n(body: Record<string, unknown>): Promise<unknown[]> {
  const url = hookUrl();
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) return [];
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Webhook-Secret': secret},
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const items = (data as {items?: unknown}).items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function readCache(key: string): Promise<unknown[] | null> {
  try {
    await ensureTable();
    const sql = await getSql();
    const rows = (await sql`
      select payload, fetched_at from dfs_geo_cache where cache_key = ${key} limit 1
    `) as {payload: unknown; fetched_at: string}[];
    const row = rows[0];
    if (!row) return null;
    if (Date.now() - new Date(row.fetched_at).getTime() > TTL_MS) return null;
    return Array.isArray(row.payload) ? (row.payload as unknown[]) : null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, payload: unknown[]): Promise<void> {
  try {
    await ensureTable();
    const sql = await getSql();
    await sql`
      insert into dfs_geo_cache (cache_key, payload, fetched_at)
      values (${key}, ${JSON.stringify(payload)}::jsonb, now())
      on conflict (cache_key) do update
        set payload = excluded.payload, fetched_at = now()
    `;
  } catch {
    /* cache is best-effort */
  }
}

// Cached loader: serve from Neon, refresh from n8n when missing or stale.
async function cached(key: string, body: Record<string, unknown>): Promise<unknown[]> {
  const hit = await readCache(key);
  if (hit && hit.length) return hit;
  const fresh = await fetchFromN8n(body);
  if (fresh.length) await writeCache(key, fresh);
  return fresh;
}

export async function getCountries(): Promise<GeoItem[]> {
  return (await cached('countries', {kind: 'countries'})) as GeoItem[];
}

export async function getLanguages(): Promise<LangItem[]> {
  return (await cached('languages', {kind: 'languages'})) as LangItem[];
}

// Full (type-filtered) list for one country, cached. Search happens server-side.
export async function getLocations(countryIso: string): Promise<GeoItem[]> {
  const iso = String(countryIso || '').trim().toUpperCase();
  if (!iso) return [];
  return (await cached(`locations:${iso}`, {kind: 'locations', country_iso: iso})) as GeoItem[];
}

// Server-side typeahead over the cached list (the browser never receives the whole country).
export async function searchLocations(countryIso: string, q: string, limit = 50): Promise<GeoItem[]> {
  const all = await getLocations(countryIso);
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return all.slice(0, limit);
  const starts: GeoItem[] = [];
  const contains: GeoItem[] = [];
  for (const it of all) {
    const name = String(it.location_name || '').toLowerCase();
    if (name.startsWith(needle)) starts.push(it);
    else if (name.includes(needle)) contains.push(it);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}
