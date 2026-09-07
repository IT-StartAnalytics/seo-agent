// Fresh event source data from the PlatinumList Metabase saved question (card), bypassing the
// ~3h Supabase mirror delay. Read-only and best-effort: any failure -> null, so callers always
// fall back to Supabase. Disabled (returns null) when METABASE_API_KEY is not configured.
//
// Env:
//   METABASE_API_KEY            - required to enable; the `x-api-key` value (kept only in env)
//   METABASE_URL                - default https://platinumlist.metabaseapp.com
//   METABASE_CARD_ID            - default 38017 (parameterized by event_id)
//   METABASE_EVENT_ID_TAG       - default event_id (template-tag name)
//   METABASE_EVENT_ID_PARAM_ID  - default 8cfc2bd3-2653-4545-850c-1776aca3b7b4 (field-filter uuid)

export type MetabaseEvent = {
  event_id: string;
  url: string | null;
  event_name_en: string | null;
  event_name_ar: string | null;
  venue: string | null;
  venue_ar: string | null;
  city: string | null;
  event_start_datetime: string | null;
  event_end_datetime: string | null;
  overview_description_en: string | null;
  description_en: string | null;
  all_categories: string | null;
  promo_mob_img: string | null;
  promo_img: string | null;
};

const FIELDS = [
  'url', 'event_name_en', 'event_name_ar', 'venue', 'venue_ar', 'city',
  'event_start_datetime', 'event_end_datetime', 'overview_description_en', 'description_en',
  'all_categories', 'promo_mob_img', 'promo_img'
] as const;

function cfg() {
  const key = (process.env.METABASE_API_KEY || '').trim();
  if (!key) return null;
  // Ignore a misconfigured METABASE_URL (e.g. a card id pasted into it) and fall back to the
  // default host, so a bad env value can't produce an unparseable request URL.
  let base = (process.env.METABASE_URL || '').trim();
  if (!/^https?:\/\//i.test(base)) base = 'https://platinumlist.metabaseapp.com';
  base = base.replace(/\/+$/, '');
  const card = (process.env.METABASE_CARD_ID || '38017').trim();
  const tag = (process.env.METABASE_EVENT_ID_TAG || 'event_id').trim();
  const paramId = (process.env.METABASE_EVENT_ID_PARAM_ID || '8cfc2bd3-2653-4545-850c-1776aca3b7b4').trim();
  return {key, base, card, tag, paramId};
}

export function metabaseEnabled(): boolean {
  return cfg() !== null;
}

// Result wrapper so the UI can show WHY Metabase data is missing (env not set, HTTP error, empty,
// id mismatch, exception) instead of a silent blank.
export type MetabaseResult = {status: string; event: MetabaseEvent | null};

export async function getMetabaseEventResult(id: string): Promise<MetabaseResult> {
  const c = cfg();
  const eid = String(id).replace(/[^0-9]/g, '');
  if (!c) return {status: 'disabled (no METABASE_API_KEY)', event: null};
  if (!eid) return {status: 'bad id', event: null};

  // Same field-filter shape proven in the n8n flow (card 38017).
  const parameters = [
    {id: c.paramId, type: 'id', target: ['dimension', ['template-tag', c.tag]], value: [Number(eid)]}
  ];

  try {
    const res = await fetch(`${c.base}/api/card/${c.card}/query`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'x-api-key': c.key},
      body: JSON.stringify({parameters}),
      cache: 'no-store'
    });
    if (!res.ok) return {status: `http ${res.status}`, event: null};
    const j = (await res.json().catch(() => null)) as
      | {data?: {cols?: {name: string}[]; rows?: unknown[][]}}
      | null;
    const cols = j?.data?.cols ?? [];
    const rows = j?.data?.rows ?? [];
    if (!cols.length || !rows.length) return {status: 'empty (no rows)', event: null};

    const at: Record<string, number> = {};
    cols.forEach((col, i) => {
      at[col.name] = i;
    });
    const row = rows[0];
    const get = (k: string): string | null => {
      const i = at[k];
      if (i == null) return null;
      const v = row[i];
      return v == null ? null : String(v);
    };

    // Guard against a wrong/blank row: the returned event_id must match the one we asked for.
    const rid = get('event_id');
    if (rid == null || String(rid).replace(/[^0-9]/g, '') !== eid) {
      return {status: `id mismatch (got ${rid ?? 'null'})`, event: null};
    }

    const out = {event_id: eid} as MetabaseEvent;
    for (const f of FIELDS) (out as Record<string, string | null>)[f] = get(f);
    return {status: 'ok', event: out};
  } catch (e) {
    return {status: 'error: ' + String((e as Error)?.message || e).slice(0, 80), event: null};
  }
}

export async function getMetabaseEvent(id: string): Promise<MetabaseEvent | null> {
  return (await getMetabaseEventResult(id)).event;
}
