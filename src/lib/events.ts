// Read-only access to the SEO automation data in Supabase.
//   new_events_stream  - incoming events (is_attraction, seo_done flag)
//   seo_event_lookup   - full source data for any event (search by id)
//   seo_agent_runs     - generated H1 / meta tags (multi-language)

export type Lang = 'en' | 'ru' | 'ar' | 'fr';
export const LANGS: Lang[] = ['en', 'ru', 'ar', 'fr'];

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

export type EventDetail = {
  event_id: string;
  found: boolean;
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
    categories: string | null;
    status: string | null;
    is_title_protected: boolean | null;
    title_protection_reason: string | null;
    promo_img: string | null;
    friendly_url: string | null;
  } | null;
  admin: {
    h1: Record<'en' | 'ar', string | null>;
    meta_title: Record<'en' | 'ar', string | null>;
    meta_description: Record<'en' | 'ar', string | null>;
  } | null;
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

const s = (r: Row, k: string) => (r[k] == null ? null : String(r[k]));
const arr = (r: Row, k: string) => (Array.isArray(r[k]) ? (r[k] as string[]) : null);

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ldquo: '\u201C', rdquo: '\u201D', lsquo: '\u2018', rsquo: '\u2019',
  laquo: '\u00AB', raquo: '\u00BB', ndash: '\u2013', mdash: '\u2014',
  hellip: '\u2026', copy: '\u00A9', reg: '\u00AE', trade: '\u2122',
  deg: '\u00B0', euro: '\u20AC', pound: '\u00A3', middot: '\u00B7', times: '\u00D7'
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-zA-Z]+);/g, (_m, n) => NAMED[n] ?? `&${n};`);
}

// Strip HTML tags and decode entities for clean display.
function clean(value: string | null): string | null {
  if (value == null) return null;
  const noTags = value
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '');
  const out = decodeEntities(noTags).replace(/\s+/g, ' ').trim();
  return out.length ? out : null;
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

  const [lookup, runs, stream] = await Promise.all([
    sb(`seo_event_lookup?select=${lookupCols}&event_id=eq.${eid}&limit=1`),
    sb(`seo_agent_runs?select=${runsCols}&event_id=eq.${eid}&order=finished_at.desc&limit=1`),
    sb(`new_events_stream?select=${streamCols}&event_id=eq.${eid}&limit=1`)
  ]);

  const lk = lookup[0];
  const rn = runs[0];
  const st = stream[0];

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

  const admin = rp
    ? {
        h1: {en: clean(rs('event_name_en') ?? rs('event_long_name_en')), ar: clean(rs('event_name_ar') ?? rs('event_long_name_ar'))},
        meta_title: {en: clean(rs('meta_title_en')), ar: clean(rs('meta_title_ar'))},
        meta_description: {en: clean(rs('meta_description_en')), ar: clean(rs('meta_description_ar'))}
      }
    : null;
  const hasAdmin =
    admin &&
    (admin.h1.en || admin.h1.ar || admin.meta_title.en || admin.meta_title.ar || admin.meta_description.en || admin.meta_description.ar);

  return {
    event_id: eid,
    found: Boolean(lk || rn || st),
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
    admin: hasAdmin ? admin : null
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
    sb('new_events_stream?select=event_id&limit=1000')
  ]);

  const newSet = new Set(streamRows.map((r) => String(r.event_id)));
  const rows = pages.flat();

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
      url: s(r, 'url')
    };
  });
}
