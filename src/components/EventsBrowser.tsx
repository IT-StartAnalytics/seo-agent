'use client';

import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import type {NewEvent} from '@/lib/events';

type Tab = 'all' | 'events' | 'attractions';

export default function EventsBrowser({events}: {events: NewEvent[]}) {
  const t = useTranslations('Events');
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('all');
  const [onlyNew, setOnlyNew] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (tab === 'events' && e.is_attraction) return false;
      if (tab === 'attractions' && !e.is_attraction) return false;
      if (onlyNew && e.seo_done) return false;
      if (q && !(e.event_id.includes(q) || (e.name ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [events, tab, onlyNew, query]);

  const tabs: {key: Tab; label: string}[] = [
    {key: 'all', label: t('all')},
    {key: 'events', label: t('events')},
    {key: 'attractions', label: t('attractions')}
  ];

  function openById() {
    const id = query.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (id) router.push(`/events/${id}`);
  }

  return (
    <div className="mt-8">
      {/* Search by ID / name */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && openById()}
          placeholder={t('searchPlaceholder')}
          className="flex-1 rounded-xl border border-black/15 dark:border-white/20 bg-background px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
        />
        <button
          onClick={openById}
          className="rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium whitespace-nowrap"
        >
          {t('openById')}
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-full border border-black/10 dark:border-white/15 p-0.5 text-sm">
          {tabs.map((x) => (
            <button
              key={x.key}
              onClick={() => setTab(x.key)}
              className={`px-3.5 py-1 rounded-full transition-colors ${
                tab === x.key ? 'bg-foreground text-background' : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyNew}
            onChange={(e) => setOnlyNew(e.target.checked)}
            className="accent-indigo-500"
          />
          {t('onlyNew')}
        </label>
      </div>

      <p className="mt-3 text-xs text-foreground/45">
        {t('count')}: {filtered.length}
      </p>

      {/* List */}
      <div className="mt-3 divide-y divide-black/5 dark:divide-white/10 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-5 text-sm text-foreground/60">{t('empty')}</p>
        ) : (
          filtered.map((e) => (
            <Link
              key={e.event_id}
              href={`/events/${e.event_id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">{e.name ?? `Event ${e.event_id}`}</div>
                <div className="text-xs text-foreground/50 mt-0.5">
                  ID {e.event_id}
                  {e.city ? ` · ${e.city}` : ''}
                  {e.country ? `, ${e.country}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-[11px]">
                  {e.is_attraction ? t('attraction') : t('event')}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    e.seo_done
                      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {e.seo_done ? t('generated') : t('notGenerated')}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
