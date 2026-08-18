// AI token usage + cost, stored in our own Neon DB (writable). Lazy-created table.
// n8n posts raw token counts per model call to /api/ai-usage; the cost is computed HERE
// (single source of truth for pricing) and stored. The Costs page and the event card read it.

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

// ---- Pricing, per 1,000,000 tokens (USD) --------------------------------------------------
// Confirmed for gpt-5.6-luna. gpt-4o / gpt-4.1-mini are public list prices; override any of
// these with env AI_PRICING_JSON (a JSON map of the same shape) without a redeploy of code.
export type Rate = {in: number; cached: number; write: number; out: number};

const DEFAULT_PRICING: Record<string, Rate> = {
  // gpt-5.6 family: read = 0.1x input, write = 1.25x input (explicit prompt cache).
  'gpt-5.6-luna': {in: 0.2, cached: 0.02, write: 0.25, out: 1.2},
  // Fallbacks / other nodes. Verify against your OpenAI pricing; adjust via AI_PRICING_JSON.
  'gpt-4o': {in: 2.5, cached: 1.25, write: 2.5, out: 10},
  'gpt-4o-mini': {in: 0.15, cached: 0.075, write: 0.15, out: 0.6},
  'gpt-4.1': {in: 2.0, cached: 0.5, write: 2.0, out: 8},
  'gpt-4.1-mini': {in: 0.4, cached: 0.1, write: 0.4, out: 1.6}
};

function pricing(): Record<string, Rate> {
  const raw = process.env.AI_PRICING_JSON;
  if (!raw) return DEFAULT_PRICING;
  try {
    const parsed = JSON.parse(raw) as Record<string, Rate>;
    return {...DEFAULT_PRICING, ...parsed};
  } catch {
    return DEFAULT_PRICING;
  }
}

// Match by exact model, then by the longest known prefix (so "gpt-5.6-luna-2026" still resolves).
export function rateFor(model: string): Rate {
  const p = pricing();
  const m = String(model || '').toLowerCase().trim();
  if (p[m]) return p[m];
  let best: {key: string; rate: Rate} | null = null;
  for (const key of Object.keys(p)) {
    if (m.startsWith(key) && (!best || key.length > best.key.length)) best = {key, rate: p[key]};
  }
  // Unknown model -> zero rates (cost 0) rather than a wrong guess. Shows up as $0, easy to spot.
  return best ? best.rate : {in: 0, cached: 0, write: 0, out: 0};
}

export type UsageLine = {
  kind: string; // writer | translate | image | roles
  model: string;
  tokens_in: number;
  tokens_out: number;
  tokens_cached: number;
  tokens_cache_write: number;
};

export function costOfLine(l: UsageLine): number {
  const r = rateFor(l.model);
  const fresh = Math.max(0, (l.tokens_in || 0) - (l.tokens_cached || 0) - (l.tokens_cache_write || 0));
  return (
    (fresh * r.in +
      (l.tokens_cached || 0) * r.cached +
      (l.tokens_cache_write || 0) * r.write +
      (l.tokens_out || 0) * r.out) /
    1_000_000
  );
}

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists ai_usage (
      id                 bigserial primary key,
      event_id           text,
      execution_id       text,
      kind               text not null,
      model              text not null,
      tokens_in          integer not null default 0,
      tokens_out         integer not null default 0,
      tokens_cached      integer not null default 0,
      tokens_cache_write integer not null default 0,
      cost_usd           numeric not null default 0,
      created_at         timestamptz not null default now()
    )
  `;
  await sql`create index if not exists ai_usage_event_idx on ai_usage (event_id)`;
  await sql`create index if not exists ai_usage_created_idx on ai_usage (created_at)`;
  ensured = true;
}

// Insert one row per model call for a generation run; returns the run's total cost.
export async function logUsage(input: {
  event_id?: string | null;
  execution_id?: string | null;
  lines: UsageLine[];
}): Promise<number> {
  await ensureTable();
  const sql = await getSql();
  let total = 0;
  for (const l of input.lines) {
    const cost = costOfLine(l);
    total += cost;
    await sql`
      insert into ai_usage
        (event_id, execution_id, kind, model, tokens_in, tokens_out, tokens_cached, tokens_cache_write, cost_usd)
      values
        (${input.event_id ?? null}, ${input.execution_id ?? null}, ${l.kind}, ${l.model},
         ${l.tokens_in || 0}, ${l.tokens_out || 0}, ${l.tokens_cached || 0}, ${l.tokens_cache_write || 0}, ${cost})
    `;
  }
  return total;
}

// ---- Reads for the UI ---------------------------------------------------------------------

export type EventCost = {
  total: number;
  lines: {kind: string; model: string; cost: number; tokens_in: number; tokens_out: number; tokens_cached: number}[];
  at: string | null;
};

// Cost of the MOST RECENT generation of an event (latest execution_id for that event).
export async function getEventCost(eventId: string): Promise<EventCost | null> {
  try {
    await ensureTable();
    const sql = await getSql();
    // "Last generation" = the single most recent call of EACH kind for this event, within its
    // latest execution. distinct on (kind) prevents summing several generations that share one
    // execution_id (auto-gen processes a batch, or the event was queued more than once).
    const rows = (await sql`
      select distinct on (kind) kind, model, cost_usd, tokens_in, tokens_out, tokens_cached, created_at
      from ai_usage
      where event_id = ${eventId}
        and execution_id = (
          select execution_id from ai_usage
          where event_id = ${eventId}
          order by created_at desc limit 1
        )
      order by kind, created_at desc
    `) as Record<string, unknown>[];
    if (!rows.length) return null;
    const order: Record<string, number> = {writer: 0, translate: 1, image: 2, roles: 3};
    const lines = rows
      .map((r) => ({
        kind: String(r.kind),
        model: String(r.model),
        cost: Number(r.cost_usd) || 0,
        tokens_in: Number(r.tokens_in) || 0,
        tokens_out: Number(r.tokens_out) || 0,
        tokens_cached: Number(r.tokens_cached) || 0,
        at: r.created_at ? String(r.created_at) : ''
      }))
      .sort((a, b) => (order[a.kind] ?? 9) - (order[b.kind] ?? 9));
    const latest = lines.reduce((mx, l) => (l.at > mx ? l.at : mx), '');
    return {
      total: lines.reduce((s, l) => s + l.cost, 0),
      lines: lines.map(({at, ...rest}) => rest),
      at: latest || null
    };
  } catch {
    return null;
  }
}

export type CostBucket = {cost: number; tokens_in: number; tokens_out: number; tokens_cached: number; calls: number};
export type CostSummary = {
  today: number;
  d7: number;
  d30: number;
  all: number;
  byModel: {model: string; bucket: CostBucket}[];
  byKind: {kind: string; cost: number}[];
  cacheSavedUsd: number; // how much cheaper reads-from-cache made us vs paying full input
  recent: {event_id: string | null; at: string | null; cost: number; models: string}[];
};

export async function getCostSummary(): Promise<CostSummary> {
  try {
    await ensureTable();
    const sql = await getSql();

    const totals = (await sql`
      select
        coalesce(sum(cost_usd) filter (where created_at >= now() - interval '1 day'), 0)  as today,
        coalesce(sum(cost_usd) filter (where created_at >= now() - interval '7 days'), 0)  as d7,
        coalesce(sum(cost_usd) filter (where created_at >= now() - interval '30 days'), 0) as d30,
        coalesce(sum(cost_usd), 0) as all
      from ai_usage
    `) as Record<string, unknown>[];
    const t = totals[0] || {};

    const byModelRows = (await sql`
      select model,
             sum(cost_usd) as cost, sum(tokens_in) as tin, sum(tokens_out) as tout,
             sum(tokens_cached) as tcached, count(*) as calls
      from ai_usage group by model order by cost desc
    `) as Record<string, unknown>[];

    const byKindRows = (await sql`
      select kind, sum(cost_usd) as cost from ai_usage group by kind order by cost desc
    `) as Record<string, unknown>[];

    // Cache savings: cached tokens would otherwise cost the full input rate; they cost `cached`.
    const cacheRows = (await sql`
      select model, sum(tokens_cached) as tcached from ai_usage group by model
    `) as Record<string, unknown>[];
    let cacheSavedUsd = 0;
    for (const r of cacheRows) {
      const rate = rateFor(String(r.model));
      cacheSavedUsd += ((Number(r.tcached) || 0) * (rate.in - rate.cached)) / 1_000_000;
    }

    const recentRows = (await sql`
      select event_id, execution_id, max(created_at) as at, sum(cost_usd) as cost,
             string_agg(distinct model, ', ') as models
      from ai_usage
      group by event_id, execution_id
      order by at desc
      limit 30
    `) as Record<string, unknown>[];

    return {
      today: Number(t.today) || 0,
      d7: Number(t.d7) || 0,
      d30: Number(t.d30) || 0,
      all: Number(t.all) || 0,
      byModel: byModelRows.map((r) => ({
        model: String(r.model),
        bucket: {
          cost: Number(r.cost) || 0,
          tokens_in: Number(r.tin) || 0,
          tokens_out: Number(r.tout) || 0,
          tokens_cached: Number(r.tcached) || 0,
          calls: Number(r.calls) || 0
        }
      })),
      byKind: byKindRows.map((r) => ({kind: String(r.kind), cost: Number(r.cost) || 0})),
      cacheSavedUsd,
      recent: recentRows.map((r) => ({
        event_id: r.event_id ? String(r.event_id) : null,
        at: r.at ? String(r.at) : null,
        cost: Number(r.cost) || 0,
        models: String(r.models || '')
      }))
    };
  } catch {
    return {today: 0, d7: 0, d30: 0, all: 0, byModel: [], byKind: [], cacheSavedUsd: 0, recent: []};
  }
}
