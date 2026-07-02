# SEO Agent — Handoff to a new sandbox (current state)

Read this together with **AGENTS.md** (auto-loaded project instructions) and **SEO_AGENT_GUIDE.md**.
AGENTS.md holds the base architecture + working method; THIS file is the up-to-date delta on top
of it (everything built after the original guide, incl. the Source Monitor).

Live: https://seo-agent-platinum.vercel.app/ · Repo: `IT-StartAnalytics/seo-agent` (branch `main`)
Folder: `D:\Claude\SEO Agent - PlatinumList` · GitHub token: `token.txt` (repo root).

---

## 0. How to start in the new sandbox
Open a new session with the same folder and say:
> «Продолжаем проект SEO Agent, прочитай AGENTS.md и SEO_AGENT_HANDOFF.md, работай по описанному методу. Пиши на русском.»

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
