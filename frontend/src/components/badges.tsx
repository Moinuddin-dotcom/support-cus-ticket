import { humanize } from '@/lib/format';
import type { Priority, Role, TicketStatus } from '@/lib/types';
import { cx } from './ui';

const BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap';

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  IN_PROGRESS: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  MEDIUM: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  LOW: 'bg-slate-50 text-slate-600 ring-slate-500/20',
};

const ROLE_STYLES: Record<Role, string> = {
  ADMIN: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  AGENT: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  CUSTOMER: 'bg-slate-50 text-slate-600 ring-slate-500/20',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={cx(BASE, STATUS_STYLES[status])}>{humanize(status)}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cx(BASE, PRIORITY_STYLES[priority])}>{humanize(priority)}</span>;
}

export function RoleBadge({ role }: { role: Role }) {
  return <span className={cx(BASE, ROLE_STYLES[role])}>{humanize(role)}</span>;
}

export function OverdueBadge() {
  return (
    <span className={cx(BASE, 'bg-rose-600 text-white ring-rose-700')} title="SLA deadline has passed">
      Overdue
    </span>
  );
}
