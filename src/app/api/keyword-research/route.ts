import {NextRequest, NextResponse} from 'next/server';
import {createJob, setStatus, type GeoTarget} from '@/lib/keywordResearch';

// n8n webhook that runs the keyword-research pipeline. Configure N8N_KEYWORD_RESEARCH_URL,
// or it is derived from N8N_REGENERATE_URL (same host, path /webhook/seo-agent/keyword-research).
function hookUrl(): string | null {
  if (process.env.N8N_KEYWORD_RESEARCH_URL) return process.env.N8N_KEYWORD_RESEARCH_URL;
  const regen = process.env.N8N_REGENERATE_URL;
  if (regen && regen.includes('/webhook/')) {
    return regen.replace(/(\/webhook\/).*/, '$1seo-agent/keyword-research');
  }
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const attraction_url = typeof body?.attraction_url === 'string' ? body.attraction_url.trim() : '';
  const attraction_name = typeof body?.attraction_name === 'string' ? body.attraction_name.trim() : '';
  const tg = body?.target_geo || {};
  const country = typeof tg.country === 'string' ? tg.country.trim() : '';
  const cityRaw = typeof tg.city === 'string' ? tg.city.trim() : '';
  // Guard: a "city" equal to the country is not a city (stale data / browser autofill).
  const city = cityRaw && cityRaw.toLowerCase() !== (typeof tg.country === 'string' ? tg.country.trim().toLowerCase() : '') ? cityRaw : '';
  const country_iso = typeof tg.country_iso === 'string' ? tg.country_iso.trim().toUpperCase() : null;
  const num = (v: unknown) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
  const country_location_code = num(tg.country_location_code);
  const location_code = num(tg.location_code) ?? country_location_code;
  const location_name = typeof tg.location_name === 'string' && tg.location_name.trim() ? tg.location_name.trim() : null;
  const languages = Array.isArray(body?.languages) ? body.languages.map(String).map((s: string) => s.trim()).filter(Boolean) : [];
  const attraction_id = body?.attraction_id != null ? String(body.attraction_id) : null;
  const scope_excludes = typeof body?.scope_excludes === 'string' && body.scope_excludes.trim() ? body.scope_excludes.trim() : null;
  const differentiators = typeof body?.differentiators === 'string' && body.differentiators.trim() ? body.differentiators.trim() : null;
  const location_is_demand_market = body?.location_is_demand_market === true;

  if (!attraction_url) return NextResponse.json({ok: false, error: 'attraction_url required'}, {status: 400});
  if (!attraction_name) return NextResponse.json({ok: false, error: 'attraction_name required'}, {status: 400});
  if (!country) return NextResponse.json({ok: false, error: 'target country required'}, {status: 400});
  if (!languages.length) return NextResponse.json({ok: false, error: 'languages required'}, {status: 400});

  const target_geo: GeoTarget = {
    country,
    city: city || null,
    country_iso,
    country_location_code,
    location_code,
    location_name
  };

  let id: string;
  try {
    id = await createJob({
      attraction_url, attraction_name, target_geo, languages, attraction_id,
      scope_excludes, differentiators, location_is_demand_market
    });
  } catch {
    return NextResponse.json({ok: false, error: 'db_error'}, {status: 500});
  }

  const url = hookUrl();
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) {
    await setStatus(id, 'failed', 'n8n webhook not configured');
    return NextResponse.json({ok: true, job_id: id, status: 'failed', error: 'not_configured'});
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Webhook-Secret': secret},
      body: JSON.stringify({
        job_id: id,
        attraction_url,
        attraction_name,
        target_geo,
        languages,
        attraction_id,
        scope_excludes,
        differentiators,
        location_is_demand_market
      }),
      cache: 'no-store'
    });
    if (!res.ok) {
      await setStatus(id, 'failed', `hook_failed:${res.status}`);
      return NextResponse.json({ok: true, job_id: id, status: 'failed', error: 'hook_failed'});
    }
    await setStatus(id, 'running');
    return NextResponse.json({ok: true, job_id: id, status: 'running'});
  } catch {
    await setStatus(id, 'failed', 'hook_unreachable');
    return NextResponse.json({ok: true, job_id: id, status: 'failed', error: 'hook_unreachable'});
  }
}
