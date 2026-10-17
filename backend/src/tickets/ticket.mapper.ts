import { Prisma, Priority, TicketStatus } from '@prisma/client';
import { computeIsOverdue } from './sla';
import { getNextStatus } from './ticket-status.service';

const userSummarySelect = { id: true, name: true, email: true } satisfies Prisma.UserSelect;

export const ticketInclude = {
  createdBy: { select: userSummarySelect },
  assignedTo: { select: userSummarySelect },
  _count: { select: { comments: true } },
} satisfies Prisma.TicketInclude;

export type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

interface UserSummary {
  id: string;
  name: string;
  email: string;
}

export interface TicketResponse {
  id: string;
  title: string;
  description: string;
  summary: string | null;
  status: TicketStatus;
  priority: Priority;
  category: string;
  slaDeadline: Date;
  isOverdue: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: UserSummary;
  assignedTo: UserSummary | null;
  commentCount: number;
  /** The single status this ticket may move to next (null once CLOSED). */
  nextStatus: TicketStatus | null;
}

export function toTicketResponse(ticket: TicketWithRelations, now = new Date()): TicketResponse {
  return {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    summary: ticket.summary,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    slaDeadline: ticket.slaDeadline,
    // Computed on read as a fallback in case the SLA sweep job has not run yet.
    isOverdue: computeIsOverdue(ticket, now),
    resolvedAt: ticket.resolvedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    createdBy: ticket.createdBy,
    assignedTo: ticket.assignedTo,
    commentCount: ticket._count.comments,
    nextStatus: getNextStatus(ticket.status),
  };
}
