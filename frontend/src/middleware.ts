import { NextResponse, type NextRequest } from 'next/server';
import { decodeToken } from './lib/jwt';
import { ROLE_HOME, type Role } from './lib/types';

const TOKEN_COOKIE = 'st_token';

const PROTECTED: { prefix: string; role: Role }[] = [
  { prefix: '/customer', role: 'CUSTOMER' },
  { prefix: '/agent', role: 'AGENT' },
  { prefix: '/admin', role: 'ADMIN' },
];

const AUTH_PAGES = ['/login', '/register'];

/**
 * Route protection by role. The token is only decoded here (not verified): this is
 * a UX guard. Real authorisation happens in the API on every request, and the role
 * layouts re-check the session server-side.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const claims = decodeToken(request.cookies.get(TOKEN_COOKIE)?.value);

  if (pathname === '/') {
    const target = claims ? ROLE_HOME[claims.role] : '/login';
    return NextResponse.redirect(new URL(target, request.url));
  }

  if (AUTH_PAGES.includes(pathname)) {
    return claims ? NextResponse.redirect(new URL(ROLE_HOME[claims.role], request.url)) : NextResponse.next();
  }

  const area = PROTECTED.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (!area) return NextResponse.next();

  if (!claims) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    const response = NextResponse.redirect(login);
    response.cookies.delete(TOKEN_COOKIE);
    return response;
  }
  if (claims.role !== area.role) {
    return NextResponse.redirect(new URL(ROLE_HOME[claims.role], request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/customer/:path*', '/agent/:path*', '/admin/:path*'],
};
