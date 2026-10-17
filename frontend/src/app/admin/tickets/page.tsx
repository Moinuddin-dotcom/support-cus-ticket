'use client';

import { AssignSelect } from '@/components/assign-select';
import { TicketList } from '@/components/ticket-list';
import { Alert, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import type { Paginated, User } from '@/lib/types';
import { useApi } from '@/lib/use-api';

export default function AdminTicketsPage() {
  const agents = useApi('agents', () =>
    api.get<Paginated<User>>('/users?role=AGENT&pageSize=100').then((res) => res.data),
  );

  return (
    <>
      <PageHeader title="All tickets" description="Every ticket in the system. Use the dropdown to assign or reassign." />
      {agents.error && (
        <div className="mb-4">
          <Alert onRetry={agents.reload}>Could not load agents: {agents.error}</Alert>
        </div>
      )}
      <TicketList
        basePath="/admin/tickets"
        showCustomer
        emptyMessage="No customer has opened a ticket yet."
        renderActions={(ticket, onChange) =>
          agents.data ? <AssignSelect ticket={ticket} agents={agents.data} onAssigned={onChange} /> : null
        }
      />
    </>
  );
}
