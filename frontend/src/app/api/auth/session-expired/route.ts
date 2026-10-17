import { NextResponse } from 'next/server';
import { clearTokenCookie } from '@/lib/server/auth-cookie';

/**
 * Landing point when the cookie holds a token the API no longer accepts
 * (expired, signed with an old secret, user deleted or deactivated).
 * Server components cannot delete cookies, so they redirect here; without this,
 * middleware would keep bouncing between /login and the role home page.
 */
export function GET() {
  // Relative Location: request.url carries the bind address (0.0.0.0) in the standalone server.
  const response = new NextResponse(null, { status: 307, headers: { Location: '/login' } });
  clearTokenCookie(response);
  return response;
}
