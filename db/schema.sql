-- SEO Agent — schema (Neon Postgres)
create extension if not exists "pgcrypto";

create table if not exists pages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null,
  locale           text not null check (locale in ('en','ru')),
  meta_title       text,
  meta_description text,
  og_title         text,
  og_description   text,
  og_image         text,
  canonical_url    text,
  h1               text,
  body             text,
  status           text not null default 'draft' check (status in ('draft','published')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (slug, locale)
);

create index if not exists pages_status_locale_idx on pages (status, locale);

-- auto-update updated_at on change
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists pages_set_updated_at on pages;
create trigger pages_set_updated_at
  before update on pages
  for each row execute function set_updated_at();
