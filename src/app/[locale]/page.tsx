import {useTranslations} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {use} from 'react';
import Header from '@/components/Header';

export default function Home({
  params
}: {
  params: Promise<{locale: string}>;
}) {
  const {locale} = use(params);
  setRequestLocale(locale);
  const footer = useTranslations('Footer');

  return (
    <>
      <Header />

      <main className="flex-1" />

      <footer className="border-t border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-foreground/60 flex items-center justify-between">
          <span>SEO Agent</span>
          <span>© {new Date().getFullYear()} — {footer('rights')}</span>
        </div>
      </footer>
    </>
  );
}
