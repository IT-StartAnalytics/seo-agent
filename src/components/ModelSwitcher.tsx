'use client';

import {useState} from 'react';

type Model = {id: string; label: string; note: string};

export default function ModelSwitcher({
  current,
  models
}: {
  current: string;
  models: Model[];
}) {
  const [selected, setSelected] = useState(current);
  const [saved, setSaved] = useState(current);
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  const dirty = selected !== saved;

  async function save() {
    setStatus('saving');
    try {
      const r = await fetch('/api/settings/generation-model', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model: selected})
      });
      if (!r.ok) throw new Error();
      setSaved(selected);
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('err');
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-card shadow-sm p-5 max-w-xl">
      <div className="text-sm font-semibold">Content generation model</div>
      <p className="mt-1 text-xs text-foreground/55">
        Applies to auto-generation and Regenerate (writer + translations). Saved once, used for
        every run until you change it.
      </p>

      <div className="mt-4 space-y-2">
        {models.map((m) => (
          <label
            key={m.id}
            className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer transition-colors ${
              selected === m.id
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-black/10 dark:border-white/15 hover:border-black/25 dark:hover:border-white/30'
            }`}
          >
            <input
              type="radio"
              name="model"
              value={m.id}
              checked={selected === m.id}
              onChange={() => setSelected(m.id)}
              className="accent-indigo-500"
            />
            <span className="flex-1">
              <span className="text-sm font-medium">{m.label}</span>
              <span className="ml-2 text-xs text-foreground/50">{m.note}</span>
            </span>
            {saved === m.id && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">active</span>
            )}
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || status === 'saving'}
          className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'ok' && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved. Now generating on {saved}.</span>}
        {status === 'err' && <span className="text-sm text-rose-600 dark:text-rose-400">Save failed.</span>}
        {status === 'idle' && dirty && <span className="text-sm text-foreground/50">Unsaved change</span>}
      </div>
    </div>
  );
}
