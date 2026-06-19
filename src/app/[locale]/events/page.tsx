import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import RegenerateButton from '@/components/RegenerateButton';
import {getEventMeta, type EventMeta, type Lang} from '@/lib/events';

export const dynamic = 'force-dynamic';

const LANGS: Lang[] = ['en', 'ru', 'ar', 'fr'];
const LANG_LABEL: Record<Lang, string> = {en: 'EN', ru: 'RU', ar: 'AR', fr: 'FR'};

function StatusBadge({status, published}: {status: string | null; published: boolean | null}) {
  const ok = published || status === 'published';
  const partial = status === 'partial';
  const cls = ok
    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
    : partial
    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
    : 'bg-red-500/15 text-red-600 dark:text-red-400';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status ?? 'unknown'}
    </span>
  );
}

function Field({
  label,
  value,
  rtl,
  limit
}: {
  label: string;
  value: string | null;
  rtl?: boolean;
  limit?: number;
}) {
  if (!value) return null;
  const len = [...value].length;
  const over = limit ? len > limit : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-foreground/45">
        <span>{label}</span>
        {limit && (
          <span className={over ? 'text-red-500' : 'text-foreground/40'}>
            {len}/{limit}
          </span>
        )}
      </div>
      <p dir={rtl ? 'rtl' : undefined} className="text-sm text-foreground/85">
        {value}
      </p>
    </div>
  );
}

export default async function EventsPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Events');

  let events: EventMeta[] = [];
  let error = false;
  try {
    events = await getEventMeta();
  } catch {
    error = true;
  }

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-6 py-12 w-full">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
            <p className="mt-1 text-sm text-foreground/60">{t('subtitle')}</p>
          </div>
          {!error && (
            <span className="text-sm text-foreground/50">
              {t('count')}: {events.length}
            </span>
          )}
        </div>

        {error ? (
          <p className="mt-10 text-foreground/70">{t('dbError')}</p>
        ) : events.length === 0 ? (
          <p className="mt-10 text-foreground/70">{t('empty')}</p>
        ) : (
          <div className="mt-8 space-y-5">
            {events.map((e) => (
              <article
                key={e.event_id}
                className="rounded-2xl border border-black/5 dark:border-white/10 p-5"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={e.status} published={e.published} />
                      <span className="text-xs text-foreground/45">
                        ID {e.event_id}
                      </span>
                      {e.generated_langs && (
                        <span className="text-xs text-foreground/45">
                          · {e.generated_langs.map((l) => l.toUpperCase()).join(' ')}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 font-semibold truncate">
                      {e.h1.en ?? e.meta_title.en ?? `Event ${e.event_id}`}
                    </h2>
                    {e.event_url && (
                      <a
                        href={e.event_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-500 hover:underline break-all"
                      >
                        {e.event_url}
                      </a>
                    )}
                  </div>
                  <RegenerateButton eventId={e.event_id} />
                </div>

                {/* Categories */}
                {e.event_types && e.event_types.length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-wide text-foreground/45">
                      {t('categories')}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {e.event_types.map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 text-xs"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Performers */}
                {e.performers && e.performers.length > 0 && (
                  <div className="mt-3">
                    <div className="text-[11px] uppercase tracking-wide text-foreground/45">
                      {t('performers')}
                    </div>
                    <div className="mt-1 text-sm text-foreground/85">
                      {e.performers.join(', ')}
                    </div>
                  </div>
                )}

                {/* Language blocks */}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {LANGS.map((l) => {
                    const has = e.h1[l] || e.meta_title[l] || e.meta_description[l];
                    if (!has) return null;
                    return (
                      <div
                        key={l}
                        className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-4"
                      >
                        <div className="text-xs font-semibold text-foreground/60">
                          {LANG_LABEL[l]}
                        </div>
                        <Field label="H1" value={e.h1[l]} rtl={l === 'ar'} />
                        <Field label="Meta Title" value={e.meta_title[l]} rtl={l === 'ar'} limit={60} />
                        <Field label="Meta Description" value={e.meta_description[l]} rtl={l === 'ar'} limit={250} />
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
