'use client';

import {useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';
import {Link} from '@/i18n/navigation';
import type {CatalogCategory} from '@/lib/categories';
import {pickDefaultCity, categoryUrlForCity} from '@/lib/categoryUrl';

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
type TypeFilter = 'all' | 'event' | 'attraction';

export default function CategoriesBrowser({categories}: {categories: CatalogCategory[]}) {
  const t = useTranslations('Categories');
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [visible, setVisible] = useState(PAGE);

  const counts = useMemo(() => {
    let event = 0;
    let attraction = 0;
    for (const c of categories) c.is_attraction ? attraction++ : event++;
    return {all: categories.length, event, attraction};
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((c) => {
      if (type === 'event' && c.is_attraction) return false;
      if (type === 'attraction' && !c.is_attraction) return false;
      if (q && !(c.category_id.includes(q) || (c.name ?? '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [categories, query, type]);

  const shown = filtered.slice(0, visible);

  const typeBtn = (key: TypeFilter, label: string, n: number) => (
    <button
      onClick={() => {
        setType(key);
        setVisible(PAGE);
      }}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        type === key
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
        {typeBtn('all', t('filterAll'), counts.all)}
        {typeBtn('event', t('filterEvent'), counts.event)}
        {typeBtn('attraction', t('filterAttraction'), counts.attraction)}
        <span className="ml-auto text-xs text-foreground">{t('total')}: {categories.length}</span>
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
              if (id) router.push(`/categories/${id}`);
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
              <th className="px-4 py-2.5 font-medium">{t('colCategory')}</th>
              <th className="w-[150px] px-3 py-2.5 font-medium">{t('colType')}</th>
              <th className="w-[130px] px-3 py-2.5 font-medium">{t('colEvents')}</th>
              <th className="w-[130px] px-3 py-2.5 font-medium">{t('colMeta')}</th>
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
              shown.map((c) => (
                <tr key={c.category_id} className="border-b border-black/5 dark:border-white/10 align-top">
                  {/* Category */}
                  <td className="px-4 py-3 min-w-[240px]">
                    <Link href={`/categories/${c.category_id}`} className="font-medium hover:underline line-clamp-2">
                      {c.name ?? `Category ${c.category_id}`}
                    </Link>
                    <div className="text-xs text-foreground/50 mt-1 flex items-center gap-2 flex-wrap">
                      <span>ID {c.category_id}</span>
                      {(() => {
                        const openUrl = categoryUrlForCity(c.url, pickDefaultCity(c.cities));
                        return openUrl ? (
                          <a
                            href={openUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full border border-black/15 dark:border-white/20 px-2 py-0.5 text-xs text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] whitespace-nowrap"
                          >
                            {t('openPage')} ↗
                          </a>
                        ) : null;
                      })()}
                      {!c.is_active && (
                        <span className="rounded-full bg-foreground/10 text-foreground/55 px-2 py-0.5 text-xs">
                          {t('inactive')}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-xs">
                      {c.is_attraction ? t('typeAttraction') : t('typeEvent')}
                    </span>
                  </td>

                  {/* Events */}
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-foreground/70">
                    {c.events_total != null ? (
                      <span>
                        {c.active_events != null ? `${c.active_events} / ` : ''}
                        {c.events_total}
                      </span>
                    ) : (
                      <span className="text-foreground/30">—</span>
                    )}
                  </td>

                  {/* Meta */}
                  <td className="px-3 py-3 align-middle">
                    <MetaChips en={c.has_meta_en} ar={c.has_meta_ar} />
                  </td>

                  {/* Action */}
                  <td className="px-3 py-3 whitespace-nowrap text-right">
                    <Link
                      href={`/categories/${c.category_id}`}
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
