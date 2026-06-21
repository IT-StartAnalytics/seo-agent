'use client';

import {useState} from 'react';

const LANGS = [
  {k: 'en', label: 'EN'},
  {k: 'ar', label: 'AR'},
  {k: 'ru', label: 'RU'},
  {k: 'fr', label: 'FR'}
];

const MODELS = ['GPT-4.1', 'GPT-4o', 'GPT-4o mini', 'Claude 3.5 Sonnet', 'Gemini 2.0 Flash'];

export default function ManualRegenerate() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(MODELS[0]);
  const [langs, setLangs] = useState<Set<string>>(new Set(['en', 'ar', 'ru', 'fr']));
  const [preview, setPreview] = useState(false);

  function toggle(k: string) {
    setLangs((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  const selected = LANGS.filter((l) => langs.has(l.k));

  return (
    <div>
      {/* Prompt card */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-card shadow-sm p-5 space-y-4">
        <div>
          <div className="text-sm font-semibold text-foreground">Custom prompt</div>
          <p className="mt-0.5 text-xs text-foreground/55">
            Describe how the meta tags should be generated for this event. Your instructions are added on top of the standard SEO rules.
          </p>
        </div>

        <div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            placeholder="e.g. Emphasize the comedy angle and the headliner's name, mention the city and date, keep the title under 60 characters, friendly and energetic tone…"
            className="w-full resize-y rounded-xl border border-black/15 dark:border-white/20 bg-muted px-4 py-3 text-sm outline-none focus:border-indigo-500"
          />
          <div className="mt-1 text-right text-xs text-foreground/40">{[...prompt].length} chars</div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              <span className="text-xs text-foreground/55">Model:</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-full border border-black/15 dark:border-white/20 bg-muted px-3 py-1 text-xs outline-none focus:border-indigo-500"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-foreground/55">Languages:</span>
              {LANGS.map((l) => {
                const on = langs.has(l.k);
                return (
                  <button
                    key={l.k}
                    type="button"
                    onClick={() => toggle(l.k)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      on
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                        : 'border-black/15 dark:border-white/20 text-foreground/55 hover:text-foreground'
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPreview(true)}
            disabled={!prompt.trim() || selected.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
              <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
            </svg>
            Generate
          </button>
        </div>
      </div>

      {/* Result */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-foreground">Result</div>
          {preview && <div className="text-xs text-foreground/45">Model: {model}</div>}
        </div>

        {!preview ? (
          <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center text-sm text-foreground/45">
            Generated meta tags will appear here after you run the prompt.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {selected.map((l) => (
              <div key={l.k} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
                <div className="text-xs font-semibold text-foreground/60">{l.label}</div>
                {['H1', 'Meta Title', 'Meta Description'].map((field) => (
                  <div key={field} className="mt-2">
                    <div className="text-xs uppercase tracking-wide text-foreground/45">{field}</div>
                    <div className="mt-1.5 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-foreground/10" />
                      {field === 'Meta Description' && <div className="h-3 w-1/2 animate-pulse rounded bg-foreground/10" />}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-foreground/40">
          Generation backend is not connected yet — this page is a layout preview.
        </p>
      </div>
    </div>
  );
}
