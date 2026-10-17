import 'server-only';
import { NextResponse } from 'next/server';
import { clearTokenCookie, forwardedFor, isSameOrigin, setTokenCookie } from './auth-cookie';
import { backendUrl } from './config';

interface AuthResponse {
  accessToken: string;
  user: unknown;
}

/** Shared handler for /api/auth/login and /api/auth/register: proxies, then sets the cookie. */
export async function handleAuth(request: Request, backendPath: string): Promise<NextResponse> {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'Cross-origin request rejected' }, { status: 403 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl()}${backendPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...forwardedFor(request) },
      body: await request.text(),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'The API is unreachable' }, { status: 502 });
  }

  const body = (await upstream.json().catch(() => ({}))) as Partial<AuthResponse>;
  if (!upstream.ok || !body.accessToken) {
    return NextResponse.json(body, { status: upstream.ok ? 502 : upstream.status });
  }

  const response = NextResponse.json({ user: body.user });
  setTokenCookie(response, body.accessToken);
  return response;
}

export function handleLogout(): NextResponse {
  const response = NextResponse.json({ ok: true });
  clearTokenCookie(response);
  return response;
}
