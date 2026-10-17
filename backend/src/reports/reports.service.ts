import { Injectable } from '@nestjs/common';
import { Priority, Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../tickets/ticket-status.service';

export interface AgentWorkload {
  agentId: string;
  name: string;
  email: string;
  isActive: boolean;
  total: number;
  active: number;
  resolved: number;
}

export interface ReportsResponse {
  totalTickets: number;
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<Priority, number>;
  byCategory: Record<string, number>;
  overdueCount: number;
  unassignedCount: number;
  ticketsPerAgent: AgentWorkload[];
  /** Mean hours from creation to RESOLVED, over tickets that have been resolved. Null if none. */
  averageResolutionHours: number | null;
  generatedAt: Date;
}

function zeroed<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReport(now: Date = new Date()): Promise<ReportsResponse> {
    const [
      totalTickets,
      byStatusRows,
      byPriorityRows,
      byCategoryRows,
      overdueCount,
      unassignedCount,
      agentRows,
      perAgentRows,
      avgRows,
    ] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['category'], _count: { _all: true } }),
      // Same rule as computeIsOverdue, so the report agrees with the badges even between SLA sweeps.
      this.prisma.ticket.count({
        where: { status: { in: [...ACTIVE_STATUSES] }, slaDeadline: { lt: now } },
      }),
      this.prisma.ticket.count({
        where: { assignedToId: null, status: { not: TicketStatus.CLOSED } },
      }),
      this.prisma.user.findMany({
        where: { role: Role.AGENT },
        select: { id: true, name: true, email: true, isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.ticket.groupBy({
        by: ['assignedToId', 'status'],
        where: { assignedToId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.$queryRaw<{ avg_seconds: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")))::float8 AS avg_seconds
        FROM "Ticket"
        WHERE "resolvedAt" IS NOT NULL`,
    ]);

    const byStatus = zeroed(Object.values(TicketStatus));
    for (const row of byStatusRows) byStatus[row.status] = row._count._all;

    const byPriority = zeroed(Object.values(Priority));
    for (const row of byPriorityRows) byPriority[row.priority] = row._count._all;

    const byCategory: Record<string, number> = {};
    for (const row of byCategoryRows) byCategory[row.category] = row._count._all;

    const ticketsPerAgent: AgentWorkload[] = agentRows.map((agent) => {
      const rows = perAgentRows.filter((row) => row.assignedToId === agent.id);
      const countFor = (statuses: readonly TicketStatus[]) =>
        rows
          .filter((row) => statuses.includes(row.status))
          .reduce((sum, row) => sum + row._count._all, 0);
      return {
        agentId: agent.id,
        name: agent.name,
        email: agent.email,
        isActive: agent.isActive,
        total: rows.reduce((sum, row) => sum + row._count._all, 0),
        active: countFor(ACTIVE_STATUSES),
        resolved: countFor([TicketStatus.RESOLVED, TicketStatus.CLOSED]),
      };
    });

    const avgSeconds = avgRows[0]?.avg_seconds ?? null;
    return {
      totalTickets,
      byStatus,
      byPriority,
      byCategory,
      overdueCount,
      unassignedCount,
      ticketsPerAgent,
      averageResolutionHours:
        avgSeconds === null ? null : Math.round((avgSeconds / 3600) * 10) / 10,
      generatedAt: now,
    };
  }
}
