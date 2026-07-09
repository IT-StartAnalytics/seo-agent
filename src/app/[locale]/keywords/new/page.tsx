import {setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import KeywordIntake, {type IntakeInitial} from '@/components/KeywordIntake';
import {getJob} from '@/lib/keywordResearch';

export default async function NewKeywordResearch({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{from?: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const {from} = await searchParams;

  let initial: IntakeInitial | undefined;
  if (from) {
    const job = await getJob(from);
    if (job) {
      initial = {
        attraction_url: job.attraction_url,
        attraction_name: job.attraction_name,
        country: job.target_geo?.country ?? '',
        country_iso: job.target_geo?.country_iso ?? null,
        country_location_code: job.target_geo?.country_location_code ?? null,
        city: job.target_geo?.city ?? '',
        location_code: job.target_geo?.location_code ?? null,
        location_name: job.target_geo?.location_name ?? null,
        languages: job.languages,
        scope_excludes: job.scope_excludes ?? '',
        differentiators: job.differentiators ?? '',
        location_is_demand_market: job.location_is_demand_market ?? false
      };
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <KeywordIntake initial={initial} />
        </div>
      </main>
    </>
  );
}
