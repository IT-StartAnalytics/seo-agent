'use client';

import {useEffect, useState} from 'react';
import {useRouter} from '@/i18n/navigation';

const LANGS = [
  {k: 'en', label: 'EN'},
  {k: 'ar', label: 'AR'},
  {k: 'ru', label: 'RU'},
  {k: 'fr', label: 'FR'}
];

const MODELS = ['GPT-4.1', 'GPT-4.1 mini', 'GPT-4o', 'GPT-4o mini', 'GPT-5 mini', 'GPT-5.2 mini', 'GPT-5.4 mini'];

type GenLang = {lang: string; h1: string | null; meta_title: string | null; meta_description: string | null};

function ResultField({label, value, rtl, limit, tall}: {label: string; value: string | null; rtl?: boolean; limit?: number; tall?: boolean}) {
  const len = value ? [...value].length : 0;
  const over = limit ? len > limit : false;
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
        <span>{label}</span>
        {limit ? <span className={over ? 'text-red-500' : 'text-foreground/40'}>{len}/{limit}</span> : <span className="text-foreground/40">{len}</span>}
      </div>
      <div
        dir={rtl ? 'rtl' : undefined}
        className={`mt-1 w-full rounded-lg border border-black/15 dark:border-white/20 bg-muted px-3 py-1.5 text-sm whitespace-pre-line break-words ${
          value ? 'text-foreground/85' : 'text-foreground/35'
        } ${tall ? 'min-h-[6rem]' : 'min-h-[2.25rem]'}`}
      >
        {value || '—'}
      </div>
    </div>
  );
}

export default function ManualRegenerate({eventId}: {eventId?: string}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(MODELS[0]);
  const [langs, setLangs] = useState<Set<string>>(new Set(['en', 'ar', 'ru', 'fr']));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenLang[] | null>(null);
  const [savedPrompts, setSavedPrompts] = useState<{id: number; name: string; prompt: string}[]>([]);
  const [promptName, setPromptName] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptMsg, setPromptMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/manual-prompts')
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d.prompts)) setSavedPrompts(d.prompts);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function savePrompt() {
    if (!prompt.trim() || !promptName.trim() || savingPrompt) return;
    setSavingPrompt(true);
    setPromptMsg(null);
    try {
      const res = await fetch('/api/manual-prompts', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: promptName.trim(), prompt: prompt.trim()})
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok && d.prompt) {
        setSavedPrompts((prev) => [d.prompt, ...prev]);
        setPromptName('');
        setPromptMsg('Saved');
      } else {
        setPromptMsg('Save failed');
      }
    } catch {
      setPromptMsg('Save failed');
    } finally {
      setSavingPrompt(false);
    }
  }

  function loadPrompt(p: {prompt: string}) {
    setPrompt(p.prompt);
    setPromptMsg(null);
  }

  async function deletePrompt(id: number) {
    setSavedPrompts((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/manual-prompts?id=${id}`, {method: 'DELETE'});
    } catch {
      // ignore
    }
  }

  function toggle(k: string) {
    setLangs((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  }

  const selectedKeys = LANGS.filter((l) => langs.has(l.k)).map((l) => l.k);

  async function generate() {
    if (!eventId || loading || !prompt.trim() || selectedKeys.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/manual-generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({event_id: eventId, prompt: prompt.trim(), model, langs: selectedKeys})
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok && Array.isArray(d.langs)) {
        setResult(d.langs as GenLang[]);
      } else if (d.error === 'not_configured') {
        setError('Generation webhook is not configured (missing N8N_MANUAL_GENERATE_URL / secret).');
      } else if (d.error === 'empty_result') {
        setError('The model returned no usable meta. Try refining the prompt.');
      } else {
        setError('Generation failed' + (d.status ? ` (${d.status})` : '') + '.');
      }
    } catch {
      setError('Generation failed (network).');
    } finally {
      setLoading(false);
    }
  }

  function useInEdit() {
    if (!eventId || !result) return;
    try {
      sessionStorage.setItem(`manualMeta:${eventId}`, JSON.stringify({langs: result, ts: Date.now()}));
    } catch {
      // ignore storage errors
    }
    router.push(`/events/${eventId}#edit`);
  }

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

        {/* Save / reuse prompts (stored in Neon, available on any event) */}
        <div className="space-y-2 border-t border-black/10 dark:border-white/10 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder="Name this prompt to save it"
              className="min-w-[12rem] flex-1 rounded-lg border border-black/15 dark:border-white/20 bg-muted px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={savePrompt}
              disabled={!prompt.trim() || !promptName.trim() || savingPrompt}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 transition-colors hover:bg-indigo-500/20 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h6" />
                <path d="M17 3v6M20 6h-6" />
              </svg>
              {savingPrompt ? 'Saving…' : 'Save prompt'}
            </button>
            {promptMsg && (
              <span className={`text-xs font-medium ${promptMsg === 'Saved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {promptMsg}
              </span>
            )}
          </div>

          {savedPrompts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-foreground/55">Saved:</span>
              {savedPrompts.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-full border border-black/15 dark:border-white/20 bg-muted py-0.5 pl-2.5 pr-1 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => loadPrompt(p)}
                    title="Load this prompt into the editor"
                    className="max-w-[16rem] truncate hover:text-indigo-600 dark:hover:text-indigo-300"
                  >
                    {p.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePrompt(p.id)}
                    title="Delete saved prompt"
                    className="leading-none px-0.5 text-foreground/40 hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
            onClick={generate}
            disabled={loading || !eventId || !prompt.trim() || selectedKeys.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
              <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" />
            </svg>
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Result */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-semibold text-foreground">Result</div>
          <div className="flex items-center gap-3">
            {result && <div className="text-xs text-foreground/45">Model: {model}</div>}
            {result && result.length > 0 && (
              <button
                type="button"
                onClick={useInEdit}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-1.5 text-xs font-medium shadow-sm hover:opacity-90 transition-opacity"
              >
                Use in Edit →
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {selectedKeys.map((k) => (
              <div key={k} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4">
                <div className="text-xs font-semibold text-foreground/60">{k.toUpperCase()}</div>
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
        ) : result ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {result.map((a) => (
              <div key={a.lang} className="rounded-xl border border-black/10 dark:border-white/10 bg-card p-4 space-y-1">
                <div className="text-xs font-semibold text-foreground/60">{a.lang.toUpperCase()}</div>
                <ResultField label="H1" value={a.h1} rtl={a.lang === 'ar'} />
                <ResultField label="Meta Title" value={a.meta_title} rtl={a.lang === 'ar'} limit={60} />
                <ResultField label="Meta Description" value={a.meta_description} rtl={a.lang === 'ar'} limit={250} tall />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center text-sm text-foreground/45">
            Generated meta tags will appear here after you run the prompt.
          </div>
        )}

        <p className="mt-3 text-xs text-foreground/40">
          “Use in Edit” carries the result to the event’s Edit tab, where you can review it and Save draft / Publish.
        </p>
      </div>
    </div>
  );
}
