import {NextRequest, NextResponse} from 'next/server';
import {listJobs} from '@/lib/keywordResearch';

export async function GET(req: NextRequest) {
  const attractionId = req.nextUrl.searchParams.get('attraction_id') || undefined;
  const jobs = await listJobs(attractionId);
  return NextResponse.json({ok: true, jobs});
}
