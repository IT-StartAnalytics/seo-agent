'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import CopyButton from './CopyButton';
import type {CatalogEvent, EventGenerated} from '@/lib/events';

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

function Field({label, value, rtl, limit}: {label: string; value: string | null; rtl?: boolean; limit?: number}) {
  if (!value) return null;
  const len = [...value].length;
  const over = limit ? len > limit : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/40">
        <span>{label}</span>
        {limit ? <span className={over ? 'text-red-500' : 'text-foreground/35'}>{len}/{limit}</span> : null}
      </div>
      <p dir={rtl ? 'rtl' : undefined} className="text-sm text-foreground/85 break-words">{value}</p>
    </div>
  );
}

// Robust date parse: try the raw value first (works for ISO + most Postgres strings),
// then a normalized ISO form; return null instead of an "Invalid Date".
function parseDate(d: string | null | undefined): Date | null {
  if (!d) return null;
  const raw = String(d);
  let t = new Date(raw);
  if (!isNaN(t.getTime())) return t;
  const iso = raw.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  t = new Date(iso);
  return isNaN(t.getTime()) ? null : t;
}

function IndexBadges({idx}: {idx: CatalogEvent['indexed']}) {
  if (!idx) return <span className="text-foreground/25 text-xs">—</span>;
  const langs: {k: 'en' | 'ar' | 'ru' | 'fr'; label: string}[] = [
    {k: 'en', label: 'EN'},
    {k: 'ar', label: 'AR'},
    {k: 'ru', label: 'RU'},
    {k: 'fr', label: 'FR'}
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {langs.map(({k, label}) => {
        const on = idx[k];
        return (
          <span
            key={k}
            title={`${label}: ${on ? 'Indexed' : 'No-index'}`}
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums ${
              on
                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                : 'bg-red-500/15 text-red-600 dark:text-red-400 line-through decoration-red-500/70'
            }`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

export default function EventRow({e, gen, changed}: {e: CatalogEvent; gen: EventGenerated | null; changed?: boolean}) {
  const t = useTranslations('Events');
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState<'approved' | null>(e.review === 'approved' ? 'approved' : null);
  const [savingReview, setSavingReview] = useState(false);

  async function toggleReview(ev: React.MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (savingReview) return;
    const next = review === 'approved' ? null : 'approved';
    setSavingReview(true);
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: e.event_id, status: next ?? 'clear'})
    });
    setSavingReview(false);
    if (res.ok) setReview(next);
  }

  const statusLabel = (k: string) =>
    (
      {
        on_sale: t('onSale'),
        coming: t('comingSoon'),
        ended: t('ended'),
        sold_out: t('soldOut'),
        cancelled: t('cancelled'),
        moderation: t('moderation'),
        unknown: t('statusUnknown')
      } as Record<string, string>
    )[k] ?? k.replace(/_/g, ' ');

  // Prefer the latest version's time (gen.finished_at = manual publish time when a
  // manual edit is the newest by chronology), falling back to the catalog gen date.
  const rawDate = gen?.finished_at ?? e.gen_date;
  const date = parseDate(rawDate)?.toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) ?? null;

  return (
    <>
      <tr className="border-b border-black/5 dark:border-white/10 align-top">
        {/* Event */}
        <td className="px-4 py-3 min-w-[240px]">
          <Link href={`/events/${e.event_id}`} className="font-medium hover:underline line-clamp-2">
            {e.name ?? `Event ${e.event_id}`}
          </Link>
          <div className="text-xs text-foreground/50 mt-1 flex items-center gap-2 flex-wrap">
            <span>
              ID {e.event_id}
              {e.city ? ` · ${e.city}` : ''}
            </span>
            {e.url && (
              <a
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-black/15 dark:border-white/20 px-2 py-0.5 text-xs text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] whitespace-nowrap"
              >
                {t('openPage')} ↗
              </a>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
            <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-xs capitalize">
              {statusLabel(statusGroup(e.status))}
            </span>
            {changed && (
              <span title="Source data (Venue/City/Dates) changed" className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
                Source changed
              </span>
            )}
            {gen && (
              <button
                onClick={toggleReview}
                disabled={savingReview}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  review === 'approved'
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
                }`}
              >
                {savingReview ? '…' : review === 'approved' ? t('approved') : t('reviewPending')}
              </button>
            )}
          </div>
        </td>

        {/* Status (generation) */}
        <td className="px-3 py-3 whitespace-nowrap">
          {gen ? (
            <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-xs font-medium capitalize">
              {(gen.status ?? '').replace(/_/g, ' ') || t('generated')}
            </span>
          ) : (
            <span className="text-xs text-foreground/35">{t('notGenerated')}</span>
          )}
        </td>

        {/* Indexation per language */}
        <td className="px-3 py-3 align-middle">
          <IndexBadges idx={e.indexed} />
        </td>




        {/* When */}
        <td className="px-3 py-3 whitespace-nowrap text-xs text-foreground/60">{date ?? <span className="text-foreground/30">—</span>}</td>

        {/* Action */}
        <td className="px-3 py-3 whitespace-nowrap text-right">
          {gen && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-full border border-black/15 dark:border-white/20 px-2.5 py-0.5 text-xs text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            >
              {open ? t('hide') : t('open')}
            </button>
          )}
        </td>
      </tr>

      {open && gen && (
        <tr className="border-b border-black/5 dark:border-white/10 bg-muted">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {gen.langs.map((a) => (
                <div key={a.lang} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-3">
                  <div className="text-xs font-semibold text-foreground/60">{a.lang.toUpperCase()}</div>
                  <Field label="H1" value={a.h1} rtl={a.lang === 'ar'} />
                  <Field label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
                  <Field label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} />
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {gen.event_types.length > 0 && (
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-3">
                  <div className="text-xs uppercase tracking-wide text-foreground">{t('categories')}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {gen.event_types.map((c) => (
                      <span key={c} className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 text-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {gen.performers.length > 0 && (
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-3">
                  <div className="flex items-center gap-1.5">
                    <div className="text-xs uppercase tracking-wide text-foreground">{t('performers')}</div>
                    <CopyButton text={gen.performers.join('\n')} />
                  </div>
                  <div className="mt-1.5 text-sm text-foreground/85">{gen.performers.join(', ')}</div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
