import {useTranslations} from 'next-intl';
import {setRequestLocale} from 'next-intl/server';
import {use} from 'react';
import Header from '@/components/Header';
import {Link} from '@/i18n/navigation';

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V9a2 2 0 0 0 0 4v1.5A1.5 1.5 0 0 1 18.5 16h-13A1.5 1.5 0 0 1 4 14.5V13a2 2 0 0 0 0-4z" />
      <path d="M14 6v10" strokeDasharray="1 2.2" />
      <path d="M8.4 9.1l.62 1.34 1.48.18-1.09 1 .29 1.46-1.3-.73-1.3.73.29-1.46-1.09-1 1.48-.18z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function FerrisIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="10" r="7.2" />
      <circle cx="12" cy="10" r="1.7" />
      <path d="M12 2.8v5.5M12 11.7v5.5M4.8 10h5.5M13.7 10h5.5M6.9 4.9l3.9 3.9M13.2 11.2l3.9 3.9M17.1 4.9l-3.9 3.9M10.8 11.2l-3.9 3.9" />
      <path d="M8.5 20.6h7M12 17.2v3.4" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l10-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="16" cy="16" r="3" />
    </svg>
  );
}
function VenueIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V7l8-4 8 4v14" />
      <path d="M4 21h16" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 11h.01M15 11h.01" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
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

function Tile({
  href,
  title,
  desc,
  open,
  icon,
  grad
}: {
  href: string;
  title: string;
  desc: string;
  open: string;
  icon: React.ReactNode;
  grad: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 bg-card p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${grad} opacity-10 blur-2xl`} />
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-sm`}>
        {icon}
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-sm text-foreground/60">{desc}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-500">
        {open} <Arrow />
      </span>
    </Link>
  );
}

export default function Catalog({params}: {params: Promise<{locale: string}>}) {
  const {locale} = use(params);
  setRequestLocale(locale);
  const t = useTranslations('CatalogHub');
  const nav = useTranslations('Nav');
  const home = useTranslations('Home');
  const footer = useTranslations('Footer');

  return (
    <>
      <Header />

      <main className="flex-1 w-full">
        <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t('title')}</h1>
            <p className="mt-3 text-foreground/60">{t('subtitle')}</p>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Tile
              href="/events"
              title={nav('events')}
              desc={home('eventsTile')}
              open={home('open')}
              icon={<TicketIcon />}
              grad="from-indigo-500 to-blue-500"
            />
            <Tile
              href="/attractions"
              title={nav('attractions')}
              desc={home('attractionsTile')}
              open={home('open')}
              icon={<FerrisIcon />}
              grad="from-violet-500 to-fuchsia-500"
            />
            <Tile
              href="/categories"
              title={nav('categories')}
              desc={home('categoriesTile')}
              open={home('open')}
              icon={<GridIcon />}
              grad="from-emerald-500 to-teal-500"
            />
            <Tile
              href="/venues"
              title={nav('venues')}
              desc={home('venuesTile')}
              open={home('open')}
              icon={<VenueIcon />}
              grad="from-amber-500 to-orange-500"
            />
            <Tile
              href="/artists"
              title={nav('artists')}
              desc={home('artistsTile')}
              open={home('open')}
              icon={<MicIcon />}
              grad="from-rose-500 to-pink-500"
            />
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
