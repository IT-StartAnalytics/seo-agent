import {sql} from './db';

export type Page = {
  id: string;
  slug: string;
  locale: string;
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  h1: string | null;
  body: string | null;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
};

export async function getPublishedPages(locale: string): Promise<Page[]> {
  return (await sql`
    select * from pages
    where locale = ${locale} and status = 'published'
    order by updated_at desc
  `) as Page[];
}

export async function getPageBySlug(
  slug: string,
  locale: string
): Promise<Page | null> {
  const rows = (await sql`
    select * from pages
    where slug = ${slug} and locale = ${locale}
    limit 1
  `) as Page[];
  return rows[0] ?? null;
}

export async function countPages(): Promise<number> {
  const rows = (await sql`select count(*)::int as n from pages`) as {n: number}[];
  return rows[0]?.n ?? 0;
}
