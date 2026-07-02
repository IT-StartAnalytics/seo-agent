'use client';

import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';
import {Link} from '@/i18n/navigation';
import type {CatalogVenue} from '@/lib/venues';

function MetaChips({en, ar}: {en: boolean; ar: boolean}) {
  const items: {label: string; on: boolean}[] = [
    {label: 'EN', on: en},
    {label: 'AR', on: ar}
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map(({label, on}) => (
        <span
          key={label}
          title={`${label}: ${on ? 'Meta present' : 'No meta yet'}`}
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none ${
            on
              ? 'bg-green-500/15 text-green-600 dark:text-green-400'
              : 'bg-foreground/10 text-foreground/45'
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

const PAGE = 100;
type Quick = 'all' | 'meta' | 'upcoming';

export default function VenuesBrowser({venues}: {venues: CatalogVenue[]}) {
  const t = useTranslations('Venues');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState<Quick>('all');
  const [visible, setVisible] = useState(PAGE);

  const counts = useMemo(() => {
    let meta = 0;
    let upcoming = 0;
    for (const v of venues) {
      if (v.has_meta_en || v.has_meta_ar) meta++;
      if ((v.upcoming_event_count ?? 0) > 0) upcoming++;
    }
    return {all: venues.length, meta, upcoming};
  }, [venues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter((v) => {
      if (quick === 'meta' && !(v.has_meta_en || v.has_meta_ar)) return false;
      if (quick === 'upcoming' && !((v.upcoming_event_count ?? 0) > 0)) return false;
      if (
        q &&
        !(
          v.venue_id.includes(q) ||
          (v.name ?? '').toLowerCase().includes(q) ||
          (v.city ?? '').toLowerCase().includes(q)
        )
      )
        return false;
      return true;
    });
  }, [venues, query, quick]);

  const shown = filtered.slice(0, visible);

  const quickBtn = (key: Quick, label: string, n: number) => (
    <button
      onClick={() => {
        setQuick(key);
        setVisible(PAGE);
      }}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        quick === key
          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
          : 'border-black/15 dark:border-white/20 bg-card shadow-sm hover:border-black/30 dark:hover:border-white/35'
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums text-foreground/45">{n}</span>
    </button>
  );

  return (
    <div className="mt-8">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {quickBtn('all', t('filterAll'), counts.all)}
        {quickBtn('upcoming', t('filterUpcoming'), counts.upcoming)}
        {quickBtn('meta', t('filterMeta'), counts.meta)}
        <span className="ml-auto text-xs text-foreground">{t('total')}: {venues.length}</span>
      </div>

      {/* Search */}
      <div className="mt-6 flex gap-2">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const id = query.trim().replace(/[^0-9]/g, '');
              if (id) router.push(`/venues/${id}`);
            }
          }}
          placeholder={t('searchPlaceholder')}
          className="flex-1 rounded-xl border border-black/15 dark:border-white/20 bg-card shadow-sm px-4 py-2.5 text-sm outline-none focus:border-indigo-500"
        />
      </div>

      <p className="mt-4 text-xs text-foreground">
        {t('count')}: {filtered.length}
      </p>

      {/* Table */}
      <div className="mt-2 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 bg-card shadow-sm">
        <table className="w-full min-w-[820px] text-sm table-fixed">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-foreground border-b border-black/10 dark:border-white/10 bg-black/[0.08] dark:bg-white/[0.07]">
              <th className="px-4 py-2.5 font-medium">{t('colVenue')}</th>
              <th className="w-[170px] px-3 py-2.5 font-medium">{t('colLocation')}</th>
              <th className="w-[130px] px-3 py-2.5 font-medium">{t('colEvents')}</th>
              <th className="w-[110px] px-3 py-2.5 font-medium">{t('colMeta')}</th>
              <th className="w-[96px] px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-foreground/60">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              shown.map((v) => (
                <tr key={v.venue_id} className="border-b border-black/5 dark:border-white/10 align-top">
                  {/* Venue */}
                  <td className="px-4 py-3 min-w-[240px]">
                    <Link href={`/venues/${v.venue_id}`} className="font-medium hover:underline line-clamp-2">
                      {v.name ?? `Venue ${v.venue_id}`}
                    </Link>
                    <div className="text-xs text-foreground/50 mt-1 flex items-center gap-2 flex-wrap">
                      <span>ID {v.venue_id}</span>
                      {v.url && (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-black/15 dark:border-white/20 px-2 py-0.5 text-xs text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] whitespace-nowrap"
                        >
                          {t('openPage')} ↗
                        </a>
                      )}
                    </div>
                  </td>

                  {/* Location */}
                  <td className="px-3 py-3 text-xs text-foreground/70">
                    {[v.city, v.country].filter(Boolean).join(', ') || <span className="text-foreground/30">—</span>}
                  </td>

                  {/* Events */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-foreground/70">
                    {v.events_count != null || v.upcoming_event_count != null ? (
                      <span>
                        {v.upcoming_event_count != null ? `${v.upcoming_event_count} / ` : ''}
                        {v.events_count ?? '—'}
                      </span>
                    ) : (
                      <span className="text-foreground/30">—</span>
                    )}
                  </td>

                  {/* Meta */}
                  <td className="px-3 py-3 align-middle">
                    <MetaChips en={v.has_meta_en} ar={v.has_meta_ar} />
                  </td>

                  {/* Action */}
                  <td className="px-3 py-3 whitespace-nowrap text-right">
                    <Link
                      href={`/venues/${v.venue_id}`}
                      className="rounded-full border border-black/15 dark:border-white/20 px-2.5 py-0.5 text-xs text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                    >
                      {t('open')}
                    </Link>
                  </td>
                </tr>
              ))
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
