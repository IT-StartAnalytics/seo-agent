// Read-only access to PlatinumList artists in Supabase (table: pl_artists).
// Real data lives here (the separate `artists` pipeline table is still empty).
// Languages with data: EN/AR (TR is a placeholder). Meta = title + keywords + bio.
// Artist pages are global (https, no city subdomain), so the url is used as-is.

type Row = Record<string, unknown>;

function sbKey(): string {
  return (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '').trim();
}

async function sbArt(path: string, revalidate?: number): Promise<Row[]> {
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
const num = (r: Row, k: string) => (r[k] == null ? null : Number(r[k]));

function clean(v: string | null): string | null {
  if (v == null) return null;
  const out = v.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return out.length ? out : null;
}

export type ArtistMeta = {
  lang: string;
  meta_title: string | null;
  meta_keywords: string | null;
  bio: string | null;
};

export type CatalogArtist = {
  artist_id: string;
  name: string | null;
  url: string | null;
  event_count: number | null;
  ticket_count: number | null;
  has_meta_en: boolean;
  has_meta_ar: boolean;
};

export type ArtistDetail = {
  artist_id: string;
  found: boolean;
  name: string | null;
  url: string | null;
  event_count: number | null;
  ticket_count: number | null;
  meta: ArtistMeta[]; // only languages that actually have content
};

const LIST_COLS =
  'artist_id,artist_name,url,event_count_per_artist,ticket_count,meta_title_en,meta_title_ar';

export async function getArtists(): Promise<CatalogArtist[]> {
  // Full catalog (~4.2k). Page through in 1000-row chunks.
  const offsets = [0, 1000, 2000, 3000, 4000];
  const pages = await Promise.all(
    offsets.map((off) =>
      sbArt(
        `pl_artists?select=${LIST_COLS}&order=event_count_per_artist.desc.nullslast&limit=1000&offset=${off}`,
        60
      )
    )
  );
  return pages.flat().map((r) => ({
    artist_id: String(r.artist_id),
    name: clean(s(r, 'artist_name')),
    url: s(r, 'url'),
    event_count: num(r, 'event_count_per_artist'),
    ticket_count: num(r, 'ticket_count'),
    has_meta_en: !!s(r, 'meta_title_en'),
    has_meta_ar: !!s(r, 'meta_title_ar')
  }));
}

const LANG_FIELDS: {lang: string; mt: string; kw: string; bio: string | null}[] = [
  {lang: 'en', mt: 'meta_title_en', kw: 'meta_keywords_en', bio: 'artist_bio_en'},
  {lang: 'ar', mt: 'meta_title_ar', kw: 'meta_keywords_ar', bio: 'artist_bio_ar'},
  {lang: 'tr', mt: 'meta_title_tr', kw: 'meta_keywords_tr', bio: null}
];

export async function getArtistById(id: string): Promise<ArtistDetail> {
  const aid = String(id).replace(/[^0-9]/g, '');
  const empty: ArtistDetail = {
    artist_id: String(id),
    found: false,
    name: null,
    url: null,
    event_count: null,
    ticket_count: null,
    meta: []
  };
  if (!aid) return empty;
  const cols =
    'artist_id,artist_name,url,event_count_per_artist,ticket_count,' +
    'meta_title_en,meta_title_ar,meta_title_tr,meta_keywords_en,meta_keywords_ar,meta_keywords_tr,' +
    'artist_bio_en,artist_bio_ar';
  const rows = await sbArt(`pl_artists?select=${cols}&artist_id=eq.${aid}&limit=1`);
  const r = rows[0];
  if (!r) return empty;

  const meta: ArtistMeta[] = LANG_FIELDS.map((l) => ({
    lang: l.lang,
    meta_title: clean(s(r, l.mt)),
    meta_keywords: clean(s(r, l.kw)),
    bio: l.bio ? clean(s(r, l.bio)) : null
  })).filter((m) => m.meta_title || m.meta_keywords || m.bio);

  return {
    artist_id: String(r.artist_id),
    found: true,
    name: clean(s(r, 'artist_name')),
    url: s(r, 'url'),
    event_count: num(r, 'event_count_per_artist'),
    ticket_count: num(r, 'ticket_count'),
    meta
  };
}
