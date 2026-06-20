'use client';

import {useParams} from 'next/navigation';
import {usePathname, useRouter} from '@/i18n/navigation';
import {routing} from '@/i18n/routing';

export default function LocaleSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const current = (params.locale as string) ?? routing.defaultLocale;

  return (
    <div className="inline-flex items-center rounded-full border border-black/10 dark:border-white/15 p-0.5 text-sm">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          onClick={() => router.replace(pathname, {locale})}
          aria-current={current === locale}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            current === locale
              ? 'bg-foreground text-background'
              : 'text-foreground/70 hover:text-foreground'
          }`}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
