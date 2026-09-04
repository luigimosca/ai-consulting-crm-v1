import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'super-secret-ai-agency-key-change-in-prod-2026'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('ai_crm_session')?.value;

  let isValidUser = false;
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      isValidUser = true;
    } catch {
      isValidUser = false;
    }
  }

  // Protect /crm routes
  if (pathname.startsWith('/crm')) {
    if (!isValidUser) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If already logged in, redirect /login to /crm
  if (pathname === '/login' && isValidUser) {
    return NextResponse.redirect(new URL('/crm', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/crm/:path*', '/login'],
};
