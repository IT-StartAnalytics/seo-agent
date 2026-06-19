import {getTranslations} from 'next-intl/server';
import {cookies} from 'next/headers';
import {Link} from '@/i18n/navigation';
import {AUTH_COOKIE, verifySessionToken} from '@/lib/auth';
import LocaleSwitcher from './LocaleSwitcher';

export default async function Header() {
  const t = await getTranslations('Nav');
  const store = await cookies();
  const authed = await verifySessionToken(store.get(AUTH_COOKIE)?.value);

  return (
    <header className="sticky top-0 z-10 backdrop-blur border-b border-black/5 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          SEO<span className="text-indigo-500">Agent</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {authed && (
            <>
              <Link href="/events" className="text-foreground/70 hover:text-foreground">
                {t('events')}
              </Link>
              <Link href="/attractions" className="text-foreground/70 hover:text-foreground">
                {t('attractions')}
              </Link>
            </>
          )}
          <LocaleSwitcher />
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
