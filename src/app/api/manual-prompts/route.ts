import {NextRequest, NextResponse} from 'next/server';
import {listManualPrompts, addManualPrompt, deleteManualPrompt} from '@/lib/manualPrompts';

export async function GET() {
  try {
    return NextResponse.json({prompts: await listManualPrompts()});
  } catch {
    return NextResponse.json({prompts: []});
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
  if (!name || !prompt) return NextResponse.json({ok: false, error: 'name and prompt required'}, {status: 400});
  try {
    const saved = await addManualPrompt(name, prompt);
    if (!saved) return NextResponse.json({ok: false, error: 'not_saved'}, {status: 500});
    return NextResponse.json({ok: true, prompt: saved});
  } catch (e) {
    return NextResponse.json({ok: false, error: 'failed', detail: String((e as Error)?.message || e)}, {status: 500});
  }
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('id'));
  if (!Number.isFinite(id)) return NextResponse.json({ok: false, error: 'id required'}, {status: 400});
  try {
    await deleteManualPrompt(id);
    return NextResponse.json({ok: true});
  } catch {
    return NextResponse.json({ok: false, error: 'failed'}, {status: 500});
  }
}
