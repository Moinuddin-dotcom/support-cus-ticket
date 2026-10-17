import 'server-only';
import { NextResponse } from 'next/server';
import { decodeToken } from '../jwt';
import { TOKEN_COOKIE } from './config';

const DEFAULT_MAX_AGE_S = 60 * 60 * 24;

/** Stores the access token in an httpOnly cookie so page scripts can never read it. */
export function setTokenCookie(response: NextResponse, token: string): void {
  const exp = decodeToken(token)?.exp;
  const maxAge = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : DEFAULT_MAX_AGE_S;
  response.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export function clearTokenCookie(response: NextResponse): void {
  response.cookies.set(TOKEN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/**
 * Basic CSRF defence for state-changing BFF requests: the Origin header must match
 * the host serving the app (SameSite=Lax cookies already block most cross-site posts).
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin fetches from older browsers / server calls
  try {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Forwards the caller's IP so the API's per-IP rate limits apply to real clients. */
export function forwardedFor(request: Request): Record<string, string> {
  const xff = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  return xff ? { 'X-Forwarded-For': xff } : {};
}
