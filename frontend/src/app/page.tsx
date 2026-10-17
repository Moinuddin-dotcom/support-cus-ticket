import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server/session';
import { ROLE_HOME } from '@/lib/types';

/** Middleware normally redirects "/" first; this is the server-side fallback. */
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? ROLE_HOME[user.role] : '/login');
}
