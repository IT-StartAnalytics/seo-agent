'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
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
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-foreground/40">
        <span>{label}</span>
        {limit ? <span className={over ? 'text-red-500' : 'text-foreground/35'}>{len}/{limit}</span> : null}
      </div>
      <p dir={rtl ? 'rtl' : undefined} className="text-sm text-foreground/85 break-words">{value}</p>
    </div>
  );
}

export default function EventRow({e, gen}: {e: CatalogEvent; gen: EventGenerated | null}) {
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

  const date = e.gen_date
    ? new Date(e.gen_date).toLocaleString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <>
      <tr className="border-b border-black/5 dark:border-white/10 align-top hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
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
                className="inline-flex items-center rounded-full border border-black/15 dark:border-white/20 px-2 py-0.5 text-[10px] text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] whitespace-nowrap"
              >
                {t('openPage')} ↗
              </a>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1 flex-wrap">
            <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-[10px] capitalize">
              {statusLabel(statusGroup(e.status))}
            </span>
            {e.is_new && (
              <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-medium">
                {t('newTab')}
              </span>
            )}
            {gen && (
              <button
                onClick={toggleReview}
                disabled={savingReview}
                title={review === 'approved' ? t('reviewPending') : t('approved')}
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
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
            <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium capitalize">
              {(gen.status ?? '').replace(/_/g, ' ') || t('generated')}
            </span>
          ) : (
            <span className="text-xs text-foreground/35">{t('notGenerated')}</span>
          )}
        </td>




        {/* When */}
        <td className="px-3 py-3 whitespace-nowrap text-xs text-foreground/60">{date ?? <span className="text-foreground/30">—</span>}</td>

        {/* Action */}
        <td className="px-3 py-3 whitespace-nowrap text-right">
          {gen && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-full border border-black/15 dark:border-white/20 px-2.5 py-0.5 text-[11px] text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            >
              {open ? t('hide') : t('open')}
            </button>
          )}
        </td>
      </tr>

      {open && gen && (
        <tr className="border-b border-black/5 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.02]">
          <td colSpan={4} className="px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {gen.langs.map((a) => (
                <div key={a.lang} className="rounded-xl border border-black/5 dark:border-white/10 bg-background p-3">
                  <div className="text-xs font-semibold text-foreground/60">{a.lang.toUpperCase()}</div>
                  <Field label="H1" value={a.h1} rtl={a.lang === 'ar'} />
                  <Field label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
                  <Field label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} />
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {gen.event_types.length > 0 && (
                <div className="rounded-xl border border-black/5 dark:border-white/10 bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/45">{t('categories')}</div>
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
                <div className="rounded-xl border border-black/5 dark:border-white/10 bg-background p-3">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/45">{t('performers')}</div>
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
