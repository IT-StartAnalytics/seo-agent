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
      className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        approved
          ? 'bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25'
          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
      }`}
    >
      {saving ? '…' : approved ? t('approved') : t('reviewPending')}
    </button>
  );
}
