'use client';

import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {useRouter} from '@/i18n/navigation';

export default function KeywordDeleteButton({jobId}: {jobId: string}) {
  const t = useTranslations('KeywordResearch');
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!window.confirm(t('deleteConfirm'))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/keyword-research/${jobId}`, {method: 'DELETE'});
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={del}
      disabled={busy}
      className="text-sm font-medium text-rose-500 hover:text-rose-600 disabled:opacity-40"
    >
      {busy ? t('deleting') : t('delete')}
    </button>
  );
}
