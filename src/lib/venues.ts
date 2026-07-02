// Read-only access to PlatinumList venues in Supabase (table: pl_venues).
// We surface PUBLISHED venues only (is_published = 1). EN/AR meta + content.
// Self-contained, connection-light cached REST (mirrors the categories module).

type Row = Record<string, unknown>;

function sbKey(): string {
  return (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '').trim();
}

async function sbVen(path: string, revalidate?: number): Promise<Row[]> {
  const url = process.env.SUPABASE_URL;
  const key = sbKey();
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE service key is not set');
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {apikey: key, Authorization: `Bearer ${key}`},
    ...(revalidate != null ? {next: {revalidate}} : {cache: 'no-store'})
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status} on ${path} :: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as Row[];
}

const s = (r: Row, k: string) => (r[k] == null ? null : String(r[k]));

function clean(v: string | null): string | null {
  if (v == null) return null;
  const out = v.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return out.length ? out : null;
}

// pl_venues.url lacks the scheme and, for multi-word cities, has a SPACE in the
// subdomain (e.g. "abu dhabi.platinumlist.net/..."). Fix both so links work.
function normalizeVenueUrl(raw: string | null): string | null {
  if (!raw) return null;
  let u = raw.trim().replace(/\s+/g, '-');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

const num = (r: Row, k: string) => (r[k] == null ? null : Number(r[k]));

export type VenueMeta = {
  lang: string;
  meta_title: string | null;
  meta_description: string | null;
  info: string | null;
  how_to_get_there: string | null;
};

export type CatalogVenue = {
  venue_id: string;
  name: string | null;
  name_ar: string | null;
  city: string | null;
  country: string | null;
  url: string | null;
  upcoming_event_count: number | null;
  events_count: number | null;
  has_meta_en: boolean;
  has_meta_ar: boolean;
};

export type VenueDetail = {
  venue_id: string;
  found: boolean;
  name: string | null;
  name_ar: string | null;
  city: string | null;
  country: string | null;
  url: string | null;
  is_published: boolean;
  upcoming_event_count: number | null;
  events_count: number | null;
  last_event_datetime: string | null;
  meta: VenueMeta[]; // only languages that actually have content
};

const LIST_COLS =
  'venue_id,venue_name_en,venue_name_ar,city,country,url,upcoming_event_count,events_count,meta_title_en,meta_title_ar';

export async function getVenues(): Promise<CatalogVenue[]> {
  // Published venues only (~2k). Page through in 1000-row chunks.
  const offsets = [0, 1000, 2000];
  const pages = await Promise.all(
    offsets.map((off) =>
      sbVen(
        `pl_venues?select=${LIST_COLS}&is_published=eq.1&order=upcoming_event_count.desc.nullslast&limit=1000&offset=${off}`,
        60
      )
    )
  );
  return pages.flat().map((r) => ({
    venue_id: String(r.venue_id),
    name: clean(s(r, 'venue_name_en')),
    name_ar: clean(s(r, 'venue_name_ar')),
    city: clean(s(r, 'city')),
    country: clean(s(r, 'country')),
    url: normalizeVenueUrl(s(r, 'url')),
    upcoming_event_count: num(r, 'upcoming_event_count'),
    events_count: num(r, 'events_count'),
    has_meta_en: !!s(r, 'meta_title_en'),
    has_meta_ar: !!s(r, 'meta_title_ar')
  }));
}

const LANG_FIELDS: {lang: string; mt: string; md: string; info: string; htgt: string}[] = [
  {lang: 'en', mt: 'meta_title_en', md: 'meta_description_en', info: 'info_en', htgt: 'how_to_get_there_en'},
  {lang: 'ar', mt: 'meta_title_ar', md: 'meta_description_ar', info: 'info_ar', htgt: 'how_to_get_there_ar'}
];

export async function getVenueById(id: string): Promise<VenueDetail> {
  const vid = String(id).replace(/[^0-9]/g, '');
  const empty: VenueDetail = {
    venue_id: String(id),
    found: false,
    name: null,
    name_ar: null,
    city: null,
    country: null,
    url: null,
    is_published: false,
    upcoming_event_count: null,
    events_count: null,
    last_event_datetime: null,
    meta: []
  };
  if (!vid) return empty;
  const cols =
    'venue_id,venue_name_en,venue_name_ar,city,country,url,is_published,upcoming_event_count,events_count,' +
    'last_event_datetime,meta_title_en,meta_title_ar,meta_description_en,meta_description_ar,' +
    'info_en,info_ar,how_to_get_there_en,how_to_get_there_ar';
  const rows = await sbVen(`pl_venues?select=${cols}&venue_id=eq.${vid}&limit=1`);
  const r = rows[0];
  if (!r) return empty;

  const meta: VenueMeta[] = LANG_FIELDS.map((l) => ({
    lang: l.lang,
    meta_title: clean(s(r, l.mt)),
    meta_description: clean(s(r, l.md)),
    info: clean(s(r, l.info)),
    how_to_get_there: clean(s(r, l.htgt))
  })).filter((m) => m.meta_title || m.meta_description || m.info || m.how_to_get_there);

  return {
    venue_id: String(r.venue_id),
    found: true,
    name: clean(s(r, 'venue_name_en')),
    name_ar: clean(s(r, 'venue_name_ar')),
    city: clean(s(r, 'city')),
    country: clean(s(r, 'country')),
    url: normalizeVenueUrl(s(r, 'url')),
    is_published: Number(r.is_published) === 1,
    upcoming_event_count: num(r, 'upcoming_event_count'),
    events_count: num(r, 'events_count'),
    last_event_datetime: s(r, 'last_event_datetime'),
    meta
  };
}
