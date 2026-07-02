import {getTranslations, setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import ArtistsBrowser from '@/components/ArtistsBrowser';
import {getArtists, type CatalogArtist} from '@/lib/artists';

export const dynamic = 'force-dynamic';

export default async function ArtistsPage({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Artists');

  let artists: CatalogArtist[] = [];
  let error = false;
  try {
    artists = await getArtists();
  } catch {
    error = true;
  }

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-7xl px-6 py-12 w-full">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-foreground/60">{t('subtitle')}</p>
        {error ? (
          <p className="mt-10 text-foreground/70">{t('dbError')}</p>
        ) : (
          <ArtistsBrowser artists={artists} />
        )}
      </main>
    </>
  );
}
