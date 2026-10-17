import type { Metadata } from 'next';
import { TicketList } from '@/components/ticket-list';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Assigned tickets' };

export default function AgentTicketsPage() {
  return (
    <>
      <PageHeader title="Assigned tickets" description="Tickets currently assigned to you." />
      <TicketList basePath="/agent/tickets" showCustomer showAssignee={false} emptyMessage="Nothing assigned to you right now." />
    </>
  );
}
