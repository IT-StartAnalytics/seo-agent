'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Link, usePathname} from '@/i18n/navigation';

function EventsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V9a2 2 0 0 0 0 4v1.5A1.5 1.5 0 0 1 18.5 16h-13A1.5 1.5 0 0 1 4 14.5V13a2 2 0 0 0 0-4z" />
      <path d="M14 6v10" strokeDasharray="1 2.2" />
    </svg>
  );
}
function AttractionsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="10" r="7.2" />
      <circle cx="12" cy="10" r="1.7" />
      <path d="M12 2.8v5.5M12 11.7v5.5M4.8 10h5.5M13.7 10h5.5M6.9 4.9l3.9 3.9M13.2 11.2l3.9 3.9M17.1 4.9l-3.9 3.9M10.8 11.2l-3.9 3.9" />
      <path d="M8.5 20.6h7M12 17.2v3.4" />
    </svg>
  );
}
function CategoriesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h5A1.5 1.5 0 0 1 11 5.5v3A1.5 1.5 0 0 1 9.5 10h-5A1.5 1.5 0 0 1 3 8.5z" />
      <path d="M13 5.5A1.5 1.5 0 0 1 14.5 4h5A1.5 1.5 0 0 1 21 5.5v3A1.5 1.5 0 0 1 19.5 10h-5A1.5 1.5 0 0 1 13 8.5z" />
      <path d="M3 15.5A1.5 1.5 0 0 1 4.5 14h5A1.5 1.5 0 0 1 11 15.5v3A1.5 1.5 0 0 1 9.5 20h-5A1.5 1.5 0 0 1 3 18.5z" />
      <path d="M13 15.5A1.5 1.5 0 0 1 14.5 14h5A1.5 1.5 0 0 1 21 15.5v3A1.5 1.5 0 0 1 19.5 20h-5A1.5 1.5 0 0 1 13 18.5z" />
    </svg>
  );
}
function VenuesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M4 21h16" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 11h.01M15 11h.01" />
    </svg>
  );
}
function ArtistsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}

const SECTIONS = [
  {href: '/events', key: 'events', Icon: EventsIcon},
  {href: '/attractions', key: 'attractions', Icon: AttractionsIcon},
  {href: '/categories', key: 'categories', Icon: CategoriesIcon},
  {href: '/venues', key: 'venues', Icon: VenuesIcon},
  {href: '/artists', key: 'artists', Icon: ArtistsIcon}
] as const;

export default function CatalogNav() {
  const t = useTranslations('Nav');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active = SECTIONS.some((s) => pathname.startsWith(s.href));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 hover:text-foreground ${
          active || open ? 'text-foreground' : 'text-foreground/70'
        }`}
      >
        <CategoriesIcon />
        {t('catalog')}
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-card shadow-lg"
        >
          <div className="py-1.5">
            {SECTIONS.map(({href, key, Icon}) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground"
              >
                <span className="text-foreground/60">
                  <Icon />
                </span>
                {t(key)}
              </Link>
            ))}
          </div>
          <div className="border-t border-black/10 dark:border-white/10">
            <Link
              href="/catalog"
              role="menuitem"
              className="flex items-center justify-between px-3.5 py-2.5 text-sm font-medium text-indigo-500 hover:bg-foreground/5"
            >
              {t('browseAll')}
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
