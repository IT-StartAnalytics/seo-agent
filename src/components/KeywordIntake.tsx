'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter, Link} from '@/i18n/navigation';

const LANGS = ['en', 'ar', 'ru', 'fr'] as const;

export default function KeywordIntake() {
  const t = useTranslations('KeywordResearch');
  const router = useRouter();

  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [langs, setLangs] = useState<string[]>(['en']);
  const [locIsDemand, setLocIsDemand] = useState(false);
  const [excludes, setExcludes] = useState('');
  const [diff, setDiff] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function toggleLang(l: string) {
    setLangs((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]));
  }

  const valid = url.trim() && name.trim() && country.trim() && langs.length > 0;

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
          target_geo: {country: country.trim(), city: city.trim() || null},
          languages: langs,
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
            <input className={input} value={country} onChange={(e) => setCountry(e.target.value)} placeholder={t('fCountryPh')} />
          </div>
          <div>
            <label className={label}>{t('fCity')}</label>
            <input className={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('fCityPh')} />
          </div>
        </div>

        <div>
          <label className={label}>{t('fLangs')}</label>
          <div className="flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => toggleLang(l)}
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${
                  langs.includes(l)
                    ? 'border-indigo-400 bg-indigo-500/10 text-indigo-500'
                    : 'border-black/10 dark:border-white/10 text-foreground/60'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
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
