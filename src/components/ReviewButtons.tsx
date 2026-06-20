'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';

export default function ReviewButtons({
  eventId,
  initial
}: {
  eventId: string;
  initial: 'approved' | 'rejected' | null;
}) {
  const t = useTranslations('Events');
  const router = useRouter();
  const [approved, setApproved] = useState(initial === 'approved');
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !approved;
    setSaving(true);
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: eventId, status: next ? 'approved' : 'clear'})
    });
    setSaving(false);
    if (res.ok) {
      setApproved(next);
      router.refresh();
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-50 ${
        approved
          ? 'bg-green-500/15 border-green-500/40 text-green-600 dark:text-green-400'
          : 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
      }`}
    >
      {saving ? '…' : approved ? t('approved') : t('approve')}
    </button>
  );
}
