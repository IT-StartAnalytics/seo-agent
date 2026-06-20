import {NextRequest, NextResponse} from 'next/server';
import {getLatestRun} from '@/lib/events';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({error: 'id required'}, {status: 400});
  try {
    return NextResponse.json(await getLatestRun(id));
  } catch (e) {
    console.error('gen-status error', e);
    return NextResponse.json({error: 'failed'}, {status: 500});
  }
}
