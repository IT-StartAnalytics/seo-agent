// Read-only access to PlatinumList content categories (Event types) in Supabase.
// Source table: content_categories (EN/AR meta; AR currently empty/placeholder).
// Self-contained REST helper (mirrors the pattern in events.ts) so we never touch
// the shared DB with anything but connection-light cached GETs.

import {parseCities} from './categoryUrl';

type Row = Record<string, unknown>;

function sbKey(): string {
  return (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '').trim();
}

async function sbCat(path: string, revalidate?: number): Promise<Row[]> {
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

// Light cleanup: strip stray HTML tags and collapse whitespace. Category meta uses
// {city}/{year} placeholders (not HTML), so those are preserved.
function clean(v: string | null): string | null {
  if (v == null) return null;
  const out = v.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return out.length ? out : null;
}

export type CategoryMeta = {
  lang: string;
  meta_title: string | null;
  meta_description: string | null;
  text: string | null;
};

export type CatalogCategory = {
  category_id: string;
  name: string | null;
  url: string | null;
  is_attraction: boolean;
  is_active: boolean;
  events_total: number | null;
  active_events: number | null;
  cities: string[];
  has_meta_en: boolean;
  has_meta_ar: boolean;
};

export type CategoryDetail = {
  category_id: string;
  found: boolean;
  name: string | null;
  url: string | null;
  is_attraction: boolean;
  is_active: boolean;
  linked_cities: string | null;
  cities: string[];
  events_total: number | null;
  active_events: number | null;
  event_names: string | null;
  meta: CategoryMeta[]; // only languages that actually have content
};

const LIST_COLS =
  'category_id,name_en,url,is_attraction,is_active,events_total,active_events,linked_cities,meta_title_en,meta_title_ar';

export async function getCategories(): Promise<CatalogCategory[]> {
  const rows = await sbCat(
    `content_categories?select=${LIST_COLS}&order=events_total.desc.nullslast&limit=1000`,
    60
  );
  return rows.map((r) => ({
    category_id: String(r.category_id),
    name: clean(s(r, 'name_en')),
    url: s(r, 'url'),
    is_attraction: Boolean(r.is_attraction),
    is_active: Boolean(r.is_active),
    events_total: r.events_total == null ? null : Number(r.events_total),
    active_events: r.active_events == null ? null : Number(r.active_events),
    cities: parseCities(s(r, 'linked_cities')),
    has_meta_en: !!s(r, 'meta_title_en'),
    has_meta_ar: !!s(r, 'meta_title_ar')
  }));
}

const LANG_FIELDS: {lang: string; mt: string; md: string; tx: string}[] = [
  {lang: 'en', mt: 'meta_title_en', md: 'meta_description_en', tx: 'text_en'},
  {lang: 'ar', mt: 'meta_title_ar', md: 'meta_description_ar', tx: 'text_ar'}
];

export async function getCategoryById(id: string): Promise<CategoryDetail> {
  const cid = String(id).replace(/[^0-9]/g, '');
  const empty: CategoryDetail = {
    category_id: String(id),
    found: false,
    name: null,
    url: null,
    is_attraction: false,
    is_active: false,
    linked_cities: null,
    cities: [],
    events_total: null,
    active_events: null,
    event_names: null,
    meta: []
  };
  if (!cid) return empty;
  const cols =
    'category_id,name_en,url,is_attraction,is_active,linked_cities,events_total,active_events,' +
    'event_names,meta_title_en,meta_title_ar,meta_description_en,meta_description_ar,text_en,text_ar';
  const rows = await sbCat(`content_categories?select=${cols}&category_id=eq.${cid}&limit=1`);
  const r = rows[0];
  if (!r) return empty;

  const meta: CategoryMeta[] = LANG_FIELDS.map((l) => ({
    lang: l.lang,
    meta_title: clean(s(r, l.mt)),
    meta_description: clean(s(r, l.md)),
    text: clean(s(r, l.tx))
  })).filter((m) => m.meta_title || m.meta_description || m.text);

  const names = clean(s(r, 'event_names'));
  return {
    category_id: String(r.category_id),
    found: true,
    name: clean(s(r, 'name_en')),
    url: s(r, 'url'),
    is_attraction: Boolean(r.is_attraction),
    is_active: Boolean(r.is_active),
    linked_cities: clean(s(r, 'linked_cities')),
    cities: parseCities(s(r, 'linked_cities')),
    events_total: r.events_total == null ? null : Number(r.events_total),
    active_events: r.active_events == null ? null : Number(r.active_events),
    event_names: names ? (names.length > 800 ? names.slice(0, 800) + '…' : names) : null,
    meta
  };
}
