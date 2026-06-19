'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';

export default function RegenerateButton({eventId}: {eventId: string}) {
  const t = useTranslations('Events');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');

  async function run() {
    setState('loading');
    const res = await fetch('/api/regenerate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: eventId})
    });
    setState(res.ok ? 'ok' : 'error');
    setTimeout(() => setState('idle'), 4000);
  }

  const label =
    state === 'loading' ? t('regenerating')
    : state === 'ok' ? t('regenerateOk')
    : state === 'error' ? t('regenerateError')
    : t('regenerate');

  return (
    <button
      onClick={run}
      disabled={state === 'loading'}
      className="rounded-full border border-black/15 dark:border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
    >
      {label}
    </button>
  );
}
