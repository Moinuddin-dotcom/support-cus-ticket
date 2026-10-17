import type { Metadata } from 'next';
import Link from 'next/link';
import { TicketList } from '@/components/ticket-list';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'My tickets' };

const newTicketButton =
  'inline-flex items-center rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500';

export default function CustomerTicketsPage() {
  return (
    <>
      <PageHeader
        title="My tickets"
        description="Track the status of your support requests."
        actions={
          <Link href="/customer/tickets/new" className={newTicketButton}>
            New ticket
          </Link>
        }
      />
      <TicketList
        basePath="/customer/tickets"
        emptyMessage={
          <Link href="/customer/tickets/new" className="font-semibold text-indigo-600 hover:underline">
            Create your first ticket
          </Link>
        }
      />
    </>
  );
}
