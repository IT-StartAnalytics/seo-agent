import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import CopyButton from '@/components/CopyButton';
import {Link} from '@/i18n/navigation';
import {getVenueById, type VenueDetail} from '@/lib/venues';

export const dynamic = 'force-dynamic';

const LANG_LABEL: Record<string, string> = {en: 'EN', ar: 'AR'};

function Row({label, value, href, copy, rtl}: {label: string; value: string | null; href?: string | null; copy?: boolean; rtl?: boolean}) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1.5 text-sm border-b border-black/5 dark:border-white/10 last:border-0">
      <span className="w-32 shrink-0 text-foreground/50">{label}</span>
      <span className="flex items-start gap-1.5 min-w-0">
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline break-all">
            {value}
          </a>
        ) : (
          <span dir={rtl ? 'rtl' : undefined} className="text-foreground/85 break-words">{value}</span>
        )}
        {copy && <CopyButton text={value} />}
      </span>
    </div>
  );
}

function MetaField({label, value, rtl, limit}: {label: string; value: string | null; rtl?: boolean; limit?: number}) {
  if (!value) return null;
  const len = [...value].length;
  const over = limit ? len > limit : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/50">
        <span>{label}</span>
        {limit ? <span className={over ? 'text-red-500' : 'text-foreground/35'}>{len}/{limit}</span> : null}
        <CopyButton text={value} />
      </div>
      <p dir={rtl ? 'rtl' : undefined} className="text-sm text-foreground/85 break-words whitespace-pre-line">{value}</p>
    </div>
  );
}

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  const t = new Date(String(d).replace(' ', 'T'));
  return isNaN(t.getTime()) ? null : t.toLocaleDateString(undefined, {day: '2-digit', month: '2-digit', year: 'numeric'});
}

export default async function VenueDetailPage({
  params
}: {
  params: Promise<{locale: string; id: string}>;
}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Venues');

  let data: VenueDetail | null = null;
  let error = false;
  try {
    data = await getVenueById(id);
  } catch (e) {
    console.error('venue detail error', e);
    error = true;
  }

  const hasMeta = (data?.meta.length ?? 0) > 0;

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-7xl px-6 py-10 w-full">
        <Link href="/venues" className="text-sm text-indigo-500 hover:underline">
          ← {t('back')}
        </Link>

        {error ? (
          <p className="mt-8 text-foreground/70">{t('dbError')}</p>
        ) : !data || !data.found ? (
          <p className="mt-8 text-foreground/70">{t('notFound')}: {id}</p>
        ) : (
          <>
            <div className="mt-4">
              <h1 className="text-2xl font-semibold tracking-tight">{data.name ?? `Venue ${data.venue_id}`}</h1>
              {data.name_ar && <p dir="rtl" className="mt-1 text-sm text-foreground/60">{data.name_ar}</p>}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
                <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5">ID {data.venue_id}</span>
                {(data.city || data.country) && (
                  <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5">
                    {[data.city, data.country].filter(Boolean).join(', ')}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    hasMeta
                      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {hasMeta ? t('hasMeta') : t('noMetaShort')}
                </span>
              </div>
            </div>

            {/* Source data */}
            <section className="mt-7">
              <h2 className="text-sm font-semibold text-foreground">{t('source')}</h2>
              <div className="mt-2 rounded-2xl border border-black/10 dark:border-white/10 bg-muted shadow-sm p-4 space-y-4">
                <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
                  <Row label="URL" value={data.url} href={data.url} copy />
                  <Row label={t('city')} value={[data.city, data.country].filter(Boolean).join(', ') || null} />
                  <Row
                    label={t('events')}
                    value={
                      data.events_count != null || data.upcoming_event_count != null
                        ? `${data.upcoming_event_count ?? 0} ${t('upcomingLower')} / ${data.events_count ?? 0} ${t('totalLower')}`
                        : null
                    }
                  />
                  <Row label={t('lastEvent')} value={fmtDate(data.last_event_datetime)} />
                </div>

                {/* Meta tags */}
                <div>
                  <div className="mb-2 text-xs font-semibold text-foreground">{t('metaTags')}</div>
                  {hasMeta ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {data.meta.map((m) => (
                        <div key={m.lang} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
                          <div className="text-xs font-semibold text-foreground/60">{LANG_LABEL[m.lang] ?? m.lang.toUpperCase()}</div>
                          <MetaField label={t('metaTitle')} value={m.meta_title} rtl={m.lang === 'ar'} limit={60} />
                          <MetaField label={t('metaDescription')} value={m.meta_description} rtl={m.lang === 'ar'} limit={160} />
                          <MetaField label={t('info')} value={m.info} rtl={m.lang === 'ar'} />
                          <MetaField label={t('howToGetThere')} value={m.how_to_get_there} rtl={m.lang === 'ar'} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/55">{t('noMeta')}</p>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
