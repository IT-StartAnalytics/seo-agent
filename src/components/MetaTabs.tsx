'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import MetaHistory from './MetaHistory';
import type {MetaVersion} from '@/lib/events';

const LBL: Record<string, string> = {en: 'EN', ar: 'AR', ru: 'RU', fr: 'FR'};

type Live = {
  updated_at: string | null;
  langs: {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null}[];
} | null;

function Cell({label, value, rtl, limit}: {label: string; value: string | null; rtl?: boolean; limit?: number}) {
  const len = value ? [...value].length : 0;
  const over = limit ? len > limit : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground">
        <span>{label}</span>
        {limit ? (
          <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span>
        ) : (
          <span className="text-foreground/40">{len}</span>
        )}
      </div>
      <p dir={rtl ? 'rtl' : undefined} className={`text-sm ${value ? 'text-foreground/85' : 'text-foreground/35'}`}>
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
                <div className="text-xs font-semibold text-foreground/60">{LBL[a.lang] ?? a.lang.toUpperCase()}</div>
                <Cell label="H1" value={a.h1} rtl={a.lang === 'ar'} />
                <Cell label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
                <Cell label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} />
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
