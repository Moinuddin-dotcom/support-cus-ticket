'use client';

import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDateTime, humanize } from '@/lib/format';
import { CATEGORIES, PRIORITIES, STATUSES, type Reports } from '@/lib/types';
import { useApi } from '@/lib/use-api';
import { Alert, Button, Card, Loading, PageHeader } from '@/components/ui';

export default function AdminDashboardPage() {
  const { data, error, loading, reload } = useApi('reports', () => api.get<Reports>('/reports'));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={data ? `Updated ${formatDateTime(data.generatedAt)}` : 'Ticket activity across the whole team.'}
        actions={
          <Button variant="secondary" onClick={reload} loading={loading && !!data}>
            Refresh
          </Button>
        }
      />
      {error && <Alert onRetry={reload}>{error}</Alert>}
      {loading && !data && <Loading label="Loading reports…" />}
      {data && <ReportView report={data} />}
    </>
  );
}

function ReportView({ report }: { report: Reports }) {
  const active = report.byStatus.OPEN + report.byStatus.IN_PROGRESS;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Total tickets" value={report.totalTickets} />
        <Stat label="Active" value={active} hint="Open + in progress" />
        <Stat label="Overdue" value={report.overdueCount} hint="Active and past SLA" alert={report.overdueCount > 0} />
        <Stat label="Unassigned" value={report.unassignedCount} href="/admin/tickets" />
        <Stat
          label="Avg. resolution"
          value={report.averageResolutionHours === null ? '—' : `${report.averageResolutionHours}h`}
          hint="Created → resolved"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Breakdown title="By status" rows={STATUSES.map((s) => [humanize(s), report.byStatus[s]])} />
        <Breakdown title="By priority" rows={PRIORITIES.map((p) => [humanize(p), report.byPriority[p]])} />
        <Breakdown
          title="By category"
          rows={[
            ...CATEGORIES.map((c): [string, number] => [c, report.byCategory[c] ?? 0]),
            // Categories outside the fixed list (should not happen, but never hide data).
            ...Object.entries(report.byCategory).filter(([c]) => !(CATEGORIES as readonly string[]).includes(c)),
          ]}
        />
      </div>

      <Card>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Tickets per agent</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3 text-right">Active</th>
                <th className="px-5 py-3 text-right">Resolved / closed</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.ticketsPerAgent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-500">
                    No agents yet.
                  </td>
                </tr>
              )}
              {report.ticketsPerAgent.map((agent) => (
                <tr key={agent.agentId}>
                  <td className="px-5 py-3">
                    <span className="font-medium text-slate-900">{agent.name}</span>
                    {!agent.isActive && <span className="ml-2 text-xs text-slate-500">(inactive)</span>}
                    <span className="block text-xs text-slate-500">{agent.email}</span>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">{agent.active}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{agent.resolved}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{agent.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  alert = false,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  alert?: boolean;
  href?: string;
}) {
  const body = (
    <Card className="h-full p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${alert ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-lg hover:ring-2 hover:ring-indigo-200">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Single-series horizontal bars: one hue encodes magnitude, values are printed in ink. */
function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  const total = rows.reduce((sum, [, n]) => sum + n, 0);
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <ul className="mt-4 space-y-3">
        {rows.map(([label, count]) => {
          const share = total ? Math.round((count / total) * 100) : 0;
          return (
            <li key={label} title={`${label}: ${count} ticket${count === 1 ? '' : 's'} (${share}%)`}>
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">{label}</span>
                <span className="font-medium tabular-nums text-slate-900">{count}</span>
              </div>
              <div className="mt-1 h-2 rounded bg-slate-100" aria-hidden>
                <div className="h-2 rounded bg-indigo-500" style={{ width: `${(count / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
