import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { clearTokenCookie, forwardedFor, isSameOrigin } from '@/lib/server/auth-cookie';
import { backendUrl, TOKEN_COOKIE } from '@/lib/server/config';

/**
 * Backend-for-frontend proxy: the browser calls /api/proxy/<path>, and this handler
 * forwards to the NestJS API with the JWT from the httpOnly cookie as a Bearer token.
 */
async function proxy(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some((segment) => segment === '..' || segment === '.')) {
    return NextResponse.json({ message: 'Invalid path' }, { status: 400 });
  }
  if (request.method !== 'GET' && !isSameOrigin(request)) {
    return NextResponse.json({ message: 'Cross-origin request rejected' }, { status: 403 });
  }

  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const search = new URL(request.url).search;
  const target = `${backendUrl()}/${path.map(encodeURIComponent).join('/')}${search}`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...forwardedFor(request),
      },
      body: hasBody ? await request.text() : undefined,
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'The API is unreachable' }, { status: 502 });
  }

  const response = new NextResponse(upstream.status === 204 ? null : await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
  if (upstream.status === 401) {
    // Expired or revoked token (e.g. user deactivated): drop it so middleware sends them to /login.
    clearTokenCookie(response);
  }
  return response;
}

export { proxy as GET, proxy as POST, proxy as PATCH };
