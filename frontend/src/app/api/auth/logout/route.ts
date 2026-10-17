import { handleLogout } from '@/lib/server/auth-route';

export function POST() {
  return handleLogout();
}
