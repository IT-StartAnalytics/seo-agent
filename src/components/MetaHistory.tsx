'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import type {MetaVersion} from '@/lib/events';
import RegenerateButton from './RegenerateButton';
import {isLangMismatch} from '@/lib/lang';

const LANG_LABEL: Record<string, string> = {en: 'EN', ru: 'RU', ar: 'AR', fr: 'FR'};

function Cell({label, value, rtl, limit, lang}: {label: string; value: string | null; rtl?: boolean; limit?: number; lang?: string}) {
  const len = value ? [...value].length : 0;
  const over = limit ? len > limit : false;
  const warn = lang ? isLangMismatch(lang, value) : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap text-xs uppercase tracking-wide text-foreground">
        <span>{label}</span>
        {limit ? <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span> : null}
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

export default function MetaHistory({versions, indexed, eventId}: {versions: MetaVersion[]; indexed?: Record<string, boolean> | null; eventId?: string}) {
  const t = useTranslations('Events');
  const [i, setI] = useState(0);
  if (!versions.length) return null;

  const v = versions[i];
  const date = v.date
    ? new Date(v.date).toLocaleString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;
  const labelRight = date ?? (v.source === 'admin' ? t('adminOriginal') : '');

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          {i === 0 && v.source === 'run' && (
            <span className="rounded-full bg-green-500/15 text-green-600 dark:text-green-400 px-2 py-0.5 text-xs font-medium">
              {t('lastGeneration')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {eventId && <RegenerateButton eventId={eventId} />}
          <button
            onClick={() => setI((x) => Math.max(0, x - 1))}
            disabled={i <= 0}
            className="rounded-full border border-black/15 dark:border-white/20 w-6 h-6 leading-none disabled:opacity-30 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            ←
          </button>
          <span className="text-foreground/55 tabular-nums whitespace-nowrap">
            {i + 1}/{versions.length}
            {labelRight ? ` · ${labelRight}` : ''}
            {v.status ? ` · ${v.status.replace(/_/g, ' ')}` : ''}
          </span>
          <button
            onClick={() => setI((x) => Math.min(versions.length - 1, x + 1))}
            disabled={i >= versions.length - 1}
            className="rounded-full border border-black/15 dark:border-white/20 w-6 h-6 leading-none disabled:opacity-30 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {v.langs.map((a) => (
          <div key={a.lang} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-foreground/60">{LANG_LABEL[a.lang] ?? a.lang.toUpperCase()}</div>
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

      {(v.event_types.length > 0 || v.performers.length > 0) && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {v.event_types.length > 0 && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
              <div className="text-xs uppercase tracking-wide text-foreground">{t('categories')}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {v.event_types.map((c) => (
                  <span key={c} className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 text-xs">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {v.performers.length > 0 && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
              <div className="text-xs uppercase tracking-wide text-foreground">{t('performers')}</div>
              <div className="mt-1 text-sm text-foreground/85">{v.performers.join(', ')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
