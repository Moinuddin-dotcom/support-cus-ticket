import { Priority, TicketStatus } from '@prisma/client';
import { isActiveStatus } from './ticket-status.service';

const HOUR_MS = 60 * 60 * 1000;

/** Time allowed to resolve a ticket, by priority. */
export const SLA_HOURS: Record<Priority, number> = {
  [Priority.HIGH]: 4,
  [Priority.MEDIUM]: 24,
  [Priority.LOW]: 48,
};

export function computeSlaDeadline(priority: Priority, createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + SLA_HOURS[priority] * HOUR_MS);
}

/** A ticket is overdue when it is still OPEN/IN_PROGRESS and its SLA deadline has passed. */
export function computeIsOverdue(
  ticket: { status: TicketStatus; slaDeadline: Date },
  now: Date = new Date(),
): boolean {
  return isActiveStatus(ticket.status) && now.getTime() > ticket.slaDeadline.getTime();
}
