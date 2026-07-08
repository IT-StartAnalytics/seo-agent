import {NextRequest, NextResponse} from 'next/server';
import ExcelJS from 'exceljs';
import {getJob, type KeywordRow} from '@/lib/keywordResearch';

export const runtime = 'nodejs';

const THIN = {style: 'thin' as const, color: {argb: 'FFD9D9D9'}};
const BORDER = {top: THIN, left: THIN, bottom: THIN, right: THIN};

export async function POST(req: NextRequest, {params}: {params: Promise<{job_id: string}>}) {
  const {job_id} = await params;
  const job = await getJob(job_id);
  if (!job) return NextResponse.json({ok: false, error: 'not_found'}, {status: 404});

  const body = await req.json().catch(() => ({}));
  const src: KeywordRow[] = Array.isArray(body?.rows) ? body.rows : (job.results || []);
  const rows = src.filter((r) => r.include !== false);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Keywords');

  const cols = [
    'Keyword',
    'Local Vol (target market)',
    'Global Vol (key markets)',
    'Difficulty (1-10)',
    'Search Intent',
    'Priority',
    'Page Type',
    'Notes'
  ];
  ws.addRow(cols);
  const hdr = ws.getRow(1);
  hdr.eachCell((c) => {
    c.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF1F4E4E'}};
    c.font = {name: 'Arial', bold: true, color: {argb: 'FFFFFFFF'}, size: 11};
    c.alignment = {vertical: 'top', wrapText: true};
    c.border = BORDER;
  });

  const widths = [30, 16, 16, 12, 15, 10, 16, 60];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));

  for (const r of rows) {
    const row = ws.addRow([
      r.keyword,
      r.local_vol ?? '',
      r.global_vol ?? '',
      r.difficulty ?? '',
      r.intent,
      r.priority,
      r.page_type,
      r.notes ?? ''
    ]);
    row.eachCell((c, cn) => {
      c.font = {name: 'Arial', size: 10};
      c.border = BORDER;
      c.alignment = cn === 8 ? {vertical: 'top', wrapText: true} : {vertical: 'top'};
    });
  }
  ws.views = [{state: 'frozen', ySplit: 1}];

  // Method block
  const geo = job.target_geo?.city ? `${job.target_geo.city}, ${job.target_geo.country}` : job.target_geo?.country || '';
  const m = job.method || {};
  const rec = (job.analysis && job.analysis.recommendations) || {};
  const asList = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).map(String) : []);

  const method: string[] = [];
  method.push(`Attraction: ${job.attraction_name}. Page: ${job.attraction_url}`);
  method.push(`Target demand market: ${geo}. Search language: ${(job.languages || []).join(', ').toUpperCase()}.`);
  if (asList(m.seeds).length) method.push(`Seeds: ${asList(m.seeds).join('; ')}.`);
  if (asList(m.sources).length) method.push(`Data sources: ${asList(m.sources).join(', ')}.`);
  if (asList(m.global_markets).length) method.push(`Global volume = sum of feeder markets: ${asList(m.global_markets).join(', ')}.`);
  if (typeof m.caveats === 'string' && m.caveats) method.push(String(m.caveats));
  method.push('Difficulty (1-10) = DataForSEO Keyword Difficulty rescaled to 1..10 (1 = easiest). Raw KD kept in Notes.');
  if (rec.meta_title) method.push(`Recommended Meta Title: ${rec.meta_title}`);
  if (rec.h1) method.push(`Recommended H1: ${rec.h1}`);
  const faqs = asList(rec.faqs);
  if (faqs.length) method.push(`FAQ (price-free, for the page): ${faqs.join(' ')}`);

  ws.addRow([]);
  const mHead = ws.addRow(['Method']);
  mHead.getCell(1).font = {name: 'Arial', bold: true, size: 11};
  for (const line of method) {
    const r = ws.addRow([line]);
    r.getCell(1).font = {name: 'Arial', size: 9, italic: true};
    r.getCell(1).alignment = {vertical: 'top', wrapText: true};
  }

  const buf = await wb.xlsx.writeBuffer();
  const slug = (job.attraction_name || 'attraction').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return new NextResponse(buf as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="keywords-${slug}.xlsx"`,
      'Cache-Control': 'no-store'
    }
  });
}
