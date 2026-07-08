import {NextRequest, NextResponse} from 'next/server';
import {patchJob, getJob, type KeywordRow, type KeywordAnalysis} from '@/lib/keywordResearch';

export async function PATCH(req: NextRequest, {params}: {params: Promise<{job_id: string}>}) {
  const {job_id} = await params;
  if (!job_id) return NextResponse.json({ok: false, error: 'job_id required'}, {status: 400});

  const body = await req.json().catch(() => ({}));
  const results = Array.isArray(body?.results) ? (body.results as KeywordRow[]) : undefined;
  const analysis = body?.analysis !== undefined ? (body.analysis as KeywordAnalysis) : undefined;
  const approved = typeof body?.approved === 'boolean' ? body.approved : undefined;

  if (results === undefined && analysis === undefined && approved === undefined) {
    return NextResponse.json({ok: false, error: 'nothing to update'}, {status: 400});
  }

  try {
    await patchJob(job_id, {results, analysis, approved});
  } catch {
    return NextResponse.json({ok: false, error: 'db_error'}, {status: 500});
  }
  const job = await getJob(job_id);
  return NextResponse.json({ok: true, job});
}
