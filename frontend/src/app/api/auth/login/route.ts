import { handleAuth } from '@/lib/server/auth-route';

export function POST(request: Request) {
  return handleAuth(request, '/auth/login');
}
