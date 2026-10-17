'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { formatDateTime, formatRelative, humanize } from '@/lib/format';
import type { Paginated, Ticket, User } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { AssignSelect } from './assign-select';
import { OverdueBadge, PriorityBadge, StatusBadge } from './badges';
import { CommentThread } from './comment-thread';
import { useSession } from './session-context';
import { Alert, Button, Card, Loading } from './ui';

export function TicketDetail({
  ticketId,
  backHref,
  canChangeStatus = false,
  canAssign = false,
}: {
  ticketId: string;
  backHref: string;
  canChangeStatus?: boolean;
  canAssign?: boolean;
}) {
  const user = useSession();
  const { data: ticket, error, loading, reload, setData } = useApi(ticketId, () =>
    api.get<Ticket>(`/tickets/${ticketId}`),
  );
  const agents = useApi(canAssign ? 'agents' : 'no-agents', () =>
    canAssign
      ? api.get<Paginated<User>>('/users?role=AGENT&pageSize=100').then((res) => res.data)
      : Promise.resolve([] as User[]),
  );
  const [statusError, setStatusError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  async function advance() {
    if (!ticket?.nextStatus) return;
    setChanging(true);
    setStatusError(null);
    try {
      setData(await api.patch<Ticket>(`/tickets/${ticket.id}/status`, { status: ticket.nextStatus }));
    } catch (err) {
      setStatusError(errorMessage(err));
    } finally {
      setChanging(false);
    }
  }

  if (loading && !ticket) return <Loading label="Loading ticket…" />;
  if (error || !ticket) {
    return (
      <div className="space-y-4">
        <Alert onRetry={reload}>{error ?? 'Ticket not found'}</Alert>
        <Link href={backHref} className="text-sm font-medium text-indigo-600 hover:underline">
          ← Back to tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={backHref} className="text-sm font-medium text-indigo-600 hover:underline">
        ← Back to tickets
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {ticket.isOverdue && <OverdueBadge />}
            </div>
            <h1 className="mt-3 text-xl font-bold text-slate-900">{ticket.title}</h1>
            <p className="mt-1 text-xs text-slate-500">
              Opened by {ticket.createdBy.name} · {formatDateTime(ticket.createdAt)}
            </p>
            {ticket.summary && (
              <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                <span className="font-medium text-slate-700">Summary: </span>
                {ticket.summary}
              </p>
            )}
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{ticket.description}</p>
          </Card>

          <CommentThread
            ticketId={ticket.id}
            currentUserId={user.id}
            placeholder={user.role === 'CUSTOMER' ? 'Add more details or reply to the agent…' : 'Reply to the customer…'}
            onPosted={() => setData({ ...ticket, commentCount: ticket.commentCount + 1 })}
          />
        </div>

        <aside className="space-y-6">
          {canChangeStatus && (
            <Card className="p-5">
              <h2 className="text-base font-semibold text-slate-900">Status</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tickets move Open → In Progress → Resolved → Closed, one step at a time.
              </p>
              <div className="mt-4">
                {ticket.nextStatus ? (
                  <Button onClick={advance} loading={changing} className="w-full">
                    Move to {humanize(ticket.nextStatus)}
                  </Button>
                ) : (
                  <p className="text-sm text-slate-500">This ticket is closed. No further changes are possible.</p>
                )}
              </div>
              {statusError && (
                <div className="mt-3">
                  <Alert>{statusError}</Alert>
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h2 className="text-base font-semibold text-slate-900">Details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Detail label="Category">{ticket.category}</Detail>
              <Detail label="Priority">
                <PriorityBadge priority={ticket.priority} />
              </Detail>
              <Detail label="SLA deadline">
                <span className={ticket.isOverdue ? 'font-medium text-rose-600' : undefined}>
                  {formatDateTime(ticket.slaDeadline)}
                </span>
                {(ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
                  <span className="block text-xs text-slate-500">{formatRelative(ticket.slaDeadline)}</span>
                )}
              </Detail>
              {ticket.resolvedAt && <Detail label="Resolved">{formatDateTime(ticket.resolvedAt)}</Detail>}
              <Detail label="Customer">
                {ticket.createdBy.name}
                <span className="block text-xs text-slate-500">{ticket.createdBy.email}</span>
              </Detail>
              <Detail label="Assigned agent">
                {canAssign ? (
                  agents.data ? (
                    <AssignSelect ticket={ticket} agents={agents.data} onAssigned={setData} />
                  ) : (
                    <span className="text-slate-500">Loading agents…</span>
                  )
                ) : (
                  (ticket.assignedTo?.name ?? <span className="text-slate-500">Not assigned yet</span>)
                )}
              </Detail>
              <Detail label="Last updated">{formatDateTime(ticket.updatedAt)}</Detail>
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-slate-900">{children}</dd>
    </div>
  );
}
