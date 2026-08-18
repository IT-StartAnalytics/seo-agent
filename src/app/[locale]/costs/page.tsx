import {setRequestLocale} from 'next-intl/server';
import Header from '@/components/Header';
import {getCostSummary} from '@/lib/aiUsage';

export const dynamic = 'force-dynamic';

function usd(n: number): string {
  if (!n) return '$0.00';
  if (n < 0.01) return '$' + n.toFixed(5);
  if (n < 1) return '$' + n.toFixed(4);
  return '$' + n.toFixed(2);
}
function num(n: number): string {
  return (n || 0).toLocaleString('en-US');
}
function when(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
}

export default async function CostsPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const s = await getCostSummary();

  const Card = ({label, value, sub}: {label: string; value: string; sub?: string}) => (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-card shadow-sm p-5">
      <div className="text-xs uppercase tracking-wide text-foreground/55">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-foreground/50">{sub}</div>}
    </div>
  );

  return (
    <>
      <Header />
      <main className="flex-1 mx-auto max-w-6xl px-6 py-12 w-full">
        <h1 className="text-3xl font-semibold tracking-tight">AI costs</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Token spend on meta generation and translation, computed from OpenAI usage.
        </p>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Today" value={usd(s.today)} />
          <Card label="Last 7 days" value={usd(s.d7)} />
          <Card label="Last 30 days" value={usd(s.d30)} />
          <Card label="All time" value={usd(s.all)} />
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card label="Saved by cache" value={usd(s.cacheSavedUsd)} sub="vs paying full input rate for cached tokens" />
          <Card label="Spend by feature" value={s.byKind.map((k) => `${k.kind} ${usd(k.cost)}`).join('  ·  ') || '—'} />
        </div>

        {/* By model */}
        <h2 className="mt-12 text-lg font-medium">By model</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-foreground/60 border-b border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.05]">
                <th className="px-4 py-2.5 font-medium">Model</th>
                <th className="px-3 py-2.5 font-medium text-right">Calls</th>
                <th className="px-3 py-2.5 font-medium text-right">Tokens in</th>
                <th className="px-3 py-2.5 font-medium text-right">Cached</th>
                <th className="px-3 py-2.5 font-medium text-right">Tokens out</th>
                <th className="px-3 py-2.5 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {s.byModel.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-5 text-foreground/60">No usage logged yet.</td></tr>
              ) : (
                s.byModel.map((m) => (
                  <tr key={m.model} className="border-b border-black/5 dark:border-white/5 last:border-0">
                    <td className="px-4 py-2.5 font-medium">{m.model}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(m.bucket.calls)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(m.bucket.tokens_in)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{num(m.bucket.tokens_cached)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{num(m.bucket.tokens_out)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{usd(m.bucket.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent runs */}
        <h2 className="mt-12 text-lg font-medium">Recent runs</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10 bg-card shadow-sm">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-foreground/60 border-b border-black/10 dark:border-white/10 bg-black/[0.04] dark:bg-white/[0.05]">
                <th className="px-4 py-2.5 font-medium">Event</th>
                <th className="px-3 py-2.5 font-medium">Models</th>
                <th className="px-3 py-2.5 font-medium">When</th>
                <th className="px-3 py-2.5 font-medium text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {s.recent.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-5 text-foreground/60">No runs logged yet.</td></tr>
              ) : (
                s.recent.map((r, i) => (
                  <tr key={i} className="border-b border-black/5 dark:border-white/5 last:border-0">
                    <td className="px-4 py-2.5 font-medium">{r.event_id ?? '—'}</td>
                    <td className="px-3 py-2.5 text-foreground/70">{r.models}</td>
                    <td className="px-3 py-2.5 text-foreground/70 tabular-nums">{when(r.at)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{usd(r.cost)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-xs text-foreground/45">
          Cache write is billed at 1.25x input on gpt-5.6; cache reads at 0.1x. The first run of a
          fresh prompt writes the cache (dearer); repeat runs within 30 min read it (cheaper).
          Rates are configurable via the AI_PRICING_JSON env var.
        </p>
      </main>
    </>
  );
}
