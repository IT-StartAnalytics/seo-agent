import {useTranslations} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {use} from 'react';
import Header from '@/components/Header';
import Logo from '@/components/Logo';
import {Link} from '@/i18n/navigation';

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
  );
}
function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition-transform group-hover:translate-x-1">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const CATALOG_SECTIONS = [
  {href: '/events', key: 'events'},
  {href: '/attractions', key: 'attractions'},
  {href: '/categories', key: 'categories'},
  {href: '/venues', key: 'venues'},
  {href: '/artists', key: 'artists'}
] as const;

export default function Home({params}: {params: Promise<{locale: string}>}) {
  const {locale} = use(params);
  setRequestLocale(locale);
  const t = useTranslations('Home');
  const nav = useTranslations('Nav');
  const footer = useTranslations('Footer');

  return (
    <>
      <Header />

      <main className="flex-1 w-full">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Logo size={56} withWordmark={false} className="mb-6 justify-center" />
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
            <p className="mt-3 text-foreground/60">{t('subtitle')}</p>
          </div>

          {/* Global areas. Second area (research / planning) will be added here later. */}
          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
            <div className="group relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-card p-7 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 opacity-10 blur-2xl" />
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
                <TagIcon />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">{t('catalogAreaTitle')}</h2>
              <p className="mt-1.5 text-sm text-foreground/60">{t('catalogAreaDesc')}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {CATALOG_SECTIONS.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="rounded-full border border-black/10 dark:border-white/10 bg-background/60 px-3 py-1 text-xs font-medium text-foreground/70 hover:border-indigo-400/50 hover:text-foreground"
                  >
                    {nav(s.key)}
                  </Link>
                ))}
              </div>

              <Link
                href="/catalog"
                className="group mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-500"
              >
                {t('openCatalog')} <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-black/5 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-foreground/60 flex items-center justify-between">
          <span>SEO Agent</span>
          <span>© {new Date().getFullYear()} — {footer('rights')}</span>
        </div>
      </footer>
    </>
  );
}
