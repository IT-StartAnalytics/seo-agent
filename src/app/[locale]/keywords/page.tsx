import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import {Link} from '@/i18n/navigation';
import {listJobs} from '@/lib/keywordResearch';
import KeywordDeleteButton from '@/components/KeywordDeleteButton';

const CHIP: Record<string, string> = {
  queued: 'bg-slate-500/10 text-slate-500',
  running: 'bg-amber-500/10 text-amber-600',
  ready: 'bg-indigo-500/10 text-indigo-500',
  approved: 'bg-emerald-500/10 text-emerald-600',
  failed: 'bg-rose-500/10 text-rose-500'
};

export default async function KeywordsList({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('KeywordResearch');
  const jobs = await listJobs();

  const statusLabel: Record<string, string> = {
    queued: t('statusQueued'),
    running: t('statusRunning'),
    ready: t('statusReady'),
    approved: t('statusApproved'),
    failed: t('statusFailed')
  };

  return (
    <>
      <Header />
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
              <p className="mt-2 max-w-2xl text-sm text-foreground/60">{t('subtitle')}</p>
            </div>
            <Link href="/keywords/new" className="rounded-full bg-foreground text-background px-5 py-2 text-sm font-medium">
              {t('new')}
            </Link>
          </div>

          {jobs.length === 0 ? (
            <p className="mt-12 text-sm text-foreground/60">{t('empty')}</p>
          ) : (
            <div className="mt-8 overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-foreground/5 text-left text-xs uppercase text-foreground/60">
                  <tr>
                    <th className="px-4 py-2.5">{t('colName')}</th>
                    <th className="px-4 py-2.5">{t('colGeo')}</th>
                    <th className="px-4 py-2.5">{t('colLang')}</th>
                    <th className="px-4 py-2.5">{t('colStatus')}</th>
                    <th className="px-4 py-2.5">{t('colWhen')}</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => {
                    const geo = j.target_geo?.city ? `${j.target_geo.city}, ${j.target_geo.country}` : j.target_geo?.country;
                    return (
                      <tr key={j.id} className="border-t border-black/5 dark:border-white/10 hover:bg-foreground/[0.03]">
                        <td className="px-4 py-3 font-medium">{j.attraction_name}</td>
                        <td className="px-4 py-3 text-foreground/70">{geo}</td>
                        <td className="px-4 py-3 text-foreground/70 uppercase">{(j.languages || []).join(', ')}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CHIP[j.status] || CHIP.queued}`}>
                            {statusLabel[j.status] || j.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground/60">{new Date(j.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-4">
                            <Link href={`/keywords/${j.id}`} className="text-sm font-medium text-indigo-500">{t('open')}</Link>
                            <KeywordDeleteButton jobId={j.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
