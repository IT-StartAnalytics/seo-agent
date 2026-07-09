'use client';

import {useCallback, useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';

type Row = {
  keyword: string;
  local_vol: number | null;
  global_vol: number | null;
  difficulty: number | null;
  raw_kd?: number | null;
  intent: string;
  priority: string;
  page_type: string;
  notes?: string;
  include?: boolean;
};
type Analysis = {
  problems?: string;
  competitor_coverage?: string;
  content_gaps?: string;
  recommendations?: {meta_title?: string; h1?: string; faqs?: string[]};
};
type Geo = {country: string; city?: string | null};
export type JobData = {
  id: string;
  attraction_name: string;
  attraction_url: string;
  target_geo: Geo;
  languages: string[];
  status: string;
  results: Row[] | null;
  analysis: Analysis | null;
  method: Record<string, unknown> | null;
  error: string | null;
  approved: boolean;
};

const PRIORITIES = ['High', 'Medium', 'Low'];
const PAGE_TYPES = ['Attraction Page', 'FAQ', 'Blog', 'Category'];

export default function KeywordJob({initial}: {initial: JobData}) {
  const t = useTranslations('KeywordResearch');
  const [status, setStatus] = useState(initial.status);
  const [error, setError] = useState(initial.error);
  const [approved, setApproved] = useState(initial.approved);
  const [rows, setRows] = useState<Row[]>(() =>
    (initial.results ?? []).map((r) => ({...r, include: r.include !== false}))
  );
  const [analysis, setAnalysis] = useState<Analysis | null>(initial.analysis);
  const [method, setMethod] = useState<Record<string, unknown> | null>(initial.method);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const router = useRouter();

  async function remove() {
    if (!window.confirm(t('deleteConfirm'))) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/keyword-research/${initial.id}`, {method: 'DELETE'});
      if (res.ok) {
        router.push('/keywords');
        return;
      }
    } finally {
      setDeleting(false);
    }
  }

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/keyword-research/status?job_id=${initial.id}`, {cache: 'no-store'});
      const d = await res.json().catch(() => ({}));
      if (d?.ok) {
        setStatus(d.status);
        setError(d.error);
        setApproved(!!d.approved);
        if (Array.isArray(d.results)) setRows(d.results.map((r: Row) => ({...r, include: r.include !== false})));
        setAnalysis(d.analysis ?? null);
        setMethod(d.method ?? null);
      }
    } catch {
      /* keep polling */
    }
  }, [initial.id]);

  useEffect(() => {
    if (status !== 'queued' && status !== 'running') return;
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [status, poll]);

  function edit(i: number, patch: Partial<Row>) {
    setRows((cur) => cur.map((r, idx) => (idx === i ? {...r, ...patch} : r)));
    setDirty(true);
  }

  async function save(alsoApprove?: boolean) {
    setSaving(true);
    try {
      const body: {results: Row[]; approved?: boolean} = {results: rows};
      if (alsoApprove !== undefined) body.approved = alsoApprove;
      const res = await fetch(`/api/keyword-research/${initial.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      });
      const d = await res.json().catch(() => ({}));
      if (d?.ok) {
        setDirty(false);
        if (alsoApprove !== undefined) {
          setApproved(alsoApprove);
          setStatus(alsoApprove ? 'approved' : 'ready');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const kept = rows.filter((r) => r.include !== false);
      const res = await fetch(`/api/keyword-research/${initial.id}/export`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({rows: kept})
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `keywords-${initial.attraction_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  const market = initial.target_geo.city
    ? `${initial.target_geo.city}, ${initial.target_geo.country}`
    : initial.target_geo.country;
  const kept = rows.filter((r) => r.include !== false).length;

  const statusChip = (() => {
    const map: Record<string, string> = {
      queued: 'bg-slate-500/10 text-slate-500',
      running: 'bg-amber-500/10 text-amber-600',
      ready: 'bg-indigo-500/10 text-indigo-500',
      approved: 'bg-emerald-500/10 text-emerald-600',
      failed: 'bg-rose-500/10 text-rose-500'
    };
    const labels: Record<string, string> = {
      queued: t('statusQueued'),
      running: t('statusRunning'),
      ready: t('statusReady'),
      approved: t('statusApproved'),
      failed: t('statusFailed')
    };
    return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] || map.queued}`}>{labels[status] || status}</span>;
  })();

  const cell = 'px-3 py-2 align-top';
  const sel = 'rounded-md border border-black/10 dark:border-white/10 bg-background px-2 py-1 text-xs';

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/keywords" className="text-sm text-foreground/60 hover:text-foreground">← {t('back')}</Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{initial.attraction_name}</h1>
          <p className="mt-1 text-sm text-foreground/60">
            <a href={initial.attraction_url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
              {initial.attraction_url}
            </a>
            {' · '}
            {market} · {initial.languages.join(', ').toUpperCase()}
          </p>
        </div>
        {statusChip}
      </div>

      {(status === 'queued' || status === 'running') && (
        <div className="mt-10 rounded-xl border border-black/10 dark:border-white/10 bg-card p-8 text-center">
          <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <p className="text-sm font-medium">{t('statusRunning')}</p>
          <p className="mt-1 text-sm text-foreground/60">{t('runningHint')}</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="mt-10 rounded-xl border border-rose-500/20 bg-rose-500/5 p-6">
          <p className="text-sm font-medium text-rose-600">{t('statusFailed')}</p>
          <p className="mt-1 text-sm text-foreground/70">
            {error === 'n8n webhook not configured' || error === 'not_configured' ? t('notConfigured') : t('failedHint')}
          </p>
          {error && <p className="mt-2 text-xs text-foreground/40">{error}</p>}
          <div className="mt-4 flex items-center gap-3">
            <Link href={`/keywords/new?from=${initial.id}`} className="inline-block rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium">
              {t('rerun')}
            </Link>
            <button onClick={remove} disabled={deleting} className="text-sm font-medium text-rose-500 hover:text-rose-600 disabled:opacity-40">
              {deleting ? t('deleting') : t('delete')}
            </button>
          </div>
        </div>
      )}

      {(status === 'ready' || status === 'approved') && (
        <>
          <p className="mt-6 text-sm text-foreground/60">{t('gateBHint')}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-foreground/60">
              {t('kept')}: {kept} / {rows.length} {t('total').toLowerCase()}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                onClick={() => save()}
                disabled={!dirty || saving}
                className="rounded-full border border-black/10 dark:border-white/10 px-4 py-1.5 text-sm font-medium disabled:opacity-40"
              >
                {saving ? t('saving') : t('save')}
              </button>
              <button onClick={exportXlsx} disabled={exporting} className="rounded-full border border-black/10 dark:border-white/10 px-4 py-1.5 text-sm font-medium disabled:opacity-40">
                {exporting ? t('exporting') : t('export')}
              </button>
              {approved ? (
                <button onClick={() => save(false)} className="rounded-full border border-black/10 dark:border-white/10 px-4 py-1.5 text-sm font-medium">
                  {t('unapprove')}
                </button>
              ) : (
                <button onClick={() => save(true)} className="rounded-full bg-emerald-600 text-white px-4 py-1.5 text-sm font-medium">
                  {t('approve')}
                </button>
              )}
              <Link href={`/keywords/new?from=${initial.id}`} className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium">
                {t('rerun')}
              </Link>
              <button onClick={remove} disabled={deleting} className="rounded-full border border-rose-300/50 px-4 py-1.5 text-sm font-medium text-rose-500 hover:bg-rose-500/5 disabled:opacity-40">
                {deleting ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="mt-8 text-sm text-foreground/60">{t('noResults')}</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-foreground/5 text-left text-xs uppercase text-foreground/60">
                  <tr>
                    <th className={cell}>{t('kwKeep')}</th>
                    <th className={cell}>{t('kwKeyword')}</th>
                    <th className={cell}>{t('kwLocal')}</th>
                    <th className={cell}>{t('kwGlobal')}</th>
                    <th className={cell}>{t('kwDiff')}</th>
                    <th className={cell}>{t('kwIntent')}</th>
                    <th className={cell}>{t('kwPriority')}</th>
                    <th className={cell}>{t('kwPage')}</th>
                    <th className={cell}>{t('kwNotes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className={`border-t border-black/5 dark:border-white/10 ${r.include === false ? 'opacity-40' : ''}`}>
                      <td className={cell}>
                        <input type="checkbox" checked={r.include !== false} onChange={(e) => edit(i, {include: e.target.checked})} />
                      </td>
                      <td className={`${cell} font-medium`}>{r.keyword}</td>
                      <td className={cell}>{r.local_vol ?? '—'}</td>
                      <td className={cell}>{r.global_vol ?? '—'}</td>
                      <td className={cell}>{r.difficulty ?? '—'}</td>
                      <td className={cell}>{r.intent}</td>
                      <td className={cell}>
                        <select className={sel} value={r.priority} onChange={(e) => edit(i, {priority: e.target.value})}>
                          {PRIORITIES.concat(PRIORITIES.includes(r.priority) ? [] : [r.priority]).map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className={cell}>
                        <select className={sel} value={r.page_type} onChange={(e) => edit(i, {page_type: e.target.value})}>
                          {PAGE_TYPES.concat(PAGE_TYPES.includes(r.page_type) ? [] : [r.page_type]).map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className={cell}>
                        <input
                          className="w-44 rounded-md border border-black/10 dark:border-white/10 bg-background px-2 py-1 text-xs"
                          value={r.notes ?? ''}
                          onChange={(e) => edit(i, {notes: e.target.value})}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {analysis && (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-5">
                <h2 className="text-sm font-semibold uppercase text-foreground/60">{t('analysisTitle')}</h2>
                {analysis.problems && <p className="mt-3 text-sm text-foreground/80">{analysis.problems}</p>}
                {analysis.competitor_coverage && <p className="mt-3 text-sm text-foreground/80">{analysis.competitor_coverage}</p>}
                {analysis.content_gaps && <p className="mt-3 text-sm text-foreground/80">{analysis.content_gaps}</p>}
              </div>
              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-5">
                <h2 className="text-sm font-semibold uppercase text-foreground/60">{t('recTitle')}</h2>
                {analysis.recommendations?.meta_title && (
                  <p className="mt-3 text-sm"><span className="text-foreground/50">{t('recMetaTitle')}: </span>{analysis.recommendations.meta_title}</p>
                )}
                {analysis.recommendations?.h1 && (
                  <p className="mt-2 text-sm"><span className="text-foreground/50">{t('recH1')}: </span>{analysis.recommendations.h1}</p>
                )}
                {analysis.recommendations?.faqs?.length ? (
                  <div className="mt-3">
                    <span className="text-sm text-foreground/50">{t('recFaqs')}:</span>
                    <ul className="mt-1 list-disc pl-5 text-sm text-foreground/80">
                      {analysis.recommendations.faqs.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {method && (
            <div className="mt-6 rounded-xl border border-black/10 dark:border-white/10 bg-card p-5">
              <h2 className="text-sm font-semibold uppercase text-foreground/60">{t('methodTitle')}</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-foreground/70">
                <li>
                  <span className="text-foreground/50">Attraction: </span>
                  {initial.attraction_name}{' '}
                  <a href={initial.attraction_url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">
                    {initial.attraction_url}
                  </a>
                </li>
                <li>
                  <span className="text-foreground/50">Target market: </span>
                  {market} · {initial.languages.join(', ').toUpperCase()}
                </li>
                {Array.isArray(method.seeds) && (method.seeds as string[]).length ? (
                  <li><span className="text-foreground/50">Seeds: </span>{(method.seeds as string[]).join('; ')}</li>
                ) : null}
                {Array.isArray(method.sources) && (method.sources as string[]).length ? (
                  <li><span className="text-foreground/50">Data sources: </span>{(method.sources as string[]).join(', ')}</li>
                ) : null}
                {Array.isArray(method.global_markets) && (method.global_markets as string[]).length ? (
                  <li><span className="text-foreground/50">Global volume: </span>{(method.global_markets as string[]).join(', ')}</li>
                ) : null}
                {typeof method.caveats === 'string' && method.caveats ? (
                  <li className="text-foreground/50">{method.caveats as string}</li>
                ) : null}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
