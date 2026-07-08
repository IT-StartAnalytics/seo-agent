import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import {Link} from '@/i18n/navigation';
import {getJob} from '@/lib/keywordResearch';
import KeywordJob, {type JobData} from '@/components/KeywordJob';

export default async function KeywordJobPage({
  params
}: {
  params: Promise<{locale: string; jobId: string}>;
}) {
  const {locale, jobId} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('KeywordResearch');
  const job = await getJob(jobId);

  return (
    <>
      <Header />
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-6xl px-6 py-12">
          {!job ? (
            <div>
              <Link href="/keywords" className="text-sm text-foreground/60 hover:text-foreground">← {t('back')}</Link>
              <p className="mt-6 text-sm text-foreground/60">{t('empty')}</p>
            </div>
          ) : (
            <KeywordJob initial={job as unknown as JobData} />
          )}
        </div>
      </main>
    </>
  );
}
