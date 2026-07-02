'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {pickDefaultCity, categoryUrlForCity} from '@/lib/categoryUrl';

// City-aware "open page" control. PlatinumList category pages resolve only on a
// per-city subdomain, so we build the URL from the chosen city (default: Dubai).
export default function CategoryOpen({baseUrl, cities}: {baseUrl: string | null; cities: string[]}) {
  const t = useTranslations('Categories');
  const [city, setCity] = useState<string>(() => pickDefaultCity(cities) ?? '');

  const href = categoryUrlForCity(baseUrl, city || null);

  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        {cities.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-foreground/50">{t('cityLabel')}</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="rounded-lg border border-black/15 dark:border-white/20 bg-card px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        )}
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity"
          >
            {t('openPage')} ↗
          </a>
        ) : (
          <span className="text-sm text-foreground/40">—</span>
        )}
      </div>
      {href && (
        <p className="mt-2 text-xs text-foreground/50 break-all">{href}</p>
      )}
      {cities.length > 1 && (
        <p className="mt-2 text-xs text-foreground/45">
          {t('cities')}: {cities.join(', ')}
        </p>
      )}
    </div>
  );
}
