'use client';

import {useTranslations} from 'next-intl';
import type {MetaVersion} from '@/lib/events';
import CopyButton from './CopyButton';
import SendArtistsButton from './SendArtistsButton';

const LANG_LABEL: Record<string, string> = {en: 'EN', ru: 'RU', ar: 'AR', fr: 'FR'};

// Read-only field that mirrors the Edit-tab inputs (same boxed look + char counter),
// so meta blocks look identical across tabs; only the Edit tab is actually editable.
function ReadField({
  label,
  value,
  rtl,
  limit,
  tall
}: {
  label: string;
  value: string | null;
  rtl?: boolean;
  limit?: number;
  tall?: boolean;
}) {
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

export default function MetaHistory({
  version,
  indexed,
  eventId,
  eventUrl
}: {
  version: MetaVersion;
  indexed?: Record<string, boolean> | null;
  eventId?: string;
  eventUrl?: string;
}) {
  const t = useTranslations('Events');
  const v = version;

  return (
    <div className="mt-2">
      <div className="grid gap-4 sm:grid-cols-2">
        {v.langs.map((a) => (
          <div key={a.lang} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4 space-y-3">
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
            <ReadField label="H1" value={a.h1} rtl={a.lang === 'ar'} />
            <ReadField label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
            <ReadField label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} tall />
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
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="text-xs uppercase tracking-wide text-foreground">{t('performers')}</div>
                <CopyButton text={v.performers.join('\n')} />
                <SendArtistsButton eventId={eventId} eventUrl={eventUrl} performers={v.performers} />
              </div>
              <div className="mt-1 text-sm text-foreground/85">{v.performers.join(', ')}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
