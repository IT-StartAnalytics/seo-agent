'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import MetaHistory from './MetaHistory';
import type {MetaVersion} from '@/lib/events';
import {isLangMismatch} from '@/lib/lang';

const LBL: Record<string, string> = {en: 'EN', ar: 'AR', ru: 'RU', fr: 'FR'};

type Live = {
  updated_at: string | null;
  langs: {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null}[];
} | null;

function Cell({label, value, rtl, limit, lang}: {label: string; value: string | null; rtl?: boolean; limit?: number; lang?: string}) {
  const len = value ? [...value].length : 0;
  const over = limit ? len > limit : false;
  const warn = lang ? isLangMismatch(lang, value) : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap text-xs uppercase tracking-wide text-foreground">
        <span>{label}</span>
        {limit ? (
          <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span>
        ) : (
          <span className="text-foreground/40">{len}</span>
        )}
        {warn && (
          <span className="inline-flex items-center gap-1 normal-case rounded-full bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
            mismatch
          </span>
        )}
      </div>
      <p dir={rtl ? 'rtl' : undefined} className={`text-sm ${value ? (warn ? 'text-amber-700 dark:text-amber-300' : 'text-foreground/85') : 'text-foreground/35'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export default function MetaTabs({
  versions,
  indexed,
  eventId,
  live
}: {
  versions: MetaVersion[];
  indexed?: Record<string, boolean> | null;
  eventId?: string;
  live: Live;
}) {
  const t = useTranslations('Events');
  const [tab, setTab] = useState<'gen' | 'live'>('gen');
  const liveLangs = live?.langs ?? [];
  const liveDate = live?.updated_at
    ? new Date(live.updated_at).toLocaleString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const tabBtn = (key: 'gen' | 'live', label: string) => (
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
      <div className="mb-3 inline-flex rounded-full border border-black/10 dark:border-white/10 bg-card p-0.5 text-xs font-medium">
        {tabBtn('gen', t('metaGenerated'))}
        {tabBtn('live', t('metaLive'))}
      </div>

      {tab === 'gen' ? (
        versions.length > 0 ? (
          <MetaHistory versions={versions} indexed={indexed} eventId={eventId} />
        ) : (
          <p className="text-sm text-foreground/55">{t('noGeneratedMeta')}</p>
        )
      ) : (
        <div>
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v4h1" />
            </svg>
            <span>{t('liveHint')}</span>
          </div>
          {liveLangs.length === 0 ? (
            <p className="text-sm text-foreground/55">{t('noLiveMeta')}</p>
          ) : (
            <>
          {liveDate && <div className="mb-2 text-xs text-foreground/50">{t('liveUpdated')}: {liveDate}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            {liveLangs.map((a) => (
              <div key={a.lang} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
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
                <Cell label="H1" value={a.h1} rtl={a.lang === 'ar'} lang={a.lang} />
                <Cell label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} lang={a.lang} />
                <Cell label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} lang={a.lang} />
              </div>
            ))}
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
