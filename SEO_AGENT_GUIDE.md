# SEO Agent — Project & Dev Guide

Internal dashboard to review/edit/publish SEO meta tags for PlatinumList events.
Live site: https://seo-agent-platinum.vercel.app/

This file is the onboarding/handoff doc. Read it fully before changing anything.

---

## 1. What it is

A Next.js web app (admin dashboard) on top of an existing n8n workflow that
auto-generates SEO meta (H1 / Meta Title / Meta Description in EN/AR/RU/FR +
event types + performers) for PlatinumList events and logs runs to Supabase.

The app lets a user:
- Browse the events/attractions catalog (filters, search, sort, quick overview).
- Open an event card with: source data, indexation status, generated meta,
  live-on-site meta, and a manual editor.
- Approve (review), Regenerate (trigger n8n), and manually Edit → Save draft →
  Publish to the live site.

UI is **English only** (RU interface locale was removed).

---

## 2. Tech stack

- Next.js ^16.2.9 (App Router, Turbopack), React 19, TypeScript.
- Tailwind CSS v4 (CSS-first: `@theme inline`, `@custom-variant dark`). Theme via
  `.dark` class on <html>, default LIGHT, persisted in localStorage.
- next-intl v4 but EN-only: `routing.ts` → `locales: ['en']`, `localePrefix: 'never'`
  (URLs have NO `/en` prefix: `/`, `/events`, `/events/[id]`, `/attractions`, `/login`).
- Auth: single password (env `SITE_PASSWORD`), JWT cookie via `jose` (env `AUTH_SECRET`).
  `middleware.ts` redirects all non-login pages to `/login` when not authed.

---

## 3. Repo, folders, deploy

- GitHub repo: **IT-StartAnalytics/seo-agent** (branch `main`).
- GitHub token: in **token.txt** at the project root (do NOT delete/commit it).
- Local/working folder (mounted): `D:\Claude\SEO Agent - PlatinumList`.
- Deploy: **push to `main` → Vercel auto-deploys** (~40–60s). No manual deploy step.
- Vercel functions are pinned to region **bom1 (Mumbai)** via `vercel.json` to sit
  next to the Supabase DB (latency). Don't remove that without reason.

### Reliable build + deploy workflow in the sandbox (IMPORTANT)
The Windows mount is slow and the file-writing tools (Write/Edit) and python writes
to the mount sometimes **truncate large files** (silent corruption). Proven workflow:

1. Work in an ext4 build dir, e.g. `~/build/seo-agent` (clone or rsync the repo there).
2. Edit files there via bash (`cat > file <<'EOF' ... EOF`, or python). Avoid the
   Write/Edit tools for large files on the mount.
3. Build there: `node node_modules/next/dist/bin/next build` and confirm
   "Compiled successfully".
4. Copy changed files back to the mount with bash `cp` (bash cp to the mount is
   reliable; verify with `wc -l` build vs mount).
5. Commit & push from the build dir with the token (no git remote is saved):
   ```
   TOK=$(tr -d ' \t\r\n' < "<mount>/token.txt")
   git add -A && git commit -q -m "..."
   git push -q "https://x-access-token:$TOK@github.com/IT-StartAnalytics/seo-agent.git" HEAD:main
   ```
Always run a production build before pushing.

Path mapping (this sandbox): mount `D:\Claude\SEO Agent - PlatinumList` =
`/sessions/<id>/mnt/SEO Agent - PlatinumList/`.

---

## 4. Data sources

### Supabase — READ ONLY (shared production DB)
- Project: **kwftlkfvtglnugxsyjci** ("marketing@platinumlist.net's Project"), region ap-south-1 (Mumbai).
- Accessed from the app via **PostgREST REST API with the anon key** (env `SUPABASE_URL`, `SUPABASE_KEY`).
- HARD RULE: **never delete or modify Supabase data/tables.** Read only.
- This DB is **shared** with other services (n8n flows, monitors, hourly exports).
  It has gone down several times due to **connection exhaustion caused by OTHER
  services** (e.g. their `/api/event-monitor/check`) — NOT by this app. Our app uses
  REST (connection-light) + caching. If list/card fail with "Connection terminated
  due to connection timeout", it's the shared instance, not us. Tell the DB owners
  to check connections / restart the project.
- Tables/views the app reads: `seo_event_lookup` (view), `seo_agent_runs`,
  `new_events_stream`, `event_relational_db_all_statuses` (real table), and our own
  read-only view `seo_event_indexation` (below).

### Our custom Supabase view: `seo_event_indexation` (the ONLY object we created)
Read-only view over `event_relational_db_all_statuses`, `GRANT SELECT` to anon.
Additive, non-destructive. Exposes per event_id:
- `is_no_index`, `ru_no_index`, `fr_no_index` → indexation per language
  (indexed = flag is false; AR is tied to `is_no_index`).
- `is_attraction` → authoritative event/attraction type flag (use THIS, not the
  "attraction" keyword in categories — ~247 events were misclassified by the keyword).
- `overview_description_ar` (+ `overview_description_ru`/`_fr` as NULL placeholders).
- `meta_title_en/ar`, `meta_description_en/ar`, `live_updated_at`, `live_h1_en/ar`
  → the "Live on site" data (synced from the live site ~hourly, EN/AR only).
To add RU/FR live fields later: when those columns appear in the base table, just
recreate the view mapping them (replace the `null::text as ..._ru/_fr`).

### Neon — OUR OWN writable DB
- Client: `src/lib/db.ts` (`@neondatabase/serverless`, env `DATABASE_URL`, injected by
  the Vercel Neon integration; NOT present in local env files).
- Tables (auto-created lazily on first write, no manual migration):
  - `event_reviews` — approve/review state (src/lib/reviews.ts).
  - `meta_edits` — manual draft per (event_id, lang) (src/lib/metaEdits.ts).
  - `meta_publish_history` — log of each manual Publish (src/lib/metaEdits.ts).

---

## 5. Environment variables (set in Vercel → Project → Settings → Env)

- `SITE_PASSWORD` — login password.
- `AUTH_SECRET` — JWT signing secret.
- `SUPABASE_URL`, `SUPABASE_KEY` — Supabase REST (anon).
- `DATABASE_URL` — Neon (via Neon integration).
- `N8N_REGENERATE_URL` — n8n webhook for Regenerate (path `regenerate-seo`).
- `N8N_WEBHOOK_SECRET` — shared secret sent as header `X-Webhook-Secret` to the
  Publish webhook.
- `N8N_PUBLISH_URL` — optional; if unset it's derived from `N8N_REGENERATE_URL`
  (same host, path `/webhook/seo-agent/publish-meta`).

Secrets live only in Vercel env (and token.txt for GitHub). Do not hardcode them.

---

## 6. n8n workflow ("✅Event Analysis + API v8.0 + Supabase")

- Auto-generation: reads queue → GPT writes EN meta + translates AR/RU/FR →
  PUTs to PlatinumList API `PUT https://api.platinumlist.net/v/7/automation/event/{id}/`
  with body `{ name:{lang:..}, meta_title:{lang:..}, meta_description:{lang:..} }`
  (H1 maps to `name`) → logs to `seo_agent_runs`, marks `new_events_stream.seo_done`.
- Webhook **Regenerate** (POST `regenerate-seo`): our `/api/regenerate` calls it with `{event_id}`.
- Webhook **Publish Meta** (POST `seo-agent/publish-meta`, responseNode):
  - Checks header `x-webhook-secret` == `N8N_WEBHOOK_SECRET` (else 401).
  - Builds payload from body `{ event_id, langs:[{lang,h1,meta_title,meta_description}] }`
    (only non-empty fields → `{name, meta_title, meta_description}`), PUTs to the same
    PlatinumList API, responds `{ ok, status_code, invalid_fields }`.
- Our `/api/publish-meta` calls this webhook (adds the secret header) and, on success,
  appends a row to Neon `meta_publish_history`.

---

## 7. App structure

Data layer:
- `src/lib/events.ts` — Supabase reads + types. Key fns: `getCatalog()` (catalog,
  GET queries cached 60s via Next data cache), `getEventById(id)`, `getEventGenerated/Batch`,
  `getLatestRun`, `getEventLive(id)`, `clean()` (HTML-entity/markup cleanup).
  Types: `CatalogEvent`, `EventDetail`, `MetaVersion` (`source: 'run'|'admin'|'manual'`),
  `EventGenerated`, `EventLive`. `LANGS = ['en','ar','ru','fr']`.
  `sb(path, revalidate?)` — REST helper; pass a revalidate (sec) to cache a GET,
  otherwise it's `no-store`. Keep on-demand reads (live-meta, gen-status) uncached.
- `src/lib/metaEdits.ts` — Neon drafts + publish history.
- `src/lib/reviews.ts` — Neon review state.
- `src/lib/db.ts` — Neon client.

API routes (`src/app/api/...`):
- `auth/login`, `auth/logout` — password auth.
- `review` — set/clear approve state (Neon).
- `regenerate` — POST → N8N_REGENERATE_URL.
- `event-meta` — GET single / POST batch generated summaries for the list.
- `gen-status` — regenerate polling status (fresh).
- `live-meta` — fresh live meta + indexation from the view (Refresh button).
- `meta-edit` — GET/POST manual drafts (Neon).
- `publish-meta` — POST → n8n Publish webhook (+ logs publish history).

Pages (`src/app/[locale]/...`):
- `page.tsx` — home with Events/Attractions tiles.
- `events/page.tsx`, `attractions/page.tsx` — catalog (EventsBrowser).
- `events/[id]/page.tsx` — event card (source data + MetaTabs + manual page link).
- `events/[id]/manual/page.tsx` — manual-regenerate page (custom prompt + model; layout only, backend not wired).
- `login/page.tsx`.

Components (`src/components/...`):
- `Header`, `Logo`, `ThemeToggle`, `NavProgress` (top progress bar on navigation).
- `EventsBrowser` (list: filters/search/sort/pagination), `EventRow` (row + quick overview).
- `MetaTabs` (tabs: Live on site / Generated / Edit + history slider + Regenerate),
  `MetaHistory` (renders one meta version), `MetaEditor` (edit form + Save draft + Publish).
- `RegenerateButton`, `ReviewButtons`, `CopyButton`.

---

## 8. Event card behaviour

- Tabs order: **Live on site · Generated · Edit** (Generated open by default).
- Indexation marker (Indexed / No-index) per language, from the view.
- Type (event/attraction) from `is_attraction` flag.
- Generated tab shows a version from history; history slider (← N/total · date · source)
  combines generated runs (`seo_agent_runs`) + manual publishes (`meta_publish_history`).
  Manual entries are labelled `manual`.
- Edit tab: editable H1/Meta Title/Meta Description for EN/AR/RU/FR, prefilled
  (saved draft → latest generated → live). **Save draft** → Neon `meta_edits`.
  **Publish to site** → `/api/publish-meta` → n8n → PlatinumList API.
- Live-on-site reflects publishes after the next ~hourly sync (Refresh re-reads the view).

---

## 9. Conventions / gotchas

- Always production-build before pushing; never push a failing build.
- Keep Supabase strictly read-only; only `seo_event_indexation` is ours.
- Prefer caching/REST to protect the shared DB; do NOT add direct Postgres connections.
- Watch the mount truncation issue (section 3) — build in ext4, cp to mount, verify line counts.
- After deploy, hard-refresh (Ctrl+F5) to see changes.

---

## 10. Open TODO (not yet done)

- Edit tab: after Save draft, switching tabs and back doesn't show the new draft until
  a full page refresh — should update client state (or re-fetch) so it persists across
  tab switches without reload. Same for the history.
- History chronology: when a manual edit and a generation happen close in time, ordering
  can be wrong — sort the unified history strictly by timestamp (newest first).
- Show the history block on all tabs (in progress in MetaTabs).
- Optional: surface `invalid_fields` detail in the Publish status; warn on clearing
  required fields; show a "has draft" marker in the list.
