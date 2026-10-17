import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';

/**
 * Who may see a ticket:
 *  - CUSTOMER: only tickets they created
 *  - AGENT:    only tickets assigned to them
 *  - ADMIN:    every ticket
 */
export function canAccessTicket(
  user: Pick<AuthUser, 'id' | 'role'>,
  ticket: { createdById: string; assignedToId: string | null },
): boolean {
  switch (user.role) {
    case Role.ADMIN:
      return true;
    case Role.AGENT:
      return ticket.assignedToId === user.id;
    case Role.CUSTOMER:
      return ticket.createdById === user.id;
    default:
      return false;
  }
}

/** Same rule as canAccessTicket, expressed as a Prisma filter for list queries. */
export function ticketScopeFor(user: Pick<AuthUser, 'id' | 'role'>): Prisma.TicketWhereInput {
  switch (user.role) {
    case Role.ADMIN:
      return {};
    case Role.AGENT:
      return { assignedToId: user.id };
    case Role.CUSTOMER:
      return { createdById: user.id };
    default:
      // Unknown role: match nothing.
      return { id: { in: [] } };
  }
}

/** Customers can only read and comment; status changes are for the assigned agent or an admin. */
export function canChangeStatus(
  user: Pick<AuthUser, 'id' | 'role'>,
  ticket: { assignedToId: string | null },
): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }
  return user.role === Role.AGENT && ticket.assignedToId === user.id;
}
