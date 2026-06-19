import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import RegenerateButton from '@/components/RegenerateButton';
import {Link} from '@/i18n/navigation';
import {getEventById, LANGS, type EventDetail, type Lang} from '@/lib/events';

export const dynamic = 'force-dynamic';

const LANG_LABEL: Record<Lang, string> = {en: 'EN', ru: 'RU', ar: 'AR', fr: 'FR'};

// Always-rendered meta field (shows a dash when empty)
function MetaField({
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
  const len = value ? [...value].length : 0;
  const over = limit ? len > limit : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-foreground/45">
        <span>{label}</span>
        {limit && <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span>}
      </div>
      <p dir={rtl ? 'rtl' : undefined} className={`text-sm ${value ? 'text-foreground/85' : 'text-foreground/35'}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function Row({label, value, href}: {label: string; value: string | null; href?: string | null}) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1.5 text-sm border-b border-black/5 dark:border-white/10 last:border-0">
      <span className="w-32 shrink-0 text-foreground/50">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline break-all">
          {value}
        </a>
      ) : (
        <span className="text-foreground/85 break-words">{value}</span>
      )}
    </div>
  );
}

export default async function EventDetailPage({
  params
}: {
  params: Promise<{locale: string; id: string}>;
}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Events');

  let data: EventDetail | null = null;
  let error = false;
  try {
    data = await getEventById(id);
  } catch (e) {
    console.error('event detail error', e);
    error = true;
  }

  const empty: Record<Lang, string | null> = {en: null, ru: null, ar: null, fr: null};
  const g = data?.generated;

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-6 py-10 w-full">
        <Link href={data?.is_attraction ? '/attractions' : '/events'} className="text-sm text-indigo-500 hover:underline">
          ← {t('back')}
        </Link>

        {error ? (
          <p className="mt-8 text-foreground/70">{t('dbError')}</p>
        ) : !data || !data.found ? (
          <p className="mt-8 text-foreground/70">{t('notFound')}: {id}</p>
        ) : (
          <>
            <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {data.source?.name_en ?? `Event ${data.event_id}`}
                </h1>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5">ID {data.event_id}</span>
                  {data.stream && (
                    <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5">
                      {data.stream.is_attraction ? t('attraction') : t('event')}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      g ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {g ? t('generated') : t('notGenerated')}
                  </span>
                </div>
              </div>
              <RegenerateButton eventId={data.event_id} />
            </div>

            {/* Source data */}
            {data.source && (
              <section className="mt-7">
                <h2 className="text-sm font-semibold text-foreground/70">{t('source')}</h2>
                <div className="mt-2 rounded-2xl border border-black/5 dark:border-white/10 p-4">
                  <Row label={t('venue')} value={data.source.venue} />
                  <Row label={t('city')} value={[data.source.city, data.source.country].filter(Boolean).join(', ') || null} />
                  <Row label={t('dates')} value={[data.source.start, data.source.end].filter(Boolean).join(' → ') || null} />
                  <Row label={t('categories')} value={data.source.categories} />
                  <Row label={t('titleProtected')} value={data.source.is_title_protected ? (data.source.title_protection_reason || 'yes') : null} />
                  <Row label="URL" value={data.source.url} href={data.source.url} />
                  <Row label={t('description')} value={data.source.description} />
                </div>
              </section>
            )}

            {/* Existing meta tags from the admin panel (raw_payload) */}
            {data.admin && (
              <section className="mt-7">
                <h2 className="text-sm font-semibold text-foreground/70">{t('adminMeta')}</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {LANGS.map((l) => (
                    <div key={l} className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-4">
                      <div className="text-xs font-semibold text-foreground/60">{LANG_LABEL[l]}</div>
                      <MetaField label="H1" value={data.admin!.h1[l]} rtl={l === 'ar'} />
                      <MetaField label="Meta Title" value={data.admin!.meta_title[l]} rtl={l === 'ar'} limit={60} />
                      <MetaField label="Meta Description" value={data.admin!.meta_description[l]} rtl={l === 'ar'} limit={250} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Generated meta tags - always shown (empty when not generated) */}
            <section className="mt-7">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground/70">{t('generatedMeta')}</h2>
                {!g && <span className="text-xs text-foreground/45">· {t('notGeneratedYet')}</span>}
              </div>

              {g && (g.event_types?.length || g.performers?.length) ? (
                <div className="mt-3 flex flex-col gap-3">
                  {g.event_types && g.event_types.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-foreground/45">{t('categories')}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {g.event_types.map((c) => (
                          <span key={c} className="rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 px-2.5 py-0.5 text-xs">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {g.performers && g.performers.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-foreground/45">{t('performers')}</div>
                      <div className="mt-1 text-sm text-foreground/85">{g.performers.join(', ')}</div>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {LANGS.map((l) => {
                  const h1 = (g?.h1 ?? empty)[l];
                  const mt = (g?.meta_title ?? empty)[l];
                  const md = (g?.meta_description ?? empty)[l];
                  return (
                    <div key={l} className="rounded-xl bg-black/[0.02] dark:bg-white/[0.03] p-4">
                      <div className="text-xs font-semibold text-foreground/60">{LANG_LABEL[l]}</div>
                      <MetaField label="H1" value={h1} rtl={l === 'ar'} />
                      <MetaField label="Meta Title" value={mt} rtl={l === 'ar'} limit={60} />
                      <MetaField label="Meta Description" value={md} rtl={l === 'ar'} limit={250} />
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
