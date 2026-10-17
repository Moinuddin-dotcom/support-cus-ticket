import { TicketDetail } from '@/components/ticket-detail';

export default async function AgentTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketDetail ticketId={id} backHref="/agent/tickets" canChangeStatus />;
}
