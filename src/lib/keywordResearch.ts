// Keyword Research jobs, stored in our own Neon DB (writable).
// One table, lazy-created on first use (no manual migration), jsonb for the list + analysis so
// Gate B edits are a single overwrite. See SEO_AGENT_KEYWORD_RESEARCH_SPEC.md.

export type GeoTarget = {country: string; city?: string | null};

export type KeywordRow = {
  keyword: string;
  local_vol: number | null;
  global_vol: number | null;
  difficulty: number | null; // 1..10 attraction scale
  raw_kd?: number | null;
  intent: string;   // Informational | Navigational | Commercial | Transactional
  priority: string; // High | Medium | Low
  page_type: string; // Attraction Page | FAQ | Blog | Category
  notes?: string;
  include?: boolean; // Gate B keep/drop (default true)
};

export type KeywordAnalysis = {
  problems?: string;
  competitor_coverage?: string;
  content_gaps?: string;
  recommendations?: {meta_title?: string; h1?: string; faqs?: string[]};
};

export type JobStatus = 'queued' | 'running' | 'ready' | 'approved' | 'failed';

export type KeywordJob = {
  id: string;
  attraction_id: string | null;
  attraction_url: string;
  attraction_name: string;
  target_geo: GeoTarget;
  languages: string[];
  scope_excludes: string | null;
  differentiators: string | null;
  location_is_demand_market: boolean | null;
  status: JobStatus;
  results: KeywordRow[] | null;
  analysis: KeywordAnalysis | null;
  method: Record<string, unknown> | null;
  error: string | null;
  approved: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NewJobInput = {
  attraction_url: string;
  attraction_name: string;
  target_geo: GeoTarget;
  languages: string[];
  scope_excludes?: string | null;
  differentiators?: string | null;
  location_is_demand_market?: boolean | null;
  attraction_id?: string | null;
  created_by?: string | null;
};

async function getSql() {
  const {sql} = await import('./db');
  return sql;
}

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  const sql = await getSql();
  await sql`
    create table if not exists keyword_jobs (
      id               text primary key,
      attraction_id    text,
      attraction_url   text not null,
      attraction_name  text not null,
      target_geo       jsonb not null,
      languages        jsonb not null,
      status           text not null,
      scope_excludes   text,
      differentiators  text,
      location_is_demand_market boolean,
      results          jsonb,
      analysis         jsonb,
      method           jsonb,
      error            text,
      approved         boolean not null default false,
      created_by       text,
      created_at       timestamptz not null default now(),
      updated_at       timestamptz not null default now()
    )
  `;
  await sql`create index if not exists keyword_jobs_created_idx on keyword_jobs (created_at desc)`;
  // Additive columns for existing tables (no-op if already present).
  await sql`alter table keyword_jobs add column if not exists scope_excludes text`;
  await sql`alter table keyword_jobs add column if not exists differentiators text`;
  await sql`alter table keyword_jobs add column if not exists location_is_demand_market boolean`;
  ensured = true;
}

function newId(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return 'kw_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

// Create a job in status=queued and return its id.
export async function createJob(input: NewJobInput): Promise<string> {
  await ensureTable();
  const sql = await getSql();
  const id = newId();
  await sql`
    insert into keyword_jobs
      (id, attraction_id, attraction_url, attraction_name, target_geo, languages, status,
       scope_excludes, differentiators, location_is_demand_market, created_by)
    values (
      ${id}, ${input.attraction_id ?? null}, ${input.attraction_url}, ${input.attraction_name},
      ${JSON.stringify(input.target_geo)}::jsonb, ${JSON.stringify(input.languages)}::jsonb,
      'queued', ${input.scope_excludes ?? null}, ${input.differentiators ?? null},
      ${input.location_is_demand_market ?? null}, ${input.created_by ?? null}
    )
  `;
  return id;
}

export async function setStatus(id: string, status: JobStatus, error?: string | null): Promise<void> {
  await ensureTable();
  const sql = await getSql();
  await sql`
    update keyword_jobs set status = ${status}, error = ${error ?? null}, updated_at = now()
    where id = ${id}
  `;
}

export async function deleteJob(id: string): Promise<void> {
  await ensureTable();
  const sql = await getSql();
  await sql`delete from keyword_jobs where id = ${id}`;
}

// Callback from n8n: store the finished list + analysis, flip status.
export async function saveResult(
  id: string,
  data: {
    status?: JobStatus;
    error?: string | null;
    results?: KeywordRow[] | null;
    analysis?: KeywordAnalysis | null;
    method?: Record<string, unknown> | null;
  }
): Promise<void> {
  await ensureTable();
  const sql = await getSql();
  const status: JobStatus = data.status ?? (data.error ? 'failed' : 'ready');
  await sql`
    update keyword_jobs set
      status   = ${status},
      error    = ${data.error ?? null},
      results  = ${data.results != null ? JSON.stringify(data.results) : null}::jsonb,
      analysis = ${data.analysis != null ? JSON.stringify(data.analysis) : null}::jsonb,
      method   = ${data.method != null ? JSON.stringify(data.method) : null}::jsonb,
      updated_at = now()
    where id = ${id}
  `;
}

// Gate B edits / approve. results/analysis are overwritten when provided.
export async function patchJob(
  id: string,
  data: {results?: KeywordRow[]; analysis?: KeywordAnalysis; approved?: boolean}
): Promise<void> {
  await ensureTable();
  const sql = await getSql();
  if (data.results !== undefined) {
    await sql`update keyword_jobs set results = ${JSON.stringify(data.results)}::jsonb, updated_at = now() where id = ${id}`;
  }
  if (data.analysis !== undefined) {
    await sql`update keyword_jobs set analysis = ${JSON.stringify(data.analysis)}::jsonb, updated_at = now() where id = ${id}`;
  }
  if (data.approved !== undefined) {
    const status: JobStatus = data.approved ? 'approved' : 'ready';
    await sql`update keyword_jobs set approved = ${data.approved}, status = ${status}, updated_at = now() where id = ${id}`;
  }
}

export async function getJob(id: string): Promise<KeywordJob | null> {
  try {
    await ensureTable();
    const sql = await getSql();
    const rows = (await sql`select * from keyword_jobs where id = ${id} limit 1`) as KeywordJob[];
    return rows[0] ? normalize(rows[0]) : null;
  } catch {
    return null;
  }
}

export type JobSummary = Pick<
  KeywordJob,
  'id' | 'attraction_name' | 'target_geo' | 'languages' | 'status' | 'approved' | 'created_at'
>;

export async function listJobs(attractionId?: string): Promise<JobSummary[]> {
  try {
    await ensureTable();
    const sql = await getSql();
    const rows = (attractionId
      ? await sql`
          select id, attraction_name, target_geo, languages, status, approved, created_at
          from keyword_jobs where attraction_id = ${attractionId} order by created_at desc limit 200`
      : await sql`
          select id, attraction_name, target_geo, languages, status, approved, created_at
          from keyword_jobs order by created_at desc limit 200`) as JobSummary[];
    return rows.map((r) => ({...r, id: String(r.id)}));
  } catch {
    return [];
  }
}

// neon returns jsonb already parsed; just guard shapes.
function normalize(j: KeywordJob): KeywordJob {
  return {
    ...j,
    id: String(j.id),
    target_geo: (j.target_geo ?? {country: ''}) as GeoTarget,
    languages: Array.isArray(j.languages) ? j.languages : [],
    results: Array.isArray(j.results) ? j.results : null,
    analysis: (j.analysis ?? null) as KeywordAnalysis | null,
    method: (j.method ?? null) as Record<string, unknown> | null
  };
}
