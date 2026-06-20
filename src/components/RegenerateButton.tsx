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
        className="rounded-full border border-black/15 dark:border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50"
      >
        {busy ? t('regenerating') : t('regenerate')}
      </button>

      {phase === 'running' && (
        <span className="text-[11px] text-foreground/55 text-right max-w-[220px]">{t('regenRunning')}</span>
      )}
      {phase === 'done' && (
        <span className="text-[11px] text-green-600 dark:text-green-400 text-right">
          {t('regenDone')}: {resultStatus}
        </span>
      )}
      {phase === 'error' && (
        <span className="text-[11px] text-red-600 dark:text-red-400 text-right max-w-[220px]">
          {t('regenError')}: {resultStatus}
        </span>
      )}
      {phase === 'noresult' && (
        <span className="text-[11px] text-amber-600 dark:text-amber-400 text-right max-w-[220px]">{t('regenNoResult')}</span>
      )}
    </div>
  );
}
