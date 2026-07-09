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
    function onDown(e: MouseEvent) {
      if (cityBox.current && !cityBox.current.contains(e.target as Node)) setCityOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const hasCountries = countries.length > 0;
  const langList = languages.length ? languages : FALLBACK_LANGS;
  const valid = url.trim() && name.trim() && countryName.trim() && lang;

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
            city: picked ? shortName(picked.location_name) : cityQuery.trim() || null,
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
          <label className={label}>{t('fUrl')}</label>
          <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('fUrlPh')} />
        </div>
        <div>
          <label className={label}>{t('fName')}</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('fNamePh')} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label}>{t('fCountry')}</label>
            {hasCountries ? (
              <select className={input} value={countryIso} onChange={(e) => selectCountry(e.target.value)}>
                <option value="">{t('fCountryPh')}</option>
                {countries.map((c) => (
                  <option key={c.iso} value={c.iso}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input className={input} value={countryName} onChange={(e) => setCountryName(e.target.value)} placeholder={t('fCountryPh')} />
            )}
          </div>

          <div ref={cityBox} className="relative">
            <label className={label}>{t('fCity')}</label>
            <input
              className={input}
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
          <label className={label}>{t('fLangs')}</label>
          <select className={input} value={lang} onChange={(e) => setLang(e.target.value)}>
            {langList.map((l) => (
              <option key={l.language_code} value={l.language_code}>
                {l.language_name} ({l.language_code})
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground/80">
          <input type="checkbox" checked={locIsDemand} onChange={(e) => setLocIsDemand(e.target.checked)} />
          {t('fLocIsDemand')}
        </label>

        <div>
          <label className={label}>{t('fExcludes')}</label>
          <input className={input} value={excludes} onChange={(e) => setExcludes(e.target.value)} placeholder={t('fExcludesPh')} />
        </div>
        <div>
          <label className={label}>{t('fDiff')}</label>
          <input className={input} value={diff} onChange={(e) => setDiff(e.target.value)} placeholder={t('fDiffPh')} />
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
