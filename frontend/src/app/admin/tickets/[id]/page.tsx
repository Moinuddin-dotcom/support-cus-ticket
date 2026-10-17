import { TicketDetail } from '@/components/ticket-detail';

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketDetail ticketId={id} backHref="/admin/tickets" canChangeStatus canAssign />;
}
