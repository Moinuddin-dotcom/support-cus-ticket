import { AppShell } from '@/components/app-shell';
import { requireRole } from '@/lib/server/session';

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('CUSTOMER');
  return <AppShell user={user}>{children}</AppShell>;
}
