'use client';

import {useTranslations} from 'next-intl';
import type {MetaVersion} from '@/lib/events';
import CopyButton from './CopyButton';

const LANG_LABEL: Record<string, string> = {en: 'EN', ru: 'RU', ar: 'AR', fr: 'FR'};

function Cell({label, value, rtl, limit}: {label: string; value: string | null; rtl?: boolean; limit?: number}) {
  const len = value ? [...value].length : 0;
  const over = limit ? len > limit : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground">
        <span>{label}</span>
        {limit ? <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span> : null}
      </div>
      <p dir={rtl ? 'rtl' : undefined} className={`text-sm ${value ? 'text-foreground/85' : 'text-foreground/35'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export default function MetaHistory({version, indexed}: {version: MetaVersion; indexed?: Record<string, boolean> | null}) {
  const t = useTranslations('Events');
  const v = version;

  return (
    <div className="mt-2">
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
            <Cell label="H1" value={a.h1} rtl={a.lang === 'ar'} />
            <Cell label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
            <Cell label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} />
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
              <div className="flex items-center gap-1.5">
                <div className="text-xs uppercase tracking-wide text-foreground">{t('performers')}</div>
                <CopyButton text={v.performers.join('\n')} />
              </div>
              <div className="mt-1 text-sm text-foreground/85">{v.performers.join(', ')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
