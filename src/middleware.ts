import { auth } from '@/lib/auth';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

// Routes that require authentication
const protectedPaths = ['/dashboard', '/nueva-planeacion', '/planeacion'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path (without locale prefix) is protected
  const pathWithoutLocale = pathname.replace(/^\/(?:es|en)/, '') || '/';
  const isProtected = protectedPaths.some(p => pathWithoutLocale.startsWith(p));

  if (isProtected) {
    const session = await auth();
    if (!session?.user) {
      const locale = pathname.split('/')[1] || 'es';
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',],
};
