'use client';

import {useState} from 'react';
import type {MetaVersion} from '@/lib/events';

const LANGS = [
  {k: 'en', label: 'EN'},
  {k: 'ar', label: 'AR'},
  {k: 'ru', label: 'RU'},
  {k: 'fr', label: 'FR'}
];

type Lang = {h1: string; meta_title: string; meta_description: string};
type Live = {updated_at: string | null; langs: {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null}[]} | null;
type SavedEdits = Record<string, {h1: string | null; meta_title: string | null; meta_description: string | null}>;

function FieldHead({label, len, limit}: {label: string; len: number; limit?: number}) {
  const over = limit ? len > limit : false;
  return (
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
      <span>{label}</span>
      {limit ? <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span> : <span className="text-foreground/40">{len}</span>}
    </div>
  );
}

export default function MetaEditor({
  eventId,
  versions,
  live,
  savedEdits
}: {
  eventId?: string;
  versions: MetaVersion[];
  live: Live;
  savedEdits?: SavedEdits;
}) {
  const gen = versions.find((v) => v.source === 'run');
  const genMap: Record<string, {h1: string | null; meta_title: string | null; meta_description: string | null}> = {};
  gen?.langs.forEach((a) => {
    genMap[a.lang] = a;
  });
  const liveMap: Record<string, {h1: string | null; meta_title: string | null; meta_description: string | null}> = {};
  (live?.langs ?? []).forEach((a) => {
    liveMap[a.lang] = a;
  });

  function base(lang: string, field: 'h1' | 'meta_title' | 'meta_description'): string {
    return savedEdits?.[lang]?.[field] ?? genMap[lang]?.[field] ?? liveMap[lang]?.[field] ?? '';
  }

  const [form, setForm] = useState<Record<string, Lang>>(() => {
    const f: Record<string, Lang> = {};
    for (const {k} of LANGS) {
      f[k] = {h1: base(k, 'h1'), meta_title: base(k, 'meta_title'), meta_description: base(k, 'meta_description')};
    }
    return f;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{ok: boolean; msg: string} | null>(null);

  function set(lang: string, field: keyof Lang, val: string) {
    setForm((p) => ({...p, [lang]: {...p[lang], [field]: val}}));
    setSaved(false);
    setSaveError(null);
    setPublishStatus(null);
  }

  function buildEdits() {
    return LANGS.map(({k}) => ({
      lang: k,
      h1: form[k].h1.trim() || null,
      meta_title: form[k].meta_title.trim() || null,
      meta_description: form[k].meta_description.trim() || null
    }));
  }

  async function saveDraft() {
    if (!eventId || saving) return;
    setSaving(true);
    const res = await fetch('/api/meta-edit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: eventId, edits: buildEdits()})
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setSaveError(null);
    } else {
      const d = await res.json().catch(() => ({}));
      setSaveError(String(d.detail || d.error || `HTTP ${res.status}`));
      setSaved(false);
    }
  }

  async function publish() {
    if (!eventId || publishing) return;
    setPublishing(true);
    setPublishStatus(null);
    const edits = buildEdits();
    // persist the draft alongside publishing
    await fetch('/api/meta-edit', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({event_id: eventId, edits})
    }).catch(() => {});
    try {
      const res = await fetch('/api/publish-meta', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({event_id: eventId, edits})
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setPublishStatus({ok: true, msg: d.invalid_fields ? 'Published (some fields rejected by site)' : 'Published to site'});
      } else if (d.error === 'not_configured') {
        setPublishStatus({ok: false, msg: 'Publish not configured (missing webhook secret/URL)'});
      } else {
        setPublishStatus({ok: false, msg: 'Publish failed' + (d.status ? ` (${d.status})` : '')});
      }
    } catch {
      setPublishStatus({ok: false, msg: 'Publish failed (network)'});
    } finally {
      setPublishing(false);
      setSaved(true);
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-black/15 dark:border-white/20 bg-muted px-3 py-1.5 text-sm outline-none focus:border-indigo-500';

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {LANGS.map(({k, label}) => {
          const rtl = k === 'ar';
          const f = form[k];
          return (
            <div key={k} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4 space-y-3">
              <div className="text-xs font-semibold text-foreground/60">{label}</div>

              <div>
                <FieldHead label="H1" len={[...f.h1].length} />
                <input dir={rtl ? 'rtl' : undefined} value={f.h1} onChange={(e) => set(k, 'h1', e.target.value)} className={inputCls} />
              </div>

              <div>
                <FieldHead label="Meta Title" len={[...f.meta_title].length} limit={60} />
                <input dir={rtl ? 'rtl' : undefined} value={f.meta_title} onChange={(e) => set(k, 'meta_title', e.target.value)} className={inputCls} />
              </div>

              <div>
                <FieldHead label="Meta Description" len={[...f.meta_description].length} limit={250} />
                <textarea
                  dir={rtl ? 'rtl' : undefined}
                  value={f.meta_description}
                  onChange={(e) => set(k, 'meta_description', e.target.value)}
                  rows={4}
                  className={`${inputCls} resize-y`}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={saveDraft}
          disabled={saving || !eventId}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save draft'}
        </button>

        <button
          type="button"
          onClick={publish}
          disabled={publishing || !eventId}
          className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />
          </svg>
          {publishing ? 'Publishing…' : 'Publish to site'}
        </button>

        {saved && !publishStatus && <span className="text-xs font-medium text-green-600 dark:text-green-400">Draft saved</span>}
        {saveError && <span className="text-xs font-medium text-red-600 dark:text-red-400">Save failed: {saveError}</span>}
        {publishStatus && (
          <span className={`text-xs font-medium ${publishStatus.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {publishStatus.msg}
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-foreground/40">
        Publish updates the live site immediately; the “Live on site” tab reflects it after the next sync (~hourly).
      </p>
    </div>
  );
}
