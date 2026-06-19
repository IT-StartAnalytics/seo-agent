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

function shapeGenerated(r: Row): GeneratedMeta {
  return {
    status: s(r, 'status'),
    published: r.published == null ? null : Boolean(r.published),
    finished_at: s(r, 'finished_at'),
    event_types: arr(r, 'event_types'),
    performers: arr(r, 'performers'),
    generated_langs: arr(r, 'generated_langs'),
    h1: {en: s(r, 'h1_en'), ru: s(r, 'h1_ru'), ar: s(r, 'h1_ar'), fr: s(r, 'h1_fr')},
    meta_title: {en: s(r, 'meta_title_en'), ru: s(r, 'meta_title_ru'), ar: s(r, 'meta_title_ar'), fr: s(r, 'meta_title_fr')},
    meta_description: {en: s(r, 'meta_desc_en'), ru: s(r, 'meta_desc_ru'), ar: s(r, 'meta_desc_ar'), fr: s(r, 'meta_desc_fr')}
  };
}

export async function getNewEvents(): Promise<NewEvent[]> {
  const cols = 'event_id,event_name_en,is_attraction,is_exclusive,city,country,venue,status,seo_done,added_at';
  const rows = await sb(`new_events_stream?select=${cols}&order=added_at.desc&limit=500`);
  return rows.map((r) => ({
    event_id: String(r.event_id),
    name: s(r, 'event_name_en'),
    is_attraction: Boolean(r.is_attraction),
    is_exclusive: Boolean(r.is_exclusive),
    city: s(r, 'city'),
    country: s(r, 'country'),
    venue: s(r, 'venue'),
    status: s(r, 'status'),
    seo_done: Boolean(r.seo_done),
    added_at: s(r, 'added_at')
  }));
}

export async function getEventById(id: string): Promise<EventDetail> {
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const [lookup, runs, stream] = await Promise.all([
    sb(`seo_event_lookup?event_id=eq.${clean}&limit=1`),
    sb(`seo_agent_runs?event_id=eq.${clean}&order=finished_at.desc&limit=1`),
    sb(`new_events_stream?event_id=eq.${clean}&limit=1`)
  ]);

  const lk = lookup[0];
  const rn = runs[0];
  const st = stream[0];

  return {
    event_id: clean,
    found: Boolean(lk || rn || st),
    source: lk
      ? {
          url: s(lk, 'url'),
          name_en: s(lk, 'event_name_en'),
          name_ar: s(lk, 'event_long_name_ar'),
          venue: s(lk, 'venue'),
          venue_ar: s(lk, 'venue_ar'),
          city: s(lk, 'city'),
          country: s(lk, 'country'),
          start: s(lk, 'event_start_datetime'),
          end: s(lk, 'event_end_datetime'),
          description: s(lk, 'overview_description_en') || s(lk, 'description_en'),
          categories: s(lk, 'all_categories'),
          status: s(lk, 'status'),
          is_title_protected: lk.is_title_protected == null ? null : Boolean(lk.is_title_protected),
          title_protection_reason: s(lk, 'title_protection_reason'),
          promo_img: s(lk, 'promo_mob_img') || s(lk, 'promo_img')
        }
      : null,
    stream: st
      ? {is_attraction: Boolean(st.is_attraction), seo_done: Boolean(st.seo_done), status: s(st, 'status')}
      : null,
    generated: rn ? shapeGenerated(rn) : null
  };
}
