'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';

type Phase = 'idle' | 'starting' | 'running' | 'done' | 'error' | 'noresult';

const OK_STATUSES = new Set(['published', 'partial']);

export default function RegenerateButton({eventId}: {eventId: string}) {
  const t = useTranslations('Events');
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [resultStatus, setResultStatus] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function getStatus(): Promise<{status: string | null; finished_at: string | null} | null> {
    try {
      const res = await fetch(`/api/gen-status?id=${eventId}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  async function start() {
    setPhase('starting');
    setResultStatus(null);

    const baseline = (await getStatus())?.finished_at ?? null;

    const res = await fetch('/api/regenerate', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: eventId})
    });
    if (!res.ok) {
      setPhase('error');
      setResultStatus('trigger_failed');
      return;
    }

    setPhase('running');
    let tries = 0;
    const maxTries = 30; // ~2.5 min at 5s

    const tick = async () => {
      tries++;
      const cur = await getStatus();
      if (cur?.finished_at && cur.finished_at !== baseline) {
        setResultStatus(cur.status);
        setPhase(OK_STATUSES.has(cur.status ?? '') ? 'done' : 'error');
        router.refresh();
        return;
      }
      if (tries >= maxTries) {
        setPhase('noresult');
        return;
      }
      timer.current = setTimeout(tick, 5000);
    };
    timer.current = setTimeout(tick, 5000);
  }

  const busy = phase === 'starting' || phase === 'running';

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={start}
        disabled={busy}
        data-tip="Re-run automatic generation for this event"
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/40 text-violet-600 dark:text-violet-300 px-3 py-1.5 text-xs font-medium hover:bg-violet-500/25 disabled:opacity-50 transition-colors"
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          <path d="M20 3v4" />
          <path d="M22 5h-4" />
          <path d="M4 17v2" />
          <path d="M5 18H3" />
        </svg>
        {busy ? t('regenerating') : t('regenerate')}
      </button>

      {phase === 'running' && (
        <span className="text-xs text-foreground/55 text-right max-w-[220px]">{t('regenRunning')}</span>
      )}
      {phase === 'done' && (
        <span className="text-xs text-green-600 dark:text-green-400 text-right">
          {t('regenDone')}: {resultStatus}
        </span>
      )}
      {phase === 'error' && (
        <span className="text-xs text-red-600 dark:text-red-400 text-right max-w-[220px]">
          {t('regenError')}: {resultStatus}
        </span>
      )}
      {phase === 'noresult' && (
        <span className="text-xs text-amber-600 dark:text-amber-400 text-right max-w-[220px]">{t('regenNoResult')}</span>
      )}
    </div>
  );
}
