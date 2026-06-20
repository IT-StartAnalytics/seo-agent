'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';
import type {CatalogEvent, EventGenerated} from '@/lib/events';
import EventRow from './EventRow';

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

function FilterDropdown({
  label,
  options,
  selected,
  onToggle
}: {
  label: string;
  options: {key: string; label: string; value: number}[];
  selected: Set<string>;
  onToggle: (k: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const count = options.reduce((n, o) => (selected.has(o.key) ? n + 1 : n), 0);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
          count > 0
            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
            : 'border-black/15 dark:border-white/20 hover:border-black/30 dark:hover:border-white/35'
        }`}
      >
        <span>{label}</span>
        {count > 0 && (
          <span className="rounded-full bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 leading-none">{count}</span>
        )}
        <span className="text-foreground/40 text-[10px]">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1 min-w-[240px] rounded-xl border border-black/10 dark:border-white/15 bg-background shadow-lg p-1">
          {options.map((o) => {
            const on = selected.has(o.key);
            return (
              <button
                key={o.key}
                onClick={() => onToggle(o.key)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                      on ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-black/25 dark:border-white/30'
                    }`}
                  >
                    {on ? '✓' : ''}
                  </span>
                  {o.label}
                </span>
                <span className="tabular-nums text-foreground/45">{o.value}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
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
    const c: Record<string, number> = {all: events.length, new: 0, attractions: 0, generated: 0, not_generated: 0, review_pending: 0, approved: 0, rejected: 0};
    for (const e of events) {
      if (e.is_new) c.new++;
      if (e.is_attraction) c.attractions++;
      if (e.is_generated) c.generated++;
      else c.not_generated++;
      if (e.review === 'approved') c.approved++;
      else if (e.review === 'rejected') c.rejected++;
      if (e.is_generated && !e.review) c.review_pending++;
      const g = statusGroup(e.status);
      c[g] = (c[g] ?? 0) + 1;
    }
    return c;
  }, [events]);

  const cardLabel = (k: string) =>
    k === 'all'
      ? t('total')
      : k === 'new'
      ? t('newTab')
      : k === 'generated'
      ? t('generated')
      : k === 'not_generated'
      ? t('notGenerated')
      : k === 'review_pending'
      ? t('reviewPending')
      : k === 'approved'
      ? t('approved')
      : k === 'rejected'
      ? t('rejected')
      : groupLabel(k);
  const buildCards = (order: string[]) =>
    order
      .filter((k) => (counts[k] ?? 0) > 0 || k === 'all')
      .map((k) => ({key: k, label: cardLabel(k), value: counts[k] ?? 0}));
  // Group 1: processing (SEO workflow). Group 2: sale status.
  const procOptions = buildCards(['new', 'generated', 'not_generated', 'review_pending', 'approved', 'rejected']);
  const statusOptions = buildCards(['on_sale', 'coming', 'ended', 'sold_out', 'cancelled', 'moderation']);

  const matchesKey = (e: CatalogEvent, key: string) => {
    if (key === 'new') return e.is_new;
    if (key === 'attractions') return e.is_attraction;
    if (key === 'generated') return e.is_generated;
    if (key === 'not_generated') return !e.is_generated;
    if (key === 'approved') return e.review === 'approved';
    if (key === 'rejected') return e.review === 'rejected';
    if (key === 'review_pending') return e.is_generated && !e.review;
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

  const [summaries, setSummaries] = useState<Record<string, EventGenerated | null>>({});
  const shownKey = shown.map((e) => e.event_id).join(',');
  useEffect(() => {
    const need = shown
      .filter((e) => e.is_generated && summaries[e.event_id] === undefined)
      .map((e) => e.event_id);
    if (need.length === 0) return;
    let cancelled = false;
    fetch('/api/event-meta', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ids: need})
    })
      .then((r) => (r.ok ? r.json() : {}))
      .then((map: Record<string, EventGenerated>) => {
        if (cancelled) return;
        setSummaries((prev) => {
          const next = {...prev};
          for (const id of need) next[id] = map[id] ?? null;
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownKey]);

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
      {/* Filter dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown label={t('groupProcessing')} options={procOptions} selected={selected} onToggle={toggleFilter} />
        {statusOptions.length > 0 && (
          <FilterDropdown label={t('groupStatus')} options={statusOptions} selected={selected} onToggle={toggleFilter} />
        )}
        {selected.size > 0 && (
          <button
            onClick={() => {
              setSelected(new Set());
              setVisible(PAGE);
            }}
            className="rounded-full border border-black/15 dark:border-white/20 px-3 py-1.5 text-xs text-foreground/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            {t('reset')}
          </button>
        )}
        <span className="ml-auto text-xs text-foreground/45">
          {t('total')}: {events.length}
        </span>
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

      {/* List (table) */}
      <div className="mt-2 overflow-x-auto rounded-2xl border border-black/5 dark:border-white/10">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-foreground/45 border-b border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03]">
              <th className="px-4 py-2.5 font-medium">{t('colEvent')}</th>
              <th className="px-3 py-2.5 font-medium">{t('colStatus')}</th>
              <th className="px-3 py-2.5 font-medium">{t('colMeta')}</th>
              <th className="px-3 py-2.5 font-medium">{t('colLangs')}</th>
              <th className="px-3 py-2.5 font-medium">API</th>
              <th className="px-3 py-2.5 font-medium">{t('colWhen')}</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-5 text-foreground/60">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              shown.map((e) => <EventRow key={e.event_id} e={e} gen={summaries[e.event_id] ?? null} />)
            )}
          </tbody>
        </table>
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
