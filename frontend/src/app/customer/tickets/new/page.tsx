import type { Metadata } from 'next';
import { CreateTicketForm } from '@/components/create-ticket-form';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'New ticket' };

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New ticket" description="Describe the problem and we will get back to you." />
      <CreateTicketForm />
    </div>
  );
}
