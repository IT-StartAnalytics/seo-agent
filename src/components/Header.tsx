import {getTranslations} from 'next-intl/server';
import {cookies} from 'next/headers';
import {Link} from '@/i18n/navigation';
import {AUTH_COOKIE, verifySessionToken} from '@/lib/auth';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

export default async function Header() {
  const t = await getTranslations('Nav');
  const store = await cookies();
  const authed = await verifySessionToken(store.get(AUTH_COOKIE)?.value);

  return (
    <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center" data-tip="Home" data-tip-pos="bottom">
          <Logo />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {authed && (
            <>
              <Link href="/events" data-tip="Browse events catalog" data-tip-pos="bottom" className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V9a2 2 0 0 0 0 4v1.5A1.5 1.5 0 0 1 18.5 16h-13A1.5 1.5 0 0 1 4 14.5V13a2 2 0 0 0 0-4z" />
                  <path d="M14 6v10" strokeDasharray="1 2.2" />
                </svg>
                {t('events')}
              </Link>
              <Link href="/attractions" data-tip="Browse attractions catalog" data-tip-pos="bottom" className="inline-flex items-center gap-1.5 text-foreground/70 hover:text-foreground">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="10" r="7.2" />
                  <circle cx="12" cy="10" r="1.7" />
                  <path d="M12 2.8v5.5M12 11.7v5.5M4.8 10h5.5M13.7 10h5.5M6.9 4.9l3.9 3.9M13.2 11.2l3.9 3.9M17.1 4.9l-3.9 3.9M10.8 11.2l-3.9 3.9" />
                  <path d="M8.5 20.6h7M12 17.2v3.4" />
                </svg>
                {t('attractions')}
              </Link>
            </>
          )}
          <ThemeToggle />
          {authed && (
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                data-tip="Sign out" data-tip-pos="bottom"
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
