'use client';

import {useState} from 'react';
import {useRouter} from '@/i18n/navigation';

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading || !email.trim()) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim()})
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setStep('code');
        setInfo('We sent a sign-in code to your email. It expires in 10 minutes.');
      } else if (d.error === 'not_allowed') {
        setError('This email is not allowed to sign in.');
      } else if (d.error === 'invalid_email') {
        setError('Please enter a valid email address.');
      } else if (d.error === 'not_configured') {
        setError('Email sign-in is not configured yet.');
      } else {
        setError('Could not send the code. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading || !code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim(), code: code.trim()})
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        router.push('/');
        router.refresh();
      } else if (d.error === 'invalid_code') {
        setError('Wrong code. Please check and try again.');
      } else if (d.error === 'expired' || d.error === 'no_code') {
        setError('The code has expired. Request a new one.');
      } else if (d.error === 'too_many_attempts') {
        setError('Too many attempts. Request a new code.');
      } else {
        setError('Could not verify the code. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-black/15 dark:border-white/20 bg-background px-4 py-3 outline-none focus:border-indigo-500';
  const btnCls =
    'mt-5 w-full rounded-xl bg-foreground text-background px-4 py-3 text-sm font-medium disabled:opacity-50';

  if (step === 'email') {
    return (
      <form onSubmit={requestCode} className="w-full max-w-sm">
        <label className="block text-sm font-medium mb-2" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="you@platinumlist.net"
        />
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading || email.trim().length === 0} className={btnCls}>
          {loading ? 'Sending…' : 'Send code'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="w-full max-w-sm">
      <label className="block text-sm font-medium mb-2" htmlFor="code">
        Verification code
      </label>
      <input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className={`${inputCls} tracking-[0.4em] text-center text-lg`}
        placeholder="••••••"
      />
      {info && !error && <p className="mt-3 text-sm text-foreground/55">{info}</p>}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={loading || code.trim().length === 0} className={btnCls}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
      <div className="mt-3 flex items-center justify-between text-xs text-foreground/55">
        <button
          type="button"
          onClick={() => {
            setStep('email');
            setCode('');
            setError(null);
            setInfo(null);
          }}
          className="hover:text-foreground"
        >
          ← Change email
        </button>
        <button type="button" onClick={() => requestCode()} disabled={loading} className="hover:text-foreground disabled:opacity-50">
          Resend code
        </button>
      </div>
    </form>
  );
}
