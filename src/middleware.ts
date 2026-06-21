import createMiddleware from 'next-intl/middleware';
import {NextRequest, NextResponse} from 'next/server';
import {routing} from './i18n/routing';
import {verifySessionToken, AUTH_COOKIE} from './lib/auth';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(req: NextRequest) {
  const {pathname} = req.nextUrl;
  const isLoginPage = pathname === '/login';

  if (!isLoginPage) {
    const authed = await verifySessionToken(req.cookies.get(AUTH_COOKIE)?.value);
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)'
};
