import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ROLE_HOME, type Role, type SessionUser } from '../types';
import { backendUrl, TOKEN_COOKIE } from './config';

/** Resolves the current user by asking the API (which verifies the JWT). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${backendUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as SessionUser) : null;
  } catch {
    return null;
  }
}

/** Server-side layout guard: redirects unless the verified user has `role`. */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}
