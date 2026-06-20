import {NextRequest, NextResponse} from 'next/server';
import {setReview, type ReviewStatus} from '@/lib/reviews';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventId = body?.event_id ? String(body.event_id) : '';
  const raw = body?.status;

  if (!eventId) {
    return NextResponse.json({error: 'event_id required'}, {status: 400});
  }

  let status: ReviewStatus | null;
  if (raw === 'approved' || raw === 'rejected') status = raw;
  else if (raw === null || raw === 'clear') status = null;
  else return NextResponse.json({error: 'invalid status'}, {status: 400});

  try {
    await setReview(eventId, status, body?.note ?? null);
    return NextResponse.json({ok: true, status});
  } catch (e) {
    console.error('review save error', e);
    return NextResponse.json({error: 'save_failed'}, {status: 500});
  }
}
