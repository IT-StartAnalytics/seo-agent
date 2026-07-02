import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import CopyButton from '@/components/CopyButton';
import {Link} from '@/i18n/navigation';
import {getArtistById, type ArtistDetail} from '@/lib/artists';

export const dynamic = 'force-dynamic';

const LANG_LABEL: Record<string, string> = {en: 'EN', ar: 'AR', tr: 'TR'};

function Row({label, value, href, copy}: {label: string; value: string | null; href?: string | null; copy?: boolean}) {
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
          <span className="text-foreground/85 break-words">{value}</span>
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

export default async function ArtistDetailPage({
  params
}: {
  params: Promise<{locale: string; id: string}>;
}) {
  const {locale, id} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Artists');

  let data: ArtistDetail | null = null;
  let error = false;
  try {
    data = await getArtistById(id);
  } catch (e) {
    console.error('artist detail error', e);
    error = true;
  }

  const hasMeta = (data?.meta.length ?? 0) > 0;

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-7xl px-6 py-10 w-full">
        <Link href="/artists" className="text-sm text-indigo-500 hover:underline">
          ← {t('back')}
        </Link>

        {error ? (
          <p className="mt-8 text-foreground/70">{t('dbError')}</p>
        ) : !data || !data.found ? (
          <p className="mt-8 text-foreground/70">{t('notFound')}: {id}</p>
        ) : (
          <>
            <div className="mt-4">
              <h1 className="text-2xl font-semibold tracking-tight">{data.name ?? `Artist ${data.artist_id}`}</h1>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
                <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5">ID {data.artist_id}</span>
                {data.event_count != null && (
                  <span className="rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5">
                    {data.event_count} {t('eventsLower')}
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
                  <Row label={t('events')} value={data.event_count != null ? String(data.event_count) : null} />
                  <Row label={t('tickets')} value={data.ticket_count != null ? String(data.ticket_count) : null} />
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
                          <MetaField label={t('metaKeywords')} value={m.meta_keywords} rtl={m.lang === 'ar'} />
                          <MetaField label={t('bio')} value={m.bio} rtl={m.lang === 'ar'} />
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
