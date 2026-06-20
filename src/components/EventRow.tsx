'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
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

type Gen = {
  status: string | null;
  finished_at: string | null;
  generated_langs: string[];
  published_langs: string[];
  unpublished_langs: string[];
  api_status_code: number | null;
  api_status_msg: string | null;
  langs: {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null}[];
  event_types: string[];
  performers: string[];
} | null;

function LangChips({label, langs, tone}: {label: string; langs: string[]; tone: string}) {
  if (!langs || langs.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase text-foreground/40 w-8">{label}</span>
      <div className="flex flex-wrap gap-1">
        {langs.map((l) => (
          <span key={l} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
            {l.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
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

export default function EventRow({e}: {e: CatalogEvent}) {
  const t = useTranslations('Events');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Gen>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      try {
        const res = await fetch(`/api/event-meta?id=${e.event_id}`);
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    }
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

  const date = data?.finished_at
    ? new Date(data.finished_at).toLocaleString(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
        <div className="min-w-0 flex-1">
          <Link href={`/events/${e.event_id}`} className="block font-medium truncate hover:underline">
            {e.name ?? `Event ${e.event_id}`}
          </Link>
          <div className="text-xs text-foreground/50 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>
              ID {e.event_id}
              {e.city ? ` · ${e.city}` : ''}
              {e.country ? `, ${e.country}` : ''}
            </span>
            {e.url && (
              <a
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border border-black/15 dark:border-white/20 px-2.5 py-0.5 text-[11px] text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] whitespace-nowrap"
              >
                {t('openPage')} ↗
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {e.is_new && (
            <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium">
              {t('newTab')}
            </span>
          )}
          <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 text-[11px] capitalize">
            {statusLabel(statusGroup(e.status))}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              e.is_generated
                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}
          >
            {e.is_generated ? t('generated') : t('notGenerated')}
          </span>
          {e.review && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                e.review === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400'
              }`}
            >
              {e.review === 'approved' ? t('approved') : t('rejected')}
            </span>
          )}
          {e.is_generated && (
            <button
              onClick={toggle}
              className="rounded-full border border-black/15 dark:border-white/20 px-2.5 py-0.5 text-[11px] text-foreground/70 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
            >
              {open ? t('hide') : t('open')}
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-5 bg-black/[0.015] dark:bg-white/[0.02]">
          {loading ? (
            <p className="text-xs text-foreground/50 py-2">…</p>
          ) : !data ? (
            <p className="text-xs text-foreground/50 py-2">{t('notGeneratedYet')}</p>
          ) : (
            <>
              {/* Header: status, langs, api, date */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-3 text-xs">
                {data.status && (
                  <span className="rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 font-medium capitalize">
                    {data.status.replace(/_/g, ' ')}
                  </span>
                )}
                <div className="flex flex-col gap-1">
                  <LangChips label="PUB" langs={data.published_langs} tone="bg-green-500/15 text-green-600 dark:text-green-400" />
                  <LangChips label="GEN" langs={data.generated_langs} tone="bg-indigo-500/15 text-indigo-600 dark:text-indigo-300" />
                  <LangChips label="REJ" langs={data.unpublished_langs} tone="bg-red-500/15 text-red-600 dark:text-red-400" />
                </div>
                {data.api_status_code && (
                  <span className="text-foreground/50">
                    API {data.api_status_code}
                    {data.api_status_msg ? ` ${data.api_status_msg}` : ''}
                  </span>
                )}
                {date && (
                  <span className="text-foreground/50">
                    {t('genDate')}: {date}
                  </span>
                )}
              </div>

              {/* Language blocks */}
              <div className="grid gap-3 sm:grid-cols-2">
                {data.langs.map((a) => (
                  <div key={a.lang} className="rounded-xl border border-black/5 dark:border-white/10 bg-background p-3">
                    <div className="text-xs font-semibold text-foreground/60">{a.lang.toUpperCase()}</div>
                    <Field label="H1" value={a.h1} rtl={a.lang === 'ar'} />
                    <Field label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
                    <Field label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} />
                  </div>
                ))}
              </div>

              {/* Event types + performers */}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {data.event_types.length > 0 && (
                  <div className="rounded-xl border border-black/5 dark:border-white/10 bg-background p-3">
                    <div className="text-[10px] uppercase tracking-wide text-foreground/45">{t('categories')}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {data.event_types.map((c) => (
                        <span key={c} className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 text-xs">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {data.performers.length > 0 && (
                  <div className="rounded-xl border border-black/5 dark:border-white/10 bg-background p-3">
                    <div className="text-[10px] uppercase tracking-wide text-foreground/45">{t('performers')}</div>
                    <div className="mt-1.5 text-sm text-foreground/85">{data.performers.join(', ')}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
