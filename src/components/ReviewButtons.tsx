'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';

type Status = 'approved' | 'rejected' | null;

export default function ReviewButtons({
  eventId,
  initial
}: {
  eventId: string;
  initial: Status;
}) {
  const t = useTranslations('Events');
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initial);
  const [saving, setSaving] = useState<string | null>(null);

  async function save(next: Status) {
    setSaving(next ?? 'clear');
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: eventId, status: next ?? 'clear'})
    });
    setSaving(null);
    if (res.ok) {
      setStatus(next);
      router.refresh();
    }
  }

  const base = 'rounded-full px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-50';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => save('approved')}
        disabled={saving !== null}
        className={`${base} ${
          status === 'approved'
            ? 'bg-green-500/15 border-green-500/40 text-green-600 dark:text-green-400'
            : 'border-black/15 dark:border-white/20 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
        }`}
      >
        {saving === 'approved' ? '…' : t('approve')}
      </button>
      <button
        onClick={() => save('rejected')}
        disabled={saving !== null}
        className={`${base} ${
          status === 'rejected'
            ? 'bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400'
            : 'border-black/15 dark:border-white/20 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
        }`}
      >
        {saving === 'rejected' ? '…' : t('reject')}
      </button>
      {status !== null && (
        <button
          onClick={() => save(null)}
          disabled={saving !== null}
          className={`${base} border-black/10 dark:border-white/15 text-foreground/60`}
        >
          {saving === 'clear' ? '…' : t('clearReview')}
        </button>
      )}
    </div>
  );
}
