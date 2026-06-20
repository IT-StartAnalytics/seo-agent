import {NextRequest, NextResponse} from 'next/server';
import {getEventGenerated} from '@/lib/events';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({error: 'id required'}, {status: 400});
  try {
    const data = await getEventGenerated(id);
    return NextResponse.json(data);
  } catch (e) {
    console.error('event-meta error', e);
    return NextResponse.json({error: 'failed'}, {status: 500});
  }
}
