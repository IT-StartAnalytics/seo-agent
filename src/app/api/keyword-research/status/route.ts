import {NextRequest, NextResponse} from 'next/server';
import {getJob} from '@/lib/keywordResearch';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('job_id') || '';
  if (!id) return NextResponse.json({ok: false, error: 'job_id required'}, {status: 400});
  const job = await getJob(id);
  if (!job) return NextResponse.json({ok: false, error: 'not_found'}, {status: 404});
  return NextResponse.json({
    ok: true,
    status: job.status,
    error: job.error,
    approved: job.approved,
    results: job.results,
    analysis: job.analysis,
    method: job.method
  });
}
