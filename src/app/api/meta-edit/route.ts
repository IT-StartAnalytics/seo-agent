import {NextRequest, NextResponse} from 'next/server';
import {getMetaEdits, setMetaEdits, type MetaEdit} from '@/lib/metaEdits';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('event_id') || '';
  if (!id) return NextResponse.json({error: 'missing event_id'}, {status: 400});
  return NextResponse.json({edits: await getMetaEdits(id)}, {headers: {'Cache-Control': 'no-store'}});
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = typeof body?.event_id === 'string' ? body.event_id : '';
  const edits: MetaEdit[] = Array.isArray(body?.edits) ? body.edits : [];
  if (!id) return NextResponse.json({error: 'missing event_id'}, {status: 400});
  try {
    await setMetaEdits(id, edits);
    return NextResponse.json({ok: true});
  } catch {
    return NextResponse.json({error: 'failed'}, {status: 500});
  }
}
