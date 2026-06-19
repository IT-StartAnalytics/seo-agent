import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import EventsBrowser from '@/components/EventsBrowser';
import {getNewEvents, type NewEvent} from '@/lib/events';

export const dynamic = 'force-dynamic';

export default async function EventsPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Events');

  let events: NewEvent[] = [];
  let error = false;
  try {
    events = await getNewEvents();
  } catch {
    error = true;
  }

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-6xl px-6 py-12 w-full">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-foreground/60">{t('subtitle')}</p>
        {error ? (
          <p className="mt-10 text-foreground/70">{t('dbError')}</p>
        ) : (
          <EventsBrowser events={events} />
        )}
      </main>
    </>
  );
}
