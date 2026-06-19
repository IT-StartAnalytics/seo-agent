import {getTranslations, setRequestLocale} from 'next-intl/server';
import {getPublishedPages, type Page} from '@/lib/pages';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default async function ContentPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Content');

  let pages: Page[] = [];
  let error = false;
  try {
    pages = await getPublishedPages(locale);
  } catch {
    error = true;
  }

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-3xl px-6 py-16 w-full">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>

        {error ? (
          <p className="mt-6 text-foreground/70">{t('dbError')}</p>
        ) : pages.length === 0 ? (
          <p className="mt-6 text-foreground/70">{t('empty')}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-foreground/60">
              {t('count')}: {pages.length}
            </p>
            <ul className="mt-8 space-y-4">
              {pages.map((p) => (
                <li
                  key={p.id}
                  className="rounded-2xl border border-black/5 dark:border-white/10 p-5"
                >
                  <div className="text-xs uppercase tracking-wide text-foreground/50">
                    /{p.slug}
                  </div>
                  <h2 className="mt-1 font-semibold">{p.h1 ?? p.meta_title}</h2>
                  {p.meta_description && (
                    <p className="mt-1 text-sm text-foreground/70">
                      {p.meta_description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}
