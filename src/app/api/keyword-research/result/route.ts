import {NextRequest, NextResponse} from 'next/server';
import {saveResult, type KeywordRow, type KeywordAnalysis, type JobStatus} from '@/lib/keywordResearch';

export async function POST(req: NextRequest) {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  const provided = req.headers.get('x-webhook-secret');
  if (!secret || provided !== secret) {
    return NextResponse.json({ok: false, error: 'unauthorized'}, {status: 401});
  }

  const body = await req.json().catch(() => ({}));
  const jobId = body?.job_id != null ? String(body.job_id) : '';
  if (!jobId) return NextResponse.json({ok: false, error: 'job_id required'}, {status: 400});

  const status = (typeof body?.status === 'string' ? body.status : undefined) as JobStatus | undefined;
  const results = Array.isArray(body?.keywords)
    ? (body.keywords as KeywordRow[])
    : Array.isArray(body?.results)
      ? (body.results as KeywordRow[])
      : null;
  const analysis = (body?.analysis ?? null) as KeywordAnalysis | null;
  const method = (body?.method ?? null) as Record<string, unknown> | null;
  const error = typeof body?.error === 'string' ? body.error : null;

  try {
    await saveResult(jobId, {status, error, results, analysis, method});
  } catch {
    return NextResponse.json({ok: false, error: 'db_error'}, {status: 500});
  }
  return NextResponse.json({ok: true});
}
