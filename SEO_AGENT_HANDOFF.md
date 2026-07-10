# SEO Agent — Handoff to a new sandbox (current state)

Read this together with **AGENTS.md** (auto-loaded project instructions) and **SEO_AGENT_GUIDE.md**.
AGENTS.md holds the base architecture + working method; THIS file is the up-to-date delta on top
of it (everything built after the original guide, incl. the Source Monitor).

Live: https://seo-agent-platinum.vercel.app/ · Repo: `IT-StartAnalytics/seo-agent` (branch `main`)
Folder: `D:\Claude\SEO Agent - PlatinumList` · GitHub token: `token.txt` (repo root).

---

## 0. How to start in the new sandbox
This project has run across several sandboxes: **"SEO Agent website setup" -> "SEO Agent project"
-> "SEO Agent project Part 2" -> (now) "SEO Agent project Part 3"**. The source of truth is NOT the
sandbox but the mounted folder `D:\Claude\SEO Agent - PlatinumList` + the GitHub repo; read the docs
there.

Open a new session with the same folder and say:
> «Продолжаем проект SEO Agent (часть 3). Открой папку D:\Claude\SEO Agent - PlatinumList,
> прочитай AGENTS.md, SEO_AGENT_HANDOFF.md и SEO_AGENT_GUIDE.md, работай по описанному методу.
> Пиши на русском.»

First actions in the new sandbox: read AGENTS.md + this file + SEO_AGENT_GUIDE.md; `git clone`/rsync
the repo into `~/build/seo-agent` and `npm install`; confirm `git rev-parse HEAD` matches the live repo.

Working method (from AGENTS.md, do exactly this):
1. Clarify scope, create a task list.
2. Edit in ext4 build dir `~/build/seo-agent` (clone from GitHub or reuse), NOT on the mount
   (mount truncates large files). Write via bash heredoc / python.
3. `node node_modules/next/dist/bin/next build` → must print "Compiled successfully" (a pre-existing
   Edge/`crypto` warning from `src/lib/auth.ts` is harmless; EXIT must be 0).
4. `cp` changed files build→mount (verify `wc -l`), then commit & push to `main` with the token:
   `git config user.email/user.name` once, then
   `git push "https://x-access-token:$TOK@github.com/IT-StartAnalytics/seo-agent.git" HEAD:main`.
   Vercel auto-deploys ~40–60s; tell user Ctrl+F5.
5. One change → build → push → confirm. Communicate in Russian.

Hard rules: Supabase is READ-ONLY (only our view `seo_event_indexation` is ours). Never hardcode
secrets. Keep the app connection-light (REST + caching).

---

## 1. What's been added since the original guide (this is the current app)

### Auth — email OTP (replaced the single password)
- Flow: user enters email → `/api/auth/request-code` (generates 6-digit code, stores hash in Neon
  `login_codes`, calls n8n `seo-agent/login-code` webhook which emails it) → user enters code →
  `/api/auth/verify-code` (checks hash+TTL, sets JWT cookie via `jose`).
- `src/lib/auth.ts`: `allowedEmails()` (env `LOGIN_ALLOWED_EMAILS`, default seo@platinumlist.net),
  `normalizeEmail`, `isEmailAllowed`, `hashCode` (sha256 + AUTH_SECRET pepper), `generateCode`,
  `createSessionToken(email?)`. `src/lib/loginCodes.ts` = Neon `login_codes`.
- Old `/api/auth/login` was removed.

### Manual regenerate + prompt library
- Page `/events/[id]/manual` (`ManualRegenerate.tsx`) → `/api/manual-generate` → n8n
  `seo-agent/manual-generate` webhook: custom free prompt + chosen model + chosen langs → returns a
  PREVIEW (no publish, no DB write) → "Use in Edit" pushes result to the Edit tab via sessionStorage
  + `#edit`.
- Models: GPT-4.1, GPT-4.1 mini, GPT-4o, GPT-4o mini, GPT-5 mini, GPT-5.2 mini, GPT-5.4 mini.
- Prompt library: `/api/manual-prompts` GET/POST/DELETE, Neon `manual_prompts` (save/reuse/delete).

### Event card / history
- Edit tab edits ANY selected history version (the slider drives the prefill; shown on Edit too).
  Prefill priority: saved draft → selected version → live.
- Manual versions inherit event_types/performers from the latest run (Categories/Performers don't
  vanish on a manual version).
- Source data shows Venue (EN, always, "—" when empty) + Venue (AR).

### Catalog
- Live queue count (from `seo_events_queue`) shown; "In queue" lives inside the Processing filter.
- Filter logic: AND across groups (proc vs status), OR within a group.

### Security / data
- `sbKey()` prefers `SUPABASE_SERVICE_KEY`, falls back to `SUPABASE_KEY` (survives RLS lockdown).
- New DB columns adopted: AR indexation from `ar_no_index` (independent of EN); RU/FR overview
  descriptions now mapped in our view `seo_event_indexation` (were NULL placeholders).

---

## 2. Source Monitor (the main feature built here)

Purpose: managers often CLONE an old event instead of creating a new one, or edit Venue/City/Dates
after generation. The monitor catches real Venue/City/Dates changes and re-generates meta.

### App side (this repo)
- `src/lib/monitor.ts` (Neon, lazy tables):
  - `monitor_baseline` (event_id pk, venue, city, date_from, date_to) — last-known reference.
  - `monitor_changes` (event_id, changes jsonb, action, resolved, detected_at) — audit log.
  - Helpers: `listBaseline`, `seedBaseline` (insert missing only), `applyChangeToBaseline`,
    `recordChange`, `getUnresolvedChangeIds`, `getLatestUnresolvedChange`, `resolveChanges`,
    `latestManualPublishAt`.
- `src/lib/events.ts` → `getMonitorSourceEvents()`: on-sale + generated events with RAW
  venue/city/dates from `seo_event_lookup`; skips ended-by-status and ended-by-date (grace),
  caps the set, sorts nearest-first. Env: `MONITOR_PAST_GRACE_DAYS` (2), `MONITOR_MAX_EVENTS` (1500).
- API routes (public — n8n calls them, no auth header):
  - `GET /api/monitor/list` → seeds baseline for new events (first-seen = current) and returns the
    baseline for on-sale+generated events `[{event_id,venue,city,date_from,date_to,language}]`.
  - `POST /api/monitor/change {event_id, changes}` → records before/after, moves baseline to new
    values, returns `{regenerate, action}`.
    **Regenerate rule:** regenerate if Venue OR City OR the calendar DATE changed. A Dates change
    that only shifts the TIME within the same day → `action:"flagged_time_only"`, NOT regenerated.
    A fresh manual publish (≤ `MONITOR_MANUAL_PROTECT_DAYS`, default 30) → `action:"flagged_manual"`,
    NOT regenerated (protect hand-edited meta). Else `action:"regenerated"`.
  - `POST /api/monitor/resolve {event_id}` → clears the "Source changed" markers (sets resolved).
- UI: `SourceChangeBlock.tsx` on the card (before→after for Venue/City/Dates + reason label +
  "Mark reviewed"); catalog "Source changed" filter (Processing group) + row badge (EventsBrowser +
  EventRow, fed by `getUnresolvedChangeIds`).

### n8n side (other sandbox owns it) — current workflow "✅Event Analysis + API v9.4 + Supabase"
Six branches: (1) Auto-gen — Schedule every 10 min + Manual trigger, reads `seo_events_queue`,
generates EN+AR/RU/FR, PUT PlatinumList API, logs `seo_agent_runs`, marks `seo_done`.
(2) `POST /regenerate-seo {event_id}` — regenerate+publish one event (reads `seo_event_lookup`).
(3) `POST /seo-agent/publish-meta` — publish hand-edited meta (secret-checked). (4)
`POST /seo-agent/manual-generate` — preview with custom prompt/model. (5) `POST /seo-agent/login-code`
— email the OTP (Gmail). (6) **Source Monitor** — Schedule hourly at :10 → `GET /api/monitor/list`
→ per event read `seo_event_lookup` (node "Monitor: Get Current (Supabase)", Discovery GET API is
NOT used) → compare Venue/City/Dates → `POST /api/monitor/change` → if `{regenerate:true}` call
`/regenerate-seo`. Shared secret header `x-webhook-secret`. Spec: `SEO_AGENT_CHANGE_MONITOR_SUPABASE_SPEC.md`.

---

## 3. Neon tables (our writable DB, all lazy-created)
`event_reviews`, `meta_edits`, `meta_publish_history`, `login_codes`, `manual_prompts`,
`monitor_baseline`, `monitor_changes`.

## 4. Env vars (Vercel → Settings → Env) — names only
Base: `SITE_PASSWORD` (legacy), `AUTH_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL`,
`N8N_REGENERATE_URL`, `N8N_WEBHOOK_SECRET`, `N8N_PUBLISH_URL` (optional, derived if unset).
Added: `SUPABASE_SERVICE_KEY`, `LOGIN_ALLOWED_EMAILS`, and monitor tunables
`MONITOR_PAST_GRACE_DAYS`, `MONITOR_MAX_EVENTS`, `MONITOR_MANUAL_PROTECT_DAYS` (all optional, sane
defaults). n8n manual-generate / login-code URLs are derived from `N8N_REGENERATE_URL`'s host.

## 5. Spec files in the project folder (for the n8n / DB sandbox)
- `SEO_AGENT_CHANGE_MONITOR_SUPABASE_SPEC.md` — CURRENT monitor spec (reads Supabase, no GET API).
- `SEO_AGENT_CHANGE_MONITOR_SPEC.md` — older monitor spec (Discovery GET version, superseded).
- `N8N_MANUAL_GENERATE_SPEC.md`, `N8N_LOGIN_CODE_SPEC.md` — webhook build specs.
- `SEO_AGENT_AUTOGEN_LOCK_SPEC.md`, `SEO_AGENT_DISABLE_ATTRACTIONS_SPEC.md` — disable auto-gen for
  attractions / lock ideas.
- `SEO_AGENT_OVERVIEW_WIPE_SPEC.md`, `SEO_AGENT_OVERVIEW_PASSTHROUGH_SPEC.md` — PlatinumList API
  full-replace wipes `overview` (fix on API/n8n side).
- `SEO_AGENT_SKIP_NODE_FIX_SPEC.md` — old Skip-node fix (n8n Cloud `$env` blocked); Skip node is now
  removed in v9.x, mostly historical.
- `SEO_AGENT_DEMO.md` / `SEO_AGENT_DEMO_EN.md` — plain-language "what the app does" write-ups.
(These live on the mount; only AGENTS.md, CLAUDE.md, README.md, SEO_AGENT_GUIDE.md + this file are
committed to the repo.)

## 6. Known data quirks (Supabase, from earlier analysis)
- Indexation: EN and AR share `is_no_index`... — but we now also read `ar_no_index` where present
  (independent AR). RU/FR have own flags.
- Descriptions exist only EN/AR in the base data; RU/FR overviews now surfaced via our view.
- `is_attraction` boolean is authoritative (category text lies for ~247 events).
- "New" = in `new_events_stream` AND `seo_done != true` (a flag, not a date).
- `seo_agent_runs` has empty `skipped_*` rows → always filter `meta_title_en is not null`.
- Supabase is shared prod; timeouts ("Connection terminated…") are other services, not this app.

## 7. Open items / current state
- Test artifact: event **106831** baseline currently holds Dubai / Coca-Cola Arena (from a real
  monitor test). Benign; it matches current source, won't re-trigger.
- H1 mirrors the admin event name (`event_name_en`) BY DESIGN — a City/Venue change does not rewrite
  H1 (only meta_title/description get the new city). If auto-H1-rewrite is wanted, pass old→new city
  from the monitor into the regenerate branch (n8n) — not yet done.
- PlatinumList API sometimes returns 207 `partial` (some language fields rejected) — publish/API
  behavior, worth a separate look; not a monitor bug.
- Perf: `/api/monitor/list` scans the catalog (3 lookup pages + RPC) hourly and the n8n loop reads
  `seo_event_lookup` once per event; bounded by the caps above. Watch the shared DB; raise caps/TTL
  if needed.
- Older open UI polish (from AGENTS.md TODO): surface `invalid_fields` on Publish; "has draft"
  marker in the list.


---

## 8. Part 2 additions — new sections & fixes (LATEST STATE, read this)

Built in the "SEO Agent project Part 2" sandbox, all live and pushed to `main`
(latest commit around `9fd56b6`). This is the newest layer on top of everything above.

### Events list — per-language indexation column
- `getCatalog()` (`src/lib/events.ts`) now also returns `indexed:{en,ar,ru,fr}` per event, read from
  the SAME `seo_event_indexation` view it already queried for `is_attraction` (just added the
  `is_no_index/ar_no_index/ru_no_index/fr_no_index` flags -> no extra DB load).
- New **"Index"** column in the events list (`EventsBrowser` + `EventRow`): compact EN/AR/RU/FR chips,
  green = indexed, red/strikethrough = no-index. Same indexed logic as the event card.

### Three NEW read-only sections (list + detail, mirror Events; no n8n, no edit/publish)
Each: nav link in `Header`, tile on the home page, list with search + quick filters + EN/AR
"meta present" chips, detail with meta per language (only langs that have content). Data pulled
connection-light (cached REST, service key) via a dedicated lib file — existing code untouched.
- **Categories** -> `content_categories` (124 rows). Files: `src/lib/categories.ts`,
  `src/lib/categoryUrl.ts`, `components/CategoriesBrowser.tsx`, `components/CategoryOpen.tsx`,
  `app/[locale]/categories/{page.tsx,[id]/page.tsx}`. Shows meta_title/meta_description (EN ~120/124,
  AR empty), is_attraction badge/filter ("Event category"/"Attraction category"), event counts.
  - **City-aware URLs**: the DB `url` is a short slug on the bare host and does NOT resolve; real pages
    live on per-city subdomains. `categoryUrl.ts` builds `https://{citySlug}.platinumlist.net{path}`
    (citySlug = lowercase, spaces->'-'), default city **Dubai** (else first `linked_cities`). Detail has
    a city selector; list link uses the default city.
  - **Nested URL gap:** nested categories (`/attraction/experiences/kids-play-areas`,
    `/sport/football-screenings`) need a parent path that is NOT in our data. A `full_path` consumption
    path was built then **REMOVED** (data unavailable) — requested from the DB team instead.
- **Venues** -> `pl_venues` (9382 total; we show only PUBLISHED, `is_published=1`, ~2083). Files:
  `src/lib/venues.ts`, `components/VenuesBrowser.tsx`, `app/[locale]/venues/...`. Fields EN/AR:
  meta_title, meta_description, info, how_to_get_there. Venue `url` is normalized (prepend `https://`,
  fix the SPACE in multi-word city subdomains, e.g. "abu dhabi"->"abu-dhabi"). Only ~122 have meta.
- **Artists** -> `pl_artists` (4209, all shown). Files: `src/lib/artists.ts`,
  `components/ArtistsBrowser.tsx`, `app/[locale]/artists/...`. Fields EN/AR (TR columns exist but empty):
  meta_title, meta_keywords, artist_bio. **No meta_description column exists in pl_artists.** The card
  shows **H1 = artist name** (the live artist-page H1 is the name). `url` is global (https, no city).

### Source Monitor tweak
- The "Source changed" catalog marker AND the card before->after block are now HIDDEN for time-only
  Dates changes. `src/lib/monitor.ts` `getUnresolvedChangeIds()` and `getLatestUnresolvedChange()` now
  filter `action <> 'flagged_time_only'`. They surface ONLY on Venue/City/calendar-DATE change.
  (Auto-gen was already skipped for time-only on the n8n side.)

### Data-gaps deliverable for the DB team (on the mount, NOT committed)
- `SEO_DATA_GAPS_REQUESTS.md` + `SEO_Data_Gaps_Requests.pdf`: one doc with a per-table matrix
  (H1 / Meta Title / Meta Description / Description x EN/AR/RU/FR/EL, Yes/Empty/No) for
  content_categories, pl_venues, pl_artists. What to add: **H1 everywhere; RU/FR/EL everywhere;
  artist meta_description; category full_path (canonical nested path).**

### Source-table language reality (important for future work)
- `content_categories` & `pl_venues`: EN/AR columns ONLY. `pl_artists`: EN/AR/TR (TR empty). None have
  RU/FR/EL, none have an H1 column, `pl_artists` has no meta_description. These are exactly the gaps the
  data-gaps doc asks the DB team to fill.
- Artist/venue CATEGORY pages (`/artist/arabic`, `/venue/park`) are NOT in the DB at all
  (`content_categories` holds event/attraction categories only). `URL List V2` table exists but is EMPTY.
- The `artists` and `venues` (non-`pl_`) tables have a richer multilang meta schema (EN/AR/RU/FR/EL) but
  are essentially empty — not used.

### Likely next steps for Part 3
- Wait for the DB team to add the requested columns (H1, RU/FR/EL, artist meta_description, category
  full_path); then surface them in the new sections (and re-enable full_path for correct nested URLs).
- Optionally add edit/publish for Categories/Venues/Artists (currently read-only) — would need n8n
  webhooks per entity, like Events.
- Consider showing venue `title_info` and a venue/artist image in the cards (data exists).


---

## 9. Part 3 outcome + sandbox lineage (read for Part 3.1)

Sandbox lineage: "SEO Agent website setup" -> "SEO Agent project" -> "Part 2" -> "Part 3"
-> (now) **"Part 3.1"**. Source of truth is the mounted folder + the GitHub repo, not any sandbox.
Part 3 was closed WITHOUT app-code changes: `main` is unchanged at `94cecc1`.

What Part 3 produced (all persisted here, no code change):
- **Backup / restore point** at `94cecc1`: GitHub tag `backup-20260707` + branch `backup/20260707`;
  local source zip `backups/seo-agent-src-backup-20260707.zip`; steps in `backups/RESTORE-20260707.txt`.
- **Sandbox build workaround** for a Turbopack/native-SWC `Bus error (core dumped)` that crashes
  `next build` under sandbox CPU emulation. Fix = build via webpack + the WASM SWC binding. Full
  recipe in **`SANDBOX_BUILD_NOTES.md`**; ready-to-run helper **`build-local.sh`** (repo root/mount).
  This is sandbox-only; the real Vercel deploy build uses native SWC and needs none of it.

Open (carried into Part 3.1):
- Nav restructure idea (not started): group the existing catalog sections
  (Events / Attractions / Categories / Venues / Artists) under one global area, and add a second
  global area for a research/planning tool. Names + layout NOT finalized; revisit with the user.
- Everything from section 8 (Part 2) still applies.

## 10. Part 3.1 outcome (read for Part 4)

Sandbox lineage: "SEO Agent website setup" -> "SEO Agent project" -> "Part 2" -> "Part 3"
-> "Part 3.1" -> (now) **"Part 4"**. Source of truth is the mounted folder + the GitHub repo.
"Part 3" can be deleted: its outcome is fully captured in section 9.

### What Part 3.1 built

**Nav restructure.** Events / Attractions / Categories / Venues / Artists are grouped under one
global area named **SEO Metadata Manager** (tag icon). A second global area, **Keyword Research**,
sits next to it.

**Keyword Research (new tool).** Architecture is Option B: the app orchestrates, n8n does DataForSEO
and the LLM. DataForSEO credentials live ONLY in n8n, never in Vercel.
Flow: form -> Neon `keyword_jobs` -> n8n webhook (`/webhook/seo-agent/keyword-research`) ->
async pipeline -> callback to `/api/keyword-research/result` -> draft -> edit -> approve -> .xlsx.

App files added: `src/lib/keywordResearch.ts`, `src/lib/geo.ts`, `src/lib/countries.ts`,
`src/app/api/keyword-research/*`, `src/app/api/geo/route.ts`,
`src/components/KeywordIntake.tsx`, `KeywordJob.tsx`, `KeywordDeleteButton.tsx`,
`src/app/[locale]/keywords/*`. Dependency added: `exceljs`.

Second n8n webhook in the SAME workflow: `/webhook/seo-agent/df-geo` -> DataForSEO reference
endpoints (`google_ads/locations/$country`, `/languages`), cached 30 days in Neon `dfs_geo_cache`.

**Latest commits on `main`:** `f9aa635` (xlsx: no merged cells, clickable URLs,
`Global Vol (worldwide)`), `d7662c8`, `293e0f6`, `3cef03f`.

### Hard-won facts (do not rediscover these)

- The n8n Code node sandbox has **no global `URL`**. `new URL(...)` throws ReferenceError; any
  `try/catch` around it turns the bug into a silent empty result. Parse URLs with string ops.
- Google Ads **groups close variants**: `children's city tickets` returns blank while
  `childrens city` returns 12100. A blank Local Vol is grouping, not zero.
- DataForSEO **Labs indexes one spelling, Google Ads prices another**. Substring filters
  (`%children%`) sidestep apostrophes entirely.
- `keyword_ideas` expands by the **category of each seed**, not by substring. The FULL attraction
  name is the strong seed; a truncated brand core returns junk (`wild wadi maintenance`, `... jobs`).
- Global Vol: a Google Ads call with **no location** returns true worldwide volume. The skill's
  feeder-market sum was a workaround for the MCP wrapper only.
- n8n `pairedItem` breaks on 1->N fanout and N->1 fan-in: use `pairedItem: 0` and `.first()`.
- Always keep `method.flow_build` in `Assemble Payload` and bump it. It is the only reliable way
  to tell whether the deployed workflow is the one you just edited.

### Open items carried into Part 4

1. **LLM node is unreliable.** `LLM: Classify + Analyze` sometimes returns nothing; the report then
   ships rule-based fallbacks and says so in Method (`N of M keywords were skipped`).
   Proposed structural fix (not yet done): split into `LLM: Classify` (keywords, batched 25) and
   `LLM: Analyze` (analysis + FAQ). One giant JSON is the fragile part.
2. **Two n8n patches written, not yet applied**: `N8N_KEYWORD_RESEARCH_FIX_RECALL.md`,
   `N8N_KEYWORD_RESEARCH_FIX_WORLDWIDE.md`, `N8N_KEYWORD_RESEARCH_FIX_BRAND_SHORT.md`
   (the last one fixes `planet tickets` style noise and adds a `grid_rejected` guard).
3. **Skill conformance gaps**: no persistent memory of rejected keywords
   ("never re-propose a rejected keyword"); Gate A does not confirm the intake back.
4. **Security**: `N8N_WEBHOOK_SECRET` was pasted into a chat and must be rotated
   (Vercel env + both IF nodes + the Callback header).
5. **Reliability**: the workflow has no error branch, so a Code-node crash leaves the job stuck in
   `Researching...` instead of `failed`.
6. **Routing**: `N8N_KEYWORD_RESEARCH_URL` / `N8N_DF_GEO_URL` currently point at the `superseo`
   n8n instance. Decide whether to move back to `platinumlist`.
7. **Cost**: DataForSEO runs in `live` mode everywhere. `task` (Standard) mode was deferred.

### Spec-file hygiene

`N8N_KEYWORD_RESEARCH_FIX_*.md` accumulated ~20 files, most superseded. The CURRENT ones are:
`N8N_KEYWORD_RESEARCH_SKILL_CONFORMANCE.md`, `..._FIX_RECALL.md`, `..._FIX_WORLDWIDE.md`,
`..._FIX_BRAND_SHORT.md`, `..._FIX_FALLBACK_AND_OFFICIAL.md`.
`..._FIX_BRAND_CORE_FULL.md` is explicitly cancelled. Everything else is history.
