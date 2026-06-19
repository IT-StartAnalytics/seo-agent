'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {useParams} from 'next/navigation';
import {useRouter} from '@/i18n/navigation';

export default function LoginForm() {
  const t = useTranslations('Login');
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) ?? 'en';

  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({password, locale})
    });
    setLoading(false);
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm">
      <label className="block text-sm font-medium mb-2" htmlFor="password">
        {t('passwordLabel')}
      </label>
      <input
        id="password"
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-xl border border-black/15 dark:border-white/20 bg-background px-4 py-3 outline-none focus:border-indigo-500"
        placeholder="••••••••"
      />
      {error && (
        <p className="mt-3 text-sm text-red-500">{t('error')}</p>
      )}
      <button
        type="submit"
        disabled={loading || password.length === 0}
        className="mt-5 w-full rounded-xl bg-foreground text-background px-4 py-3 text-sm font-medium disabled:opacity-50"
      >
        {loading ? t('loading') : t('submit')}
      </button>
    </form>
  );
}
