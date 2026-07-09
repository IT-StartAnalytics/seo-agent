import {NextRequest, NextResponse} from 'next/server';
import {getCountries, getCountryMeta, getLanguages, searchLocations} from '@/lib/geo';

// Per-country location lists are fetched through n8n on a cache miss.
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const kind = sp.get('kind') || '';

  if (kind === 'countries') {
    // Static ISO list: no DataForSEO call, no memory blow-up.
    return NextResponse.json({ok: true, kind, items: await getCountries()});
  }
  if (kind === 'languages') {
    return NextResponse.json({ok: true, kind, items: await getLanguages()});
  }
  if (kind === 'country-meta') {
    const country = sp.get('country') || '';
    if (!country) return NextResponse.json({ok: false, error: 'country required'}, {status: 400});
    return NextResponse.json({ok: true, kind, item: await getCountryMeta(country)});
  }
  if (kind === 'locations') {
    const country = sp.get('country') || '';
    if (!country) return NextResponse.json({ok: false, error: 'country required'}, {status: 400});
    const q = sp.get('q') || '';
    const limit = Math.min(Number(sp.get('limit') || 50) || 50, 100);
    return NextResponse.json({ok: true, kind, items: await searchLocations(country, q, limit)});
  }
  return NextResponse.json({ok: false, error: 'unknown kind'}, {status: 400});
}
