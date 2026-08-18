import {NextRequest, NextResponse} from 'next/server';
import {logUsage, type UsageLine} from '@/lib/aiUsage';

// n8n posts token usage for a generation run. Secret-checked, same secret as the other webhooks.
// Body: { event_id, execution_id, lines: [{ kind, model, tokens_in, tokens_out, tokens_cached, tokens_cache_write }] }
export async function POST(req: NextRequest) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  const provided = req.headers.get('x-webhook-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ok: false, error: 'unauthorized'}, {status: 401});
  }

  const body = await req.json().catch(() => ({}));
  const event_id = body?.event_id != null ? String(body.event_id) : null;
  const execution_id = body?.execution_id != null ? String(body.execution_id) : null;

  const num = (v: unknown) => (v != null && !isNaN(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0);
  const rawLines = Array.isArray(body?.lines) ? body.lines : [];
  const lines: UsageLine[] = rawLines
    .map((l: Record<string, unknown>) => ({
      kind: String(l?.kind || 'other'),
      model: String(l?.model || ''),
      tokens_in: num(l?.tokens_in),
      tokens_out: num(l?.tokens_out),
      tokens_cached: num(l?.tokens_cached),
      tokens_cache_write: num(l?.tokens_cache_write)
    }))
    .filter((l: UsageLine) => l.model && (l.tokens_in > 0 || l.tokens_out > 0));

  if (!lines.length) return NextResponse.json({ok: false, error: 'no usable lines'}, {status: 400});

  try {
    const total = await logUsage({event_id, execution_id, lines});
    return NextResponse.json({ok: true, cost_usd: total});
  } catch {
    return NextResponse.json({ok: false, error: 'db_error'}, {status: 500});
  }
}
