// Read-only access to the SEO automation data in Supabase.
//   new_events_stream  - incoming events (is_attraction, seo_done flag)
//   seo_event_lookup   - full source data for any event (search by id)
//   seo_agent_runs     - generated H1 / meta tags (multi-language)

import {getAllReviews, getReview, type ReviewStatus} from './reviews';

export type Lang = 'en' | 'ru' | 'ar' | 'fr';
export const LANGS: Lang[] = ['en', 'ar', 'ru', 'fr'];

export type NewEvent = {
  event_id: string;
  name: string | null;
  is_attraction: boolean;
  is_exclusive: boolean;
  city: string | null;
  country: string | null;
  venue: string | null;
  status: string | null;
  seo_done: boolean;
  added_at: string | null;
};

export type GeneratedMeta = {
  status: string | null;
  published: boolean | null;
  finished_at: string | null;
  event_types: string[] | null;
  performers: string[] | null;
  generated_langs: string[] | null;
  h1: Record<Lang, string | null>;
  meta_title: Record<Lang, string | null>;
  meta_description: Record<Lang, string | null>;
};

export type MetaVersion = {
  date: string | null;
  status: string | null;
  source: 'run' | 'admin';
  langs: {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null}[];
  event_types: string[];
  performers: string[];
};

export type EventDetail = {
  event_id: string;
  found: boolean;
  is_attraction: boolean;
  review: ReviewStatus | null;
  history: MetaVersion[];
  source: {
    url: string | null;
    name_en: string | null;
    name_ar: string | null;
    venue: string | null;
    venue_ar: string | null;
    city: string | null;
    country: string | null;
    start: string | null;
    end: string | null;
    description: string | null;
    overview_en: string | null;
    overview_ar: string | null;
    description_en: string | null;
    description_ar: string | null;
    categories: string | null;
    status: string | null;
    is_title_protected: boolean | null;
    title_protection_reason: string | null;
    promo_img: string | null;
    friendly_url: string | null;
  } | null;
  indexed: {en: boolean; ar: boolean; ru: boolean; fr: boolean} | null;
  admin:
    | {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null}[]
    | null;
  stream: {is_attraction: boolean; seo_done: boolean; status: string | null} | null;
  generated: GeneratedMeta | null;
};

type Row = Record<string, unknown>;

async function sb(path: string): Promise<Row[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_KEY is not set');
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {apikey: key, Authorization: `Bearer ${key}`},
    cache: 'no-store'
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status} on ${path} :: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as Row[];
}

async function sbRpc<T>(fn: string, body: unknown): Promise<T> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_KEY is not set');
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(body),
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`Supabase rpc ${fn} failed: ${res.status}`);
  return (await res.json()) as T;
}

const s = (r: Row, k: string) => (r[k] == null ? null : String(r[k]));
const arr = (r: Row, k: string) => (Array.isArray(r[k]) ? (r[k] as string[]) : null);

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ldquo: '\u201C', rdquo: '\u201D', lsquo: '\u2018', rsquo: '\u2019',
  laquo: '\u00AB', raquo: '\u00BB', ndash: '\u2013', mdash: '\u2014',
  hellip: '\u2026', copy: '\u00A9', reg: '\u00AE', trade: '\u2122',
  deg: '\u00B0', euro: '\u20AC', pound: '\u00A3', middot: '\u00B7', times: '\u00D7',
  bull: '\u2022', sbquo: '\u201A', bdquo: '\u201E', dagger: '\u2020', Dagger: '\u2021',
  prime: '\u2032', Prime: '\u2033', frasl: '\u2044', minus: '\u2212', emsp: ' ', ensp: ' ', thinsp: ' ', shy: ''
};

function decodeEntities(input: string): string {
  let prev = input;
  for (let i = 0; i < 5; i++) {
    const out = prev
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (_m, n) => NAMED[n] ?? `&${n};`);
    if (out === prev) return out;
    prev = out;
  }
  return prev;
}

// Strip HTML tags and decode entities for clean display.
function clean(value: string | null): string | null {
  if (value == null) return null;
  const noTags = value
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '');
  let out = decodeEntities(noTags).replace(/\s+/g, ' ').trim();
  // Source data sometimes truncates long fields mid-HTML-entity (e.g. "...Man,&rdqu").
  // Only then strip the dangling fragment and mark the cut with an ellipsis.
  // Normal text (incl. a final period) is left untouched.
  const frag = out.match(/&#?[a-zA-Z0-9]+$/);
  if (frag) {
    out = out.slice(0, out.length - frag[0].length).replace(/[\s,;:.\-]+$/, '') + '…';
  }
  if (!out.length || /^(null|undefined)$/i.test(out)) return null;
  return out;
}

// cleaned string getter
const cs = (r: Row, k: string) => clean(s(r, k));

function originFromUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    return new URL(u).origin;
  } catch {
    return null;
  }
}

function citySubdomain(city: string | null): string | null {
  if (!city) return null;
  return city.trim().toLowerCase().replace(/\s+/g, '-');
}

function shapeGenerated(r: Row): GeneratedMeta {
  return {
    status: s(r, 'status'),
    published: r.published == null ? null : Boolean(r.published),
    finished_at: s(r, 'finished_at'),
    event_types: arr(r, 'event_types'),
    performers: arr(r, 'performers'),
    generated_langs: arr(r, 'generated_langs'),
    h1: {en: cs(r, 'h1_en'), ru: cs(r, 'h1_ru'), ar: cs(r, 'h1_ar'), fr: cs(r, 'h1_fr')},
    meta_title: {en: cs(r, 'meta_title_en'), ru: cs(r, 'meta_title_ru'), ar: cs(r, 'meta_title_ar'), fr: cs(r, 'meta_title_fr')},
    meta_description: {en: cs(r, 'meta_desc_en'), ru: cs(r, 'meta_desc_ru'), ar: cs(r, 'meta_desc_ar'), fr: cs(r, 'meta_desc_fr')}
  };
}

export async function getNewEvents(): Promise<NewEvent[]> {
  const cols = 'event_id,event_name_en,is_attraction,is_exclusive,city,country,venue,status,seo_done,added_at';
  const rows = await sb(`new_events_stream?select=${cols}&order=added_at.desc&limit=500`);
  return rows.map((r) => ({
    event_id: String(r.event_id),
    name: cs(r, 'event_name_en'),
    is_attraction: Boolean(r.is_attraction),
    is_exclusive: Boolean(r.is_exclusive),
    city: s(r, 'city'),
    country: s(r, 'country'),
    venue: cs(r, 'venue'),
    status: s(r, 'status'),
    seo_done: Boolean(r.seo_done),
    added_at: s(r, 'added_at')
  }));
}

export async function getEventById(id: string): Promise<EventDetail> {
  const eid = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const lookupCols =
    'event_id,url,event_name_en,event_long_name_ar,venue,venue_ar,city,country,' +
    'event_start_datetime,event_end_datetime,description_en,overview_description_en,' +
    'all_categories,status,content_hash,is_title_protected,title_protection_reason,' +
    'promo_mob_img,promo_img';
  const runsCols =
    'event_id,status,published,finished_at,event_types,performers,generated_langs,' +
    'h1_en,meta_title_en,meta_desc_en,h1_ru,meta_title_ru,meta_desc_ru,' +
    'h1_ar,meta_title_ar,meta_desc_ar,h1_fr,meta_title_fr,meta_desc_fr';
  const streamCols = 'event_id,is_attraction,seo_done,status,raw_payload';

  const [lookup, runs, stream, idx] = await Promise.all([
    sb(`seo_event_lookup?select=${lookupCols}&event_id=eq.${eid}&limit=1`),
    sb(`seo_agent_runs?select=${runsCols}&event_id=eq.${eid}&meta_title_en=not.is.null&order=finished_at.desc&limit=20`),
    sb(`new_events_stream?select=${streamCols}&event_id=eq.${eid}&limit=1`),
    sb(`seo_event_indexation?select=event_id,is_no_index,ru_no_index,fr_no_index,overview_description_ar,description_ar&event_id=eq.${eid}&limit=1`).catch(() => [])
  ]);

  const lk = lookup[0];
  const META_KEYS = [
    'h1_en', 'meta_title_en', 'meta_desc_en',
    'h1_ar', 'meta_title_ar', 'meta_desc_ar',
    'h1_ru', 'meta_title_ru', 'meta_desc_ru',
    'h1_fr', 'meta_title_fr', 'meta_desc_fr'
  ];
  const hasContent = (r: Row) => META_KEYS.some((k) => r[k] != null && String(r[k]).trim() !== '');
  const rn = runs.find(hasContent) ?? null;
  const st = stream[0];
  const ix = idx[0];
  const indexed = ix
    ? {en: !ix.is_no_index, ar: !ix.is_no_index, ru: !ix.ru_no_index, fr: !ix.fr_no_index}
    : null;
  const ovAr = ix && ix.overview_description_ar != null ? clean(String(ix.overview_description_ar)) : null;
  const dscAr = ix && ix.description_ar != null ? clean(String(ix.description_ar)) : null;

  const rp =
    st && typeof st.raw_payload === 'object' && st.raw_payload
      ? (st.raw_payload as Record<string, unknown>)
      : null;
  const rs = (k: string) => (rp && rp[k] != null ? String(rp[k]) : null);

  const urlVal = (lk ? s(lk, 'url') : null) ?? rs('url');
  const cityVal = (lk ? s(lk, 'city') : null) ?? rs('city');
  const rawFriendly = rs('friendly_url'); // admin ЧПУ slug (preferred when present)
  const sub = citySubdomain(cityVal);
  const origin = originFromUrl(urlVal) ?? (sub ? `https://${sub}.platinumlist.net` : null);
  // Friendly URL strictly from the admin `friendly_url` field (it may differ from the
  // URL slug, so we never derive it from the URL). Null when not present in data.
  const friendly = rawFriendly
    ? (/^https?:\/\//i.test(rawFriendly)
        ? rawFriendly
        : origin
        ? `${origin}/event-tickets/${rawFriendly}`
        : null)
    : null;

  const META_LANG_RE = /^(?:meta_title|meta_description|event_name|event_long_name)_([a-z]{2})$/;
  const adminLangs = new Set<string>();
  if (rp) {
    for (const k of Object.keys(rp)) {
      const m = k.match(META_LANG_RE);
      if (m) adminLangs.add(m[1]);
    }
  }
  const langPref = ['en', 'ar', 'ru', 'fr'];
  const admin =
    adminLangs.size > 0
      ? Array.from(adminLangs)
          .sort((a, b) => {
            const ia = langPref.indexOf(a);
            const ib = langPref.indexOf(b);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
          })
          .map((l) => ({
            lang: l,
            h1: clean(rs(`event_name_${l}`) ?? rs(`event_long_name_${l}`)),
            meta_title: clean(rs(`meta_title_${l}`)),
            meta_description: clean(rs(`meta_description_${l}`))
          }))
      : null;
  const review = await getReview(eid);
  const catsLk = (lk ? (s(lk, 'all_categories') ?? '') : '').toLowerCase();
  const isAttraction = lk ? catsLk.includes('attraction') : st ? Boolean(st.is_attraction) : false;

  const runVersions: MetaVersion[] = runs
    .map((r) => ({
      date: s(r, 'finished_at'),
      status: s(r, 'status'),
      source: 'run' as const,
      langs: LANGS.map((l) => ({
        lang: l as string,
        h1: cs(r, `h1_${l}`),
        meta_title: cs(r, `meta_title_${l}`),
        meta_description: cs(r, `meta_desc_${l}`)
      })).filter((x) => x.h1 || x.meta_title || x.meta_description),
      event_types: arr(r, 'event_types') ?? [],
      performers: arr(r, 'performers') ?? []
    }))
    .filter((v) => v.langs.length > 0);
  const history: MetaVersion[] = [...runVersions];
  if (admin && admin.length > 0) {
    history.push({date: null, status: null, source: 'admin', langs: admin, event_types: [], performers: []});
  }

  return {
    event_id: eid,
    found: Boolean(lk || rn || st),
    is_attraction: isAttraction,
    review,
    indexed,
    history,
    source: lk
      ? {
          url: s(lk, 'url'),
          name_en: cs(lk, 'event_name_en'),
          name_ar: cs(lk, 'event_long_name_ar'),
          venue: cs(lk, 'venue'),
          venue_ar: cs(lk, 'venue_ar'),
          city: s(lk, 'city'),
          country: s(lk, 'country'),
          start: s(lk, 'event_start_datetime'),
          end: s(lk, 'event_end_datetime'),
          description: cs(lk, 'overview_description_en') || cs(lk, 'description_en'),
          overview_en: cs(lk, 'overview_description_en'),
          overview_ar: ovAr,
          description_en: cs(lk, 'description_en'),
          description_ar: dscAr,
          categories: cs(lk, 'all_categories'),
          status: s(lk, 'status'),
          is_title_protected: lk.is_title_protected == null ? null : Boolean(lk.is_title_protected),
          title_protection_reason: cs(lk, 'title_protection_reason'),
          promo_img: s(lk, 'promo_mob_img') || s(lk, 'promo_img'),
          friendly_url: friendly
        }
      : null,
    stream: st
      ? {is_attraction: Boolean(st.is_attraction), seo_done: Boolean(st.seo_done), status: s(st, 'status')}
      : null,
    generated: rn ? shapeGenerated(rn) : null,
    admin: admin
  };
}

// ---- Full catalog dashboard ----------------------------------------------

export type CatalogEvent = {
  event_id: string;
  name: string | null;
  city: string | null;
  country: string | null;
  status: string | null;
  is_attraction: boolean;
  is_new: boolean;
  is_generated: boolean;
  gen_date: string | null;
  review: ReviewStatus | null;
  url: string | null;
};

export async function getCatalog(): Promise<CatalogEvent[]> {
  const cols = 'event_id,event_name_en,city,country,status,all_categories,url';
  // Supabase caps responses at ~1000 rows; page through the catalog.
  const offsets = [0, 1000, 2000];
  const [pages, streamRows] = await Promise.all([
    Promise.all(
      offsets.map((off) =>
        sb(`seo_event_lookup?select=${cols}&order=event_start_datetime.desc.nullslast&limit=1000&offset=${off}`)
      )
    ),
    sb('new_events_stream?select=event_id,seo_done&limit=1000')
  ]);

  const newSet = new Set(
    streamRows.filter((r) => r.seo_done !== true).map((r) => String(r.event_id))
  );
  const rows = pages.flat();
  const ids = rows.map((r) => String(r.event_id));

  const genMap = new Map<string, string>();
  try {
    const gen = await sbRpc<{event_id: string; finished_at: string}[]>('generated_event_dates', {p_ids: ids});
    for (const r of gen ?? []) genMap.set(String(r.event_id), r.finished_at);
  } catch {
    // if the RPC fails, fall back to "none generated" rather than breaking the page
  }

  const reviews = await getAllReviews();

  return rows.map((r) => {
    const cats = (s(r, 'all_categories') ?? '').toLowerCase();
    return {
      event_id: String(r.event_id),
      name: cs(r, 'event_name_en'),
      city: cs(r, 'city'),
      country: cs(r, 'country'),
      status: s(r, 'status'),
      is_attraction: cats.includes('attraction'),
      is_new: newSet.has(String(r.event_id)),
      is_generated: genMap.has(String(r.event_id)),
      gen_date: genMap.get(String(r.event_id)) ?? null,
      review: reviews.get(String(r.event_id)) ?? null,
      url: s(r, 'url')
    };
  });
}


// ---- Quick overview (lazy, for the list) ---------------------------------

export type EventGenerated = {
  status: string | null;
  finished_at: string | null;
  generated_langs: string[];
  published_langs: string[];
  unpublished_langs: string[];
  api_status_code: number | null;
  api_status_msg: string | null;
  langs: {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null}[];
  event_types: string[];
  performers: string[];
};

const GEN_COLS = [
  'status', 'finished_at', 'event_types', 'performers',
  'generated_langs', 'published_langs', 'unpublished_langs',
  'api_status_code', 'api_status_msg',
  'h1_en', 'meta_title_en', 'meta_desc_en',
  'h1_ar', 'meta_title_ar', 'meta_desc_ar',
  'h1_ru', 'meta_title_ru', 'meta_desc_ru',
  'h1_fr', 'meta_title_fr', 'meta_desc_fr'
].join(',');

function shapeGenRow(r: Row): EventGenerated {
  const langs = LANGS.map((l) => ({
    lang: l as string,
    h1: cs(r, `h1_${l}`),
    meta_title: cs(r, `meta_title_${l}`),
    meta_description: cs(r, `meta_desc_${l}`)
  })).filter((x) => x.h1 || x.meta_title || x.meta_description);
  return {
    status: s(r, 'status'),
    finished_at: s(r, 'finished_at'),
    generated_langs: arr(r, 'generated_langs') ?? [],
    published_langs: arr(r, 'published_langs') ?? [],
    unpublished_langs: arr(r, 'unpublished_langs') ?? [],
    api_status_code: r.api_status_code == null ? null : Number(r.api_status_code),
    api_status_msg: s(r, 'api_status_msg'),
    langs,
    event_types: arr(r, 'event_types') ?? [],
    performers: arr(r, 'performers') ?? []
  };
}

export async function getEventGenerated(id: string): Promise<EventGenerated | null> {
  const eid = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const runs = await sb(
    `seo_agent_runs?select=event_id,${GEN_COLS}&event_id=eq.${eid}&meta_title_en=not.is.null&order=finished_at.desc&limit=1`
  );
  return runs[0] ? shapeGenRow(runs[0]) : null;
}

export async function getEventGeneratedBatch(
  ids: string[]
): Promise<Record<string, EventGenerated>> {
  const clean = ids.map((x) => String(x).replace(/[^a-zA-Z0-9_-]/g, '')).filter(Boolean);
  if (!clean.length) return {};
  const rows = await sb(
    `seo_agent_runs?select=event_id,${GEN_COLS}&event_id=in.(${clean.join(',')})&meta_title_en=not.is.null&order=finished_at.desc&limit=3000`
  );
  const out: Record<string, EventGenerated> = {};
  for (const r of rows) {
    const id = String(r.event_id);
    if (out[id]) continue; // rows ordered desc -> first seen is latest
    out[id] = shapeGenRow(r);
  }
  return out;
}

// ---- Generation run status (for the regenerate button) -------------------

export type RunStatus = {
  status: string | null;
  finished_at: string | null;
  api_status_code: number | null;
  api_status_msg: string | null;
};

export async function getLatestRun(id: string): Promise<RunStatus | null> {
  const eid = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const rows = await sb(
    `seo_agent_runs?select=status,finished_at,api_status_code,api_status_msg&event_id=eq.${eid}&order=finished_at.desc.nullslast&limit=1`
  );
  const r = rows[0];
  if (!r) return null;
  return {
    status: s(r, 'status'),
    finished_at: s(r, 'finished_at'),
    api_status_code: r.api_status_code == null ? null : Number(r.api_status_code),
    api_status_msg: s(r, 'api_status_msg')
  };
}
