import {NextRequest, NextResponse} from 'next/server';
import {getEventGenerated, getEventGeneratedBatch} from '@/lib/events';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({error: 'id required'}, {status: 400});
  try {
    return NextResponse.json(await getEventGenerated(id));
  } catch (e) {
    console.error('event-meta error', e);
    return NextResponse.json({error: 'failed'}, {status: 500});
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids) ? body.ids.map(String) : [];
  try {
    return NextResponse.json(await getEventGeneratedBatch(ids));
  } catch (e) {
    console.error('event-meta batch error', e);
    return NextResponse.json({error: 'failed'}, {status: 500});
  }
}
