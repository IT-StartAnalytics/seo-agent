import {NextRequest, NextResponse} from 'next/server';
import {getCountries, getLanguages, searchLocations} from '@/lib/geo';

// The first (uncached) countries fetch pulls a very large DataForSEO list through n8n.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kind = sp.get('kind') || '';

  if (kind === 'countries') {
    const items = await getCountries();
    return NextResponse.json({ok: true, kind, items});
  }
  if (kind === 'languages') {
    const items = await getLanguages();
    return NextResponse.json({ok: true, kind, items});
  }
  if (kind === 'locations') {
    const country = sp.get('country') || '';
    if (!country) return NextResponse.json({ok: false, error: 'country required'}, {status: 400});
    const q = sp.get('q') || '';
    const limit = Math.min(Number(sp.get('limit') || 50) || 50, 100);
    const items = await searchLocations(country, q, limit);
    return NextResponse.json({ok: true, kind, items});
  }
  return NextResponse.json({ok: false, error: 'unknown kind'}, {status: 400});
}
