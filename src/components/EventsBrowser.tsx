'use client';

import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import type {NewEvent} from '@/lib/events';

type TypeTab = 'all' | 'events' | 'attractions';

// Normalize raw status into a few buckets used for tabs.
function normStatus(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (!s) return 'unknown';
  if (s.startsWith('on_sale') || s === 'on sale') return 'on_sale';
  if (/ended|finished|past|closed|expired|sold_out|sold out|cancel/.test(s)) return 'ended';
  return s;
}

export default function EventsBrowser({events}: {events: NewEvent[]}) {
  const t = useTranslations('Events');
  const router = useRouter();
  const [typeTab, setTypeTab] = useState<TypeTab>('all');
  const [statusTab, setStatusTab] = useState<string>('all'); // 'all' | 'new' | <normStatus>
  const [query, setQuery] = useState('');

  // Distinct normalized statuses present in the data (for dynamic tabs)
  const statuses = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => set.add(normStatus(e.status)));
    return [...set];
  }, [events]);

  const statusLabel = (key: string) => {
    if (key === 'on_sale') return t('onSale');
    if (key === 'ended') return t('ended');
    if (key === 'unknown') return t('statusUnknown');
    return key.replace(/_/g, ' ');
  };

  const byType = (e: NewEvent) =>
    typeTab === 'all' ? true : typeTab === 'attractions' ? e.is_attraction : !e.is_attraction;

  // Stats respect the current type filter
  const scoped = useMemo(() => events.filter(byType), [events, typeTab]);
  const stats = useMemo(
    () => ({
      total: scoped.length,
      neu: scoped.filter((e) => !e.seo_done).length,
      onSale: scoped.filter((e) => normStatus(e.status) === 'on_sale').length,
      attractions: events.filter((e) => e.is_attraction).length
    }),
    [scoped, events]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((e) => {
      if (statusTab === 'new' && e.seo_done) return false;
      if (statusTab !== 'all' && statusTab !== 'new' && normStatus(e.status) !== statusTab) return false;
      if (q && !(e.event_id.includes(q) || (e.name ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [scoped, statusTab, query]);

  function openById() {
    const id = query.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (id) router.push(`/events/${id}`);
  }

  const typeTabs: {key: TypeTab; label: string}[] = [
    {key: 'all', label: t('all')},
    {key: 'events', label: t('events')},
    {key: 'attractions', label: t('attractions')}
  ];

  const statusTabs = [
    {key: 'all', label: t('all')},
    {key: 'new', label: t('newTab')},
    ...statuses.map((s) => ({key: s, label: statusLabel(s)}))
  ];

  const cards = [
    {label: t('total'), value: stats.total},
    {label: t('newTab'), value: stats.neu},
    {label: t('onSale'), value: stats.onSale},
    {label: t('attractions'), value: stats.attractions}
  ];

  return (
    <div className="mt-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-black/5 dark:border-white/10 p-4">
            <div className="text-2xl font-semibold tabular-nums">{c.value}</div>
            <div className="mt-1 text-xs text-foreground/55">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mt-6 flex gap-2">
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

      {/* Type filter */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-foreground/45 mr-1">{t('typeLabel')}:</span>
        <div className="inline-flex rounded-full border border-black/10 dark:border-white/15 p-0.5 text-sm">
          {typeTabs.map((x) => (
            <button
              key={x.key}
              onClick={() => setTypeTab(x.key)}
              className={`px-3.5 py-1 rounded-full transition-colors ${
                typeTab === x.key ? 'bg-foreground text-background' : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status tabs */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-foreground/45 mr-1">{t('statusLabel')}:</span>
        <div className="inline-flex flex-wrap rounded-full border border-black/10 dark:border-white/15 p-0.5 text-sm">
          {statusTabs.map((x) => (
            <button
              key={x.key}
              onClick={() => setStatusTab(x.key)}
              className={`px-3.5 py-1 rounded-full transition-colors capitalize ${
                statusTab === x.key ? 'bg-foreground text-background' : 'text-foreground/70 hover:text-foreground'
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-foreground/45">
        {t('count')}: {filtered.length}
      </p>

      {/* List */}
      <div className="mt-2 divide-y divide-black/5 dark:divide-white/10 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
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
                <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-[11px] capitalize">
                  {statusLabel(normStatus(e.status))}
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
