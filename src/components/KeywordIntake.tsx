'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter, Link} from '@/i18n/navigation';

const FALLBACK_LANGS = [
  {language_code: 'en', language_name: 'English'},
  {language_code: 'ar', language_name: 'Arabic'},
  {language_code: 'ru', language_name: 'Russian'},
  {language_code: 'fr', language_name: 'French'}
];

type GeoItem = {location_code: number; location_name: string; location_type?: string | null; country_iso_code?: string | null};
type LangItem = {language_code: string; language_name: string};

export type IntakeInitial = {
  attraction_url?: string;
  attraction_name?: string;
  country?: string;
  country_iso?: string | null;
  country_location_code?: number | null;
  city?: string;
  location_code?: number | null;
  location_name?: string | null;
  languages?: string[];
  scope_excludes?: string;
  differentiators?: string;
  location_is_demand_market?: boolean;
};

// "Dubai,Dubai,United Arab Emirates" -> "Dubai"
const shortName = (full: string) => String(full || '').split(',')[0].trim();

// Small info icon with a hover tooltip explaining what the field does.
function Hint({text}: {text: string}) {
  return (
    <span className="group relative ml-1.5 inline-flex align-middle">
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="cursor-help text-foreground/40 hover:text-foreground/70"
      >
        <circle cx="12" cy="12" r="9.5" />
        <path d="M12 16.5v-5" />
        <path d="M12 7.8h.01" />
      </svg>
      <span className="sr-only">{text}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-6 z-30 hidden w-72 max-w-[18rem] -translate-x-1/2 rounded-lg border border-black/10 dark:border-white/10 bg-card p-3 text-xs font-normal leading-relaxed text-foreground/80 shadow-lg group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

export default function KeywordIntake({initial}: {initial?: IntakeInitial}) {
  const t = useTranslations('KeywordResearch');
  const router = useRouter();

  const [url, setUrl] = useState(initial?.attraction_url ?? '');
  const [name, setName] = useState(initial?.attraction_name ?? '');

  const [countries, setCountries] = useState<{iso: string; name: string}[]>([]);
  const [languages, setLanguages] = useState<LangItem[]>([]);
  const [countryName, setCountryName] = useState(initial?.country ?? '');
  const [countryIso, setCountryIso] = useState(initial?.country_iso ?? '');
  const [countryCode, setCountryCode] = useState<number | null>(initial?.country_location_code ?? null);
  const [countryQuery, setCountryQuery] = useState(initial?.country ?? '');
  const [countryOpen, setCountryOpen] = useState(false);

  const [cityQuery, setCityQuery] = useState(initial?.city ?? '');
  const [cityResults, setCityResults] = useState<GeoItem[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [picked, setPicked] = useState<GeoItem | null>(
    initial?.location_code && initial?.location_name
      ? {location_code: initial.location_code, location_name: initial.location_name}
      : null
  );

  const [lang, setLang] = useState(initial?.languages?.[0] ?? 'en');
  const [locIsDemand, setLocIsDemand] = useState(initial?.location_is_demand_market ?? false);
  const [excludes, setExcludes] = useState(initial?.scope_excludes ?? '');
  const [diff, setDiff] = useState(initial?.differentiators ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cityBox = useRef<HTMLDivElement>(null);
  const countryBox = useRef<HTMLDivElement>(null);
  const pickedRef = useRef<GeoItem | null>(picked);
  const countryIsoRef = useRef(countryIso);

  // Reference lists (served from the app cache; empty when the n8n df-geo webhook is not wired yet).
  useEffect(() => {
    (async () => {
      try {
        const [c, l] = await Promise.all([
          fetch('/api/geo?kind=countries').then((r) => r.json()).catch(() => ({})),
          fetch('/api/geo?kind=languages').then((r) => r.json()).catch(() => ({}))
        ]);
        if (Array.isArray(c?.items)) setCountries(c.items);
        if (Array.isArray(l?.items) && l.items.length) setLanguages(l.items);
      } catch {
        /* fall back to free text */
      }
    })();
  }, []);

  // City typeahead (server-side search over the cached country list).
  useEffect(() => {
    if (!countryIso || !cityQuery.trim()) {
      setCityResults([]);
      return;
    }
    const h = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geo?kind=locations&country=${countryIso}&q=${encodeURIComponent(cityQuery.trim())}`);
        const d = await r.json();
        setCityResults(Array.isArray(d?.items) ? d.items.slice(0, 20) : []);
      } catch {
        setCityResults([]);
      }
    }, 250);
    return () => clearTimeout(h);
  }, [countryIso, cityQuery]);

  useEffect(() => {
    pickedRef.current = picked;
    countryIsoRef.current = countryIso;
  }, [picked, countryIso]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      // Text that was never confirmed against the DataForSEO list is discarded.
      if (cityBox.current && !cityBox.current.contains(e.target as Node)) {
        setCityOpen(false);
        if (!pickedRef.current) setCityQuery('');
      }
      if (countryBox.current && !countryBox.current.contains(e.target as Node)) {
        setCountryOpen(false);
        if (!countryIsoRef.current) setCountryQuery('');
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const hasCountries = countries.length > 0;
  const langList = languages.length ? languages : FALLBACK_LANGS;

  const countryMatches = (() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries.slice(0, 30);
    const starts = countries.filter((c) => c.name.toLowerCase().startsWith(q) || c.iso.toLowerCase() === q);
    const contains = countries.filter((c) => !starts.includes(c) && c.name.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 30);
  })();
  const valid = url.trim() && name.trim() && (hasCountries ? Boolean(countryIso) : countryName.trim()) && lang;

  async function selectCountry(iso: string) {
    const item = countries.find((c) => c.iso === iso);
    setCityQuery('');
    setPicked(null);
    setCityResults([]);
    setCountryCode(null);
    if (!item) {
      setCountryIso('');
      setCountryName('');
      return;
    }
    setCountryIso(item.iso);
    setCountryName(item.name);
    setCountryQuery(item.name);
    setCountryOpen(false);
    // Resolve the canonical DataForSEO country row (name + location_code) for this ISO.
    try {
      const r = await fetch(`/api/geo?kind=country-meta&country=${item.iso}`);
      const d = await r.json();
      if (d?.item?.location_name) setCountryName(d.item.location_name);
      if (d?.item?.location_code) setCountryCode(d.item.location_code);
    } catch {
      /* keep the static name; n8n falls back to location_name */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/keyword-research', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          attraction_url: url.trim(),
          attraction_name: name.trim(),
          target_geo: {
            country: countryName.trim(),
            country_iso: countryIso || null,
            country_location_code: countryCode,
            city: picked ? shortName(picked.location_name) : hasCountries ? null : cityQuery.trim() || null,
            location_code: picked?.location_code ?? countryCode ?? null,
            location_name: picked?.location_name ?? countryName.trim() ?? null
          },
          languages: [lang],
          location_is_demand_market: locIsDemand,
          scope_excludes: excludes.trim() || null,
          differentiators: diff.trim() || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.job_id) {
        setErr(data?.error || 'Failed to start');
        setBusy(false);
        return;
      }
      router.push(`/keywords/${data.job_id}`);
    } catch {
      setErr('Network error');
      setBusy(false);
    }
  }

  const label = 'block text-sm font-medium text-foreground/80 mb-1.5';
  const input =
    'w-full rounded-lg border border-black/10 dark:border-white/10 bg-background px-3 py-2 text-sm outline-none focus:border-indigo-400';

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">{t('formTitle')}</h1>
      <p className="mt-2 text-sm text-foreground/60">{t('formHint')}</p>

      <div className="mt-8 space-y-5">
        <div>
          <label className={label}>{t('fUrl')}<Hint text={t('tUrl')} /></label>
          <input className={input} name="kw-url" autoComplete="off" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('fUrlPh')} />
        </div>
        <div>
          <label className={label}>{t('fName')}<Hint text={t('tName')} /></label>
          <input className={input} name="kw-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('fNamePh')} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label}>{t('fCountry')}<Hint text={t('tCountry')} /></label>
            {hasCountries ? (
              <div ref={countryBox} className="relative">
                <input
                  className={input}
                  name="kw-country"
                  autoComplete="off"
                  spellCheck={false}
                  value={countryQuery}
                  onChange={(e) => {
                    setCountryQuery(e.target.value);
                    setCountryOpen(true);
                    // typing invalidates the previous pick: the ISO drives the city lookup
                    setCountryIso('');
                    setCountryName('');
                    setCountryCode(null);
                    setCityQuery('');
                    setPicked(null);
                    setCityResults([]);
                  }}
                  onFocus={() => setCountryOpen(true)}
                  placeholder={t('fCountryPh')}
                />
                {countryOpen && countryMatches.length > 0 && (
                  <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-black/10 dark:border-white/10 bg-card shadow-lg">
                    {countryMatches.map((c) => (
                      <li key={c.iso}>
                        <button
                          type="button"
                          onClick={() => selectCountry(c.iso)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-foreground/5"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-foreground/40">{c.iso}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <input className={input} name="kw-country-text" autoComplete="off" value={countryName} onChange={(e) => setCountryName(e.target.value)} placeholder={t('fCountryPh')} />
            )}
          </div>

          <div ref={cityBox} className="relative">
            <label className={label}>{t('fCity')}<Hint text={t('tCity')} /></label>
            <input
              className={input}
              name="kw-city"
              autoComplete="off"
              spellCheck={false}
              value={cityQuery}
              disabled={hasCountries && !countryIso}
              onChange={(e) => {
                setCityQuery(e.target.value);
                setPicked(null);
                setCityOpen(true);
              }}
              onFocus={() => setCityOpen(true)}
              placeholder={t('fCityPh')}
            />
            {cityOpen && cityResults.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-black/10 dark:border-white/10 bg-card shadow-lg">
                {cityResults.map((r) => (
                  <li key={r.location_code}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(r);
                        setCityQuery(shortName(r.location_name));
                        setCityOpen(false);
                      }}
                      className="block w-full px-3 py-2 text-left text-xs hover:bg-foreground/5"
                    >
                      <span className="font-medium">{shortName(r.location_name)}</span>{' '}
                      <span className="text-foreground/50">{r.location_name}</span>
                      {r.location_type ? <span className="ml-1 text-foreground/40">· {r.location_type}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label className={label}>{t('fLangs')}<Hint text={t('tLang')} /></label>
          <select className={input} value={lang} onChange={(e) => setLang(e.target.value)}>
            {langList.map((l) => (
              <option key={l.language_code} value={l.language_code}>
                {l.language_name} ({l.language_code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <input type="checkbox" checked={locIsDemand} onChange={(e) => setLocIsDemand(e.target.checked)} />
            {t('fLocIsDemand')}
          </label>
          <Hint text={t('tLocIsDemand')} />
        </div>

        <div>
          <label className={label}>{t('fExcludes')}<Hint text={t('tExcludes')} /></label>
          <input className={input} name="kw-excludes" autoComplete="off" value={excludes} onChange={(e) => setExcludes(e.target.value)} placeholder={t('fExcludesPh')} />
        </div>
        <div>
          <label className={label}>{t('fDiff')}<Hint text={t('tDiff')} /></label>
          <input className={input} name="kw-diff" autoComplete="off" value={diff} onChange={(e) => setDiff(e.target.value)} placeholder={t('fDiffPh')} />
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-rose-500">{err}</p>}

      <div className="mt-8 flex items-center gap-3">
        <button
          type="submit"
          disabled={!valid || busy}
          className="rounded-full bg-foreground text-background px-5 py-2 text-sm font-medium disabled:opacity-40"
        >
          {busy ? t('submitting') : t('submit')}
        </button>
        <Link href="/keywords" className="text-sm text-foreground/60 hover:text-foreground">
          {t('cancel')}
        </Link>
      </div>
    </form>
  );
}
