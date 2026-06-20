'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import type {MetaVersion} from '@/lib/events';

const LANG_LABEL: Record<string, string> = {en: 'EN', ru: 'RU', ar: 'AR', fr: 'FR'};

function Cell({label, value, rtl, limit}: {label: string; value: string | null; rtl?: boolean; limit?: number}) {
  const len = value ? [...value].length : 0;
  const over = limit ? len > limit : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-foreground/45">
        <span>{label}</span>
        {limit ? <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span> : null}
      </div>
      <p dir={rtl ? 'rtl' : undefined} className={`text-sm ${value ? 'text-foreground/85' : 'text-foreground/35'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

export default function MetaHistory({versions}: {versions: MetaVersion[]}) {
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
        <div className="text-xs font-semibold text-foreground/55">{t('adminMeta')}</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setI((x) => Math.max(0, x - 1))}
            disabled={i <= 0}
            className="rounded-full border border-black/15 dark:border-white/20 w-6 h-6 leading-none disabled:opacity-30 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            title={t('newer')}
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
            title={t('older')}
          >
            →
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {v.langs.map((a) => (
          <div key={a.lang} className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-4">
            <div className="text-xs font-semibold text-foreground/60">{LANG_LABEL[a.lang] ?? a.lang.toUpperCase()}</div>
            <Cell label="H1" value={a.h1} rtl={a.lang === 'ar'} />
            <Cell label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
            <Cell label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} />
          </div>
        ))}
      </div>
    </div>
  );
}
