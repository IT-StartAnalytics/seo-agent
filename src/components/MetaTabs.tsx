'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import MetaHistory from './MetaHistory';
import MetaEditor from './MetaEditor';
import RegenerateButton from './RegenerateButton';
import type {MetaVersion} from '@/lib/events';

const LBL: Record<string, string> = {en: 'EN', ar: 'AR', ru: 'RU', fr: 'FR'};

type Live = {
  updated_at: string | null;
  langs: {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null}[];
} | null;

function Cell({label, value, rtl, limit, tall}: {label: string; value: string | null; rtl?: boolean; limit?: number; tall?: boolean}) {
  const len = value ? [...value].length : 0;
  const over = limit ? len > limit : false;
  return (
    <div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
        <span>{label}</span>
        {limit ? (
          <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span>
        ) : (
          <span className="text-foreground/40">{len}</span>
        )}
      </div>
      <div
        dir={rtl ? 'rtl' : undefined}
        className={`mt-1 w-full rounded-lg border border-black/15 dark:border-white/20 bg-muted px-3 py-1.5 text-sm whitespace-pre-line break-words ${
          value ? 'text-foreground/85' : 'text-foreground/35'
        } ${tall ? 'min-h-[6rem]' : 'min-h-[2.25rem]'}`}
      >
        {value || '—'}
      </div>
    </div>
  );
}

function fmtDate(d: string | null): string {
  if (!d) return '';
  const t = new Date(d);
  return isNaN(t.getTime())
    ? ''
    : t.toLocaleString(undefined, {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
}

export default function MetaTabs({
  versions,
  indexed: indexedInit,
  eventId,
  live: liveInit,
  savedEdits
}: {
  versions: MetaVersion[];
  indexed?: Record<string, boolean> | null;
  eventId?: string;
  live: Live;
  savedEdits?: Record<string, {h1: string | null; meta_title: string | null; meta_description: string | null}>;
}) {
  const t = useTranslations('Events');
  const [tab, setTab] = useState<'gen' | 'live' | 'edit'>('gen');
  const [i, setI] = useState(0);
  const [live, setLive] = useState<Live>(liveInit);
  const [indexed, setIndexed] = useState<Record<string, boolean> | null | undefined>(indexedInit);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  // Open the Edit tab directly when navigated to with a #edit hash (e.g. from Manual regenerate).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof window !== 'undefined' && window.location.hash === '#edit') setTab('edit');
  }, []);

  async function refresh() {
    if (!eventId || refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/live-meta?event_id=${encodeURIComponent(eventId)}`, {cache: 'no-store'});
      if (res.ok) {
        const d = await res.json();
        setLive(d.live ?? null);
        setIndexed(d.indexed ?? null);
        setCheckedAt(new Date());
      }
    } finally {
      setRefreshing(false);
    }
  }

  const liveLangs = live?.langs ?? [];
  const liveDate = live?.updated_at ? fmtDate(live.updated_at) : null;

  const total = versions.length;
  const idx = Math.min(i, Math.max(0, total - 1));
  const cur = total > 0 ? versions[idx] : null;
  const srcLabel = (v: MetaVersion): string =>
    v.source === 'manual' ? 'manual' : v.source === 'admin' ? t('adminOriginal') : v.status ? v.status.replace(/_/g, ' ') : 'generated';
  const srcCls = (v: MetaVersion): string =>
    v.source === 'manual' ? 'text-violet-600 dark:text-violet-300' : 'text-foreground/55';

  const tabBtn = (key: 'gen' | 'live' | 'edit', label: string) => (
    <button
      onClick={() => setTab(key)}
      className={`rounded-full px-3 py-1 transition-colors ${
        tab === key ? 'bg-foreground text-background' : 'text-foreground/60 hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-full border border-black/10 dark:border-white/10 bg-card p-0.5 text-xs font-medium">
          {tabBtn('live', t('metaLive'))}
          {tabBtn('gen', t('metaGenerated'))}
          {tabBtn('edit', 'Edit')}
        </div>

        {tab === 'gen' && (
          <div className="flex items-center gap-2 text-xs">
            {eventId && <RegenerateButton eventId={eventId} />}
            {total > 0 && cur && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setI((x) => Math.max(0, Math.min(x, total - 1) - 1))}
                  disabled={idx <= 0}
                  className="rounded-full border border-black/15 dark:border-white/20 w-6 h-6 leading-none disabled:opacity-30 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                  title={t('newer')}
                >
                  ←
                </button>
                <span className="tabular-nums whitespace-nowrap">
                  {idx + 1}/{total}
                  {fmtDate(cur.date) ? ` · ${fmtDate(cur.date)}` : ''} · <span className={srcCls(cur)}>{srcLabel(cur)}</span>
                </span>
                <button
                  onClick={() => setI((x) => Math.min(total - 1, Math.min(x, total - 1) + 1))}
                  disabled={idx >= total - 1}
                  className="rounded-full border border-black/15 dark:border-white/20 w-6 h-6 leading-none disabled:opacity-30 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                  title={t('older')}
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {tab === 'gen' ? (
        cur ? (
          <MetaHistory version={cur} indexed={indexed} />
        ) : (
          <p className="text-sm text-foreground/55">{t('noGeneratedMeta')}</p>
        )
      ) : tab === 'edit' ? (
        <MetaEditor eventId={eventId} versions={versions} live={live} savedEdits={savedEdits} />
      ) : (
        <div>
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v4h1" />
            </svg>
            <span>{t('liveHint')}</span>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing || !eventId}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 dark:border-white/20 bg-card px-3 py-1 text-xs font-medium text-foreground/75 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'animate-spin' : ''} aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <div className="text-xs text-foreground/45">
              {liveDate && <span>{t('liveUpdated')}: {liveDate}</span>}
              {checkedAt && (
                <span className="ml-2">
                  · checked {checkedAt.toLocaleTimeString(undefined, {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                </span>
              )}
            </div>
          </div>

          {liveLangs.length === 0 ? (
            <p className="text-sm text-foreground/55">{t('noLiveMeta')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {liveLangs.map((a) => (
                <div key={a.lang} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-foreground/60">{LBL[a.lang] ?? a.lang.toUpperCase()}</div>
                    {indexed && indexed[a.lang] !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          indexed[a.lang]
                            ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                            : 'bg-foreground/10 text-foreground/55'
                        }`}
                      >
                        {indexed[a.lang] ? t('indexed') : t('noIndex')}
                      </span>
                    )}
                  </div>
                  <Cell label="H1" value={a.h1} rtl={a.lang === 'ar'} />
                  <Cell label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
                  <Cell label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} tall />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
