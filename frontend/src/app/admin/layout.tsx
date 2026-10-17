import { AppShell } from '@/components/app-shell';
import { requireRole } from '@/lib/server/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('ADMIN');
  return <AppShell user={user}>{children}</AppShell>;
}
