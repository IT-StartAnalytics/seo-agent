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
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>
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
          {authed && (
            <Link
              href="/costs"
              className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 1v22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              {t('costs')}
            </Link>
          )}
          {authed && (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              {t('settings')}
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
