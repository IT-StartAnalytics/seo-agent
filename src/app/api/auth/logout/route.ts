import {NextRequest, NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {AUTH_COOKIE} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
  // Redirect to default-locale login after logout
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url, {status: 303});
}
