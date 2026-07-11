import {getTranslations} from 'next-intl/server';
import {cookies} from 'next/headers';
import {Link} from '@/i18n/navigation';
import {AUTH_COOKIE, verifySessionToken} from '@/lib/auth';
import ThemeToggle from './ThemeToggle';
import CatalogNav from './CatalogNav';
import Logo from './Logo';

export default async function Header() {
  const t = await getTranslations('Nav');
  const store = await cookies();
  const authed = await verifySessionToken(store.get(AUTH_COOKIE)?.value);

  return (
    <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-3 py-1 text-xs font-medium ring-1 ring-emerald-500/30"
            title="I'm here"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
              <circle cx="12" cy="11" r="2" />
            </svg>
            I&apos;m here
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          {authed && <CatalogNav />}
          {authed && (
            <Link
              href="/keywords"
              className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6.5" />
                <path d="M20 20l-4.8-4.8" />
              </svg>
              {t('keywords')}
            </Link>
          )}
          <ThemeToggle />
          {authed && (
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-medium"
              >
                {t('signOut')}
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
