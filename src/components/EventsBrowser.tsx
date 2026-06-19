'use client';

import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link, useRouter} from '@/i18n/navigation';
import type {CatalogEvent} from '@/lib/events';

function statusGroup(status: string | null): string {
  const s = (status ?? '').toLowerCase();
  if (!s) return 'unknown';
  if (s.startsWith('on_sale') || s === 'on sale') return 'on_sale';
  if (s === 'coming_soon' || s === 'pre_register') return 'coming';
  if (s === 'event_ended' || /ended|past|expired/.test(s)) return 'ended';
  if (s === 'sold_out') return 'sold_out';
  if (s === 'cancelled' || s === 'declined') return 'cancelled';
  if (s === 'pending' || s === 'approved') return 'moderation';
  return s;
}

const PAGE = 100;

export default function EventsBrowser({events}: {events: CatalogEvent[]}) {
  const t = useTranslations('Events');
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set()); // empty = all
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE);

  const groupLabel = (g: string) => {
    const map: Record<string, string> = {
      on_sale: t('onSale'),
      coming: t('comingSoon'),
      ended: t('ended'),
      sold_out: t('soldOut'),
      cancelled: t('cancelled'),
      moderation: t('moderation'),
      unknown: t('statusUnknown')
    };
    return map[g] ?? g.replace(/_/g, ' ');
  };

  // Counts for the cards
  const counts = useMemo(() => {
    const c: Record<string, number> = {all: events.length, new: 0, attractions: 0};
    for (const e of events) {
      if (e.is_new) c.new++;
      if (e.is_attraction) c.attractions++;
      const g = statusGroup(e.status);
      c[g] = (c[g] ?? 0) + 1;
    }
    return c;
  }, [events]);

  // Ordered card list (only show non-empty)
  const cards = useMemo(() => {
    const order = ['all', 'new', 'on_sale', 'coming', 'ended', 'sold_out', 'cancelled', 'moderation', 'attractions'];
    const label = (k: string) =>
      k === 'all' ? t('total') : k === 'new' ? t('newTab') : k === 'attractions' ? t('attractions') : groupLabel(k);
    return order
      .filter((k) => (counts[k] ?? 0) > 0 || k === 'all')
      .map((k) => ({key: k, label: label(k), value: counts[k] ?? 0}));
  }, [counts, t]);

  const matchesKey = (e: CatalogEvent, key: string) => {
    if (key === 'new') return e.is_new;
    if (key === 'attractions') return e.is_attraction;
    return statusGroup(e.status) === key;
  };
  const matchesActive = (e: CatalogEvent) => {
    if (selected.size === 0) return true; // "all"
    for (const key of selected) if (matchesKey(e, key)) return true;
    return false;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (!matchesActive(e)) return false;
      if (q && !(e.event_id.includes(q) || (e.name ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [events, selected, query]);

  const shown = filtered.slice(0, visible);

  function openById() {
    const id = query.trim().replace(/[^a-zA-Z0-9_-]/g, '');
    if (id) router.push(`/events/${id}`);
  }
  function toggleFilter(k: string) {
    setVisible(PAGE);
    if (k === 'all') {
      setSelected(new Set());
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  return (
    <div className="mt-8">
      {/* Clickable stat cards = filter (compact, wrap to one/few rows) */}
      <div className="flex flex-wrap gap-2">
        {cards.map((c) => {
          const on = c.key === 'all' ? selected.size === 0 : selected.has(c.key);
          return (
            <button
              key={c.key}
              onClick={() => toggleFilter(c.key)}
              className={`flex items-baseline gap-1.5 rounded-xl border px-3 py-1.5 transition-colors ${
                on
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-black/10 dark:border-white/12 hover:border-black/25 dark:hover:border-white/30'
              }`}
            >
              <span className="text-base font-semibold tabular-nums leading-none">{c.value}</span>
              <span className={`text-[11px] whitespace-nowrap ${on ? 'text-indigo-600 dark:text-indigo-300' : 'text-foreground/55'}`}>
                {c.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="mt-6 flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE);
          }}
          onKeyDown={(e) => e.key === 'Enter' && openById()}
          placeholder={t('searchPlaceholder')}
          className="flex-1 rounded-xl border border-black/15 dark:border-white/20 bg-background px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
        />
        <button onClick={openById} className="rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium whitespace-nowrap">
          {t('openById')}
        </button>
      </div>

      <p className="mt-4 text-xs text-foreground/45">
        {t('count')}: {filtered.length}
      </p>

      {/* List */}
      <div className="mt-2 divide-y divide-black/5 dark:divide-white/10 rounded-2xl border border-black/5 dark:border-white/10 overflow-hidden">
        {shown.length === 0 ? (
          <p className="p-5 text-sm text-foreground/60">{t('empty')}</p>
        ) : (
          shown.map((e) => (
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
                {e.is_new && (
                  <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium">
                    {t('newTab')}
                  </span>
                )}
                {e.is_attraction && (
                  <span className="rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 px-2 py-0.5 text-[11px]">
                    {t('attraction')}
                  </span>
                )}
                <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-[11px] capitalize">
                  {groupLabel(statusGroup(e.status))}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>

      {visible < filtered.length && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE)}
            className="rounded-full border border-black/15 dark:border-white/20 px-5 py-2 text-sm font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            {t('showMore')} ({filtered.length - visible})
          </button>
        </div>
      )}
    </div>
  );
}
