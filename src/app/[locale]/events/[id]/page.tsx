import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import ReviewButtons from '@/components/ReviewButtons';
import CopyButton from '@/components/CopyButton';
import MetaTabs from '@/components/MetaTabs';
import {Link} from '@/i18n/navigation';
import {getEventById, type EventDetail} from '@/lib/events';
import {getMetaEdits, getPublishHistory} from '@/lib/metaEdits';
import type {MetaVersion} from '@/lib/events';

// Parse timestamps from different sources (Supabase ISO with a "T", Neon Postgres
// with a space, or a JS Date.toString()) into a comparable number for sorting.
function ts(d: string | null): number {
  if (!d) return 0;
  const raw = String(d).trim();
  // Postgres "2026-06-22 17:09:00.123+00" -> ISO-ish; normalize a bare "+00" offset.
  const iso = raw.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  const t = Date.parse(iso);
  if (!isNaN(t)) return t;
  const t2 = Date.parse(raw);
  return isNaN(t2) ? 0 : t2;
}

function mergeHistory(history: MetaVersion[], manual: {created_at: string; langs: MetaVersion['langs']}[]): MetaVersion[] {
  // Manual publishes only change H1/meta, not categories/performers. Inherit those from the
  // most recent generated run so the Categories/Performers blocks don't vanish on a manual version.
  const baseRun =
    history.find((v) => v.source === 'run' && ((v.event_types?.length ?? 0) > 0 || (v.performers?.length ?? 0) > 0)) ??
    history.find((v) => v.source === 'run');
  const inheritedTypes = baseRun?.event_types ?? [];
  const inheritedPerformers = baseRun?.performers ?? [];
  const manualV: MetaVersion[] = manual.map((m) => ({
    date: m.created_at,
    status: null,
    source: 'manual',
    langs: m.langs,
    event_types: inheritedTypes,
    performers: inheritedPerformers
  }));
  // Sort newest-first by parsed time (string localeCompare broke across formats).
  const dated = [...history.filter((v) => v.date), ...manualV].sort((a, b) => ts(b.date) - ts(a.date));
  const undated = history.filter((v) => !v.date);
  return [...dated, ...undated];
}

export const dynamic = 'force-dynamic';

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

const OV_LANGS = ['en', 'ar', 'ru', 'fr'] as const;
const OV_LABEL: Record<string, string> = {en: 'EN', ar: 'AR', ru: 'RU', fr: 'FR'};

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
  const savedEdits = data && data.found ? await getMetaEdits(id).catch(() => ({})) : {};
  const manualHistory = data && data.found ? await getPublishHistory(id).catch(() => []) : [];
  const combinedHistory = data ? mergeHistory(data.history, manualHistory) : [];
  const overviews = data?.source?.overviews ?? {en: null, ar: null, ru: null, fr: null};
  const ovLangs = OV_LANGS.filter((l) => overviews[l]);

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-7xl px-6 py-10 w-full">
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
                <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
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
                  <ReviewButtons eventId={data.event_id} initial={data.review} />
                </div>
              </div>
              <Link
                href={`/events/${data.event_id}/manual`}
                title="Generate meta tags with a custom prompt and model"
                className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-500/10 px-3.5 py-1.5 text-xs font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
                </svg>
                Manual regenerate
              </Link>
            </div>

            {/* Source data (incl. current admin meta tags) */}
            {data.source && (
              <section className="mt-7">
                <h2 className="text-sm font-semibold text-foreground">{t('source')}</h2>
                <div className="mt-2 rounded-2xl border border-black/10 dark:border-white/10 bg-muted shadow-sm p-4 space-y-4">
                  <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
                    <Row label={t('venue')} value={data.source.venue || '—'} />
                    <Row label={`${t('venue')} (AR)`} value={data.source.venue_ar} />
                    <Row label={t('city')} value={[data.source.city, data.source.country].filter(Boolean).join(', ') || null} />
                    <Row label={t('dates')} value={[data.source.start, data.source.end].filter(Boolean).join(' → ') || null} />
                    <Row label={t('categories')} value={data.source.categories} />
                    <Row label={t('titleProtected')} value={data.source.is_title_protected ? (data.source.title_protection_reason || 'yes') : null} />
                    <Row label="URL" value={data.source.url} href={data.source.url} copy />
                  </div>

                  {(data.history.length > 0 || (data.live?.langs.length ?? 0) > 0) && (
                    <MetaTabs versions={combinedHistory} indexed={data.indexed} eventId={data.event_id} live={data.live} savedEdits={savedEdits} />
                  )}

                  {ovLangs.length > 0 && (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-foreground">{t('description')}</div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {ovLangs.map((l) => {
                          const val = overviews[l] as string;
                          return (
                            <div key={l} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
                              <div className="text-xs font-semibold text-foreground/60">{OV_LABEL[l]}</div>
                              <div className="mt-2">
                                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground">
                                  <span>Overview Description</span>
                                  <span className="text-foreground/40">{[...val].length}</span>
                                </div>
                                <p dir={l === 'ar' ? 'rtl' : undefined} className="mt-1 text-sm text-foreground/85 break-words whitespace-pre-line">
                                  {val}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

          </>
        )}
      </main>
    </>
  );
}
