'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { api, toQuery } from '@/lib/api';
import { formatDateTime, formatRelative, humanize } from '@/lib/format';
import { CATEGORIES, PRIORITIES, STATUSES, type Paginated, type Ticket } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { OverdueBadge, PriorityBadge, StatusBadge } from './badges';
import { Alert, Button, Card, EmptyState, Loading, Select } from './ui';

interface Filters {
  status: string;
  priority: string;
  category: string;
}

const PAGE_SIZE = 10;

export function TicketList({
  basePath,
  showCustomer = false,
  showAssignee = true,
  emptyMessage,
  renderActions,
}: {
  /** Detail pages live at `${basePath}/${id}`. */
  basePath: string;
  showCustomer?: boolean;
  showAssignee?: boolean;
  emptyMessage: ReactNode;
  /** Extra per-row controls (e.g. the admin assign dropdown). Receives a callback to refresh the list. */
  renderActions?: (ticket: Ticket, onChange: (updated: Ticket) => void) => ReactNode;
}) {
  const [filters, setFilters] = useState<Filters>({ status: '', priority: '', category: '' });
  const [page, setPage] = useState(1);
  const query = toQuery({ ...filters, page, pageSize: PAGE_SIZE });
  const { data, error, loading, reload, setData } = useApi(query, () =>
    api.get<Paginated<Ticket>>(`/tickets${query}`),
  );

  function update(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function replaceTicket(updated: Ticket) {
    if (!data) return;
    setData({ ...data, data: data.data.map((t) => (t.id === updated.id ? updated : t)) });
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
        <Select aria-label="Filter by status" value={filters.status} onChange={(e) => update('status', e.target.value)} className="sm:w-44">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by priority" value={filters.priority} onChange={(e) => update('priority', e.target.value)} className="sm:w-40">
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {humanize(p)}
            </option>
          ))}
        </Select>
        <Select aria-label="Filter by category" value={filters.category} onChange={(e) => update('category', e.target.value)} className="sm:w-44">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        {hasFilters && (
          <Button variant="ghost" onClick={() => { setFilters({ status: '', priority: '', category: '' }); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4">
          <Alert onRetry={reload}>{error}</Alert>
        </div>
      )}
      {loading && !data && <Loading label="Loading tickets…" />}
      {data && data.data.length === 0 && (
        <EmptyState title={hasFilters ? 'No tickets match these filters' : 'No tickets yet'}>
          {!hasFilters && emptyMessage}
        </EmptyState>
      )}

      {data && data.data.length > 0 && (
        <ul className={`divide-y divide-slate-100 ${loading ? 'opacity-60' : ''}`}>
          {data.data.map((ticket) => (
            <li key={ticket.id} className="flex flex-col gap-3 p-4 hover:bg-slate-50 md:flex-row md:items-center">
              <Link href={`${basePath}/${ticket.id}`} className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-slate-900">{ticket.title}</span>
                  {ticket.isOverdue && <OverdueBadge />}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <span>{ticket.category}</span>
                  <span aria-hidden>·</span>
                  <span title={formatDateTime(ticket.createdAt)}>Opened {formatRelative(ticket.createdAt)}</span>
                  {showCustomer && (
                    <>
                      <span aria-hidden>·</span>
                      <span>by {ticket.createdBy.name}</span>
                    </>
                  )}
                  {showAssignee && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{ticket.assignedTo ? `Agent: ${ticket.assignedTo.name}` : 'Unassigned'}</span>
                    </>
                  )}
                  {ticket.commentCount > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>
                        {ticket.commentCount} comment{ticket.commentCount === 1 ? '' : 's'}
                      </span>
                    </>
                  )}
                </div>
              </Link>
              {renderActions && <div className="md:w-56">{renderActions(ticket, replaceTicket)}</div>}
            </li>
          ))}
        </ul>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <span className="text-slate-500">
            Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} tickets
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={page >= data.meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
