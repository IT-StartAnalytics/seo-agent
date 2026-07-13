'use client';

import {useState} from 'react';

type State = 'idle' | 'sending' | 'sent' | 'error';

// Sends the performers of the version currently shown in the history slider to the artists
// Google Sheet (via n8n). Fire-and-forget by design: the sheet is where results are read.
// Temporary tool while the artist/volume pipeline is being tuned.
export default function SendArtistsButton({
  eventId,
  eventUrl,
  performers
}: {
  eventId?: string;
  eventUrl?: string;
  performers: string[];
}) {
  const [state, setState] = useState<State>('idle');
  const [detail, setDetail] = useState<string>('');

  const disabled = !eventId || performers.length === 0 || state === 'sending';

  async function send() {
    if (disabled) return;
    setState('sending');
    setDetail('');
    try {
      const res = await fetch('/api/artists-analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({event_id: eventId, event_url: eventUrl ?? '', artists: performers})
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setState('sent');
        setDetail(String(data.sent ?? performers.length));
        setTimeout(() => setState('idle'), 4000);
      } else {
        setState('error');
        setDetail(String(data?.error ?? res.status));
      }
    } catch {
      setState('error');
      setDetail('network');
    }
  }

  const label =
    state === 'sending' ? 'Sending…' :
    state === 'sent' ? `Sent ${detail}` :
    state === 'error' ? `Failed: ${detail}` :
    'Send to sheet';

  return (
    <button
      type="button"
      onClick={send}
      disabled={disabled}
      title="Send these performers to the artists sheet for volume analysis"
      className={[
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        state === 'sent'
          ? 'bg-emerald-600 text-white'
          : state === 'error'
            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25'
            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4Z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
