import { AppShell } from '@/components/app-shell';
import { requireRole } from '@/lib/server/session';

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('AGENT');
  return <AppShell user={user}>{children}</AppShell>;
}
