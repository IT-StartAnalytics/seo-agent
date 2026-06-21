import {setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import ManualRegenerate from '@/components/ManualRegenerate';
import {Link} from '@/i18n/navigation';
import {getEventById, type EventDetail} from '@/lib/events';

export const dynamic = 'force-dynamic';

export default async function ManualRegeneratePage({
  params
}: {
  params: Promise<{locale: string; id: string}>;
}) {
  const {locale, id} = await params;
  setRequestLocale(locale);

  let data: EventDetail | null = null;
  try {
    data = await getEventById(id);
  } catch {
    data = null;
  }
  const name = data?.source?.name_en ?? `Event ${id}`;

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-6 py-10 w-full">
        <Link href={`/events/${id}`} className="text-sm text-indigo-500 hover:underline">
          ← Back to event
        </Link>

        <div className="mt-4 flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Manual regenerate</h1>
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-300">
            custom prompt
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground/60">
          {name} · ID {id}
        </p>

        <div className="mt-7">
          <ManualRegenerate />
        </div>
      </main>
    </>
  );
}
