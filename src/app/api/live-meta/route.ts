import {NextRequest, NextResponse} from 'next/server';
import {getEventLive} from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('event_id') || '';
  if (!id) return NextResponse.json({error: 'missing event_id'}, {status: 400});
  try {
    const data = await getEventLive(id);
    return NextResponse.json(data, {headers: {'Cache-Control': 'no-store'}});
  } catch {
    return NextResponse.json({error: 'failed'}, {status: 500});
  }
}
