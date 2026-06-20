import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import RegenerateButton from '@/components/RegenerateButton';
import ReviewButtons from '@/components/ReviewButtons';
import MetaHistory from '@/components/MetaHistory';
import {Link} from '@/i18n/navigation';
import {getEventById, type EventDetail} from '@/lib/events';

export const dynamic = 'force-dynamic';

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
                  <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5">
                    {data.is_attraction ? t('attraction') : t('event')}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      g ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {g ? t('generated') : t('notGenerated')}
                  </span>
                  {data.review === 'approved' && (
                    <span className="rounded-full px-2 py-0.5 font-medium bg-green-500/15 text-green-600 dark:text-green-400">
                      {t('approved')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <RegenerateButton eventId={data.event_id} />
                <ReviewButtons eventId={data.event_id} initial={data.review} />
              </div>
            </div>

            {/* Source data (incl. current admin meta tags) */}
            {data.source && (
              <section className="mt-7">
                <h2 className="text-sm font-semibold text-foreground/70">{t('source')}</h2>
                <div className="mt-2 rounded-2xl border border-black/10 dark:border-white/10 bg-card shadow-sm p-4">
                  <Row label={t('venue')} value={data.source.venue} />
                  <Row label={t('city')} value={[data.source.city, data.source.country].filter(Boolean).join(', ') || null} />
                  <Row label={t('dates')} value={[data.source.start, data.source.end].filter(Boolean).join(' → ') || null} />
                  <Row label={t('categories')} value={data.source.categories} />
                  <Row label={t('titleProtected')} value={data.source.is_title_protected ? (data.source.title_protection_reason || 'yes') : null} />
                  <Row label="URL" value={data.source.url} href={data.source.url} />
                  <Row label={t('description')} value={data.source.description} />

                  {data.history.length > 0 && <MetaHistory versions={data.history} />}
                </div>
              </section>
            )}

          </>
        )}
      </main>
    </>
  );
}
