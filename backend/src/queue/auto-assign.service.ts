import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../tickets/ticket-status.service';
import { pickLeastLoadedAgent } from './auto-assign';

@Injectable()
export class AutoAssignService {
  private readonly logger = new Logger(AutoAssignService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assigns an unassigned ticket to the least-loaded active agent.
   * Returns the chosen agent id, or null if nothing was assigned.
   */
  async assignTicket(ticketId: string): Promise<string | null> {
    const agents = await this.prisma.user.findMany({
      where: { role: Role.AGENT, isActive: true },
      select: {
        id: true,
        createdAt: true,
        _count: {
          select: { assignedTickets: { where: { status: { in: [...ACTIVE_STATUSES] } } } },
        },
      },
    });

    const chosen = pickLeastLoadedAgent(
      agents.map((agent) => ({
        id: agent.id,
        createdAt: agent.createdAt,
        activeTickets: agent._count.assignedTickets,
      })),
    );
    if (!chosen) {
      this.logger.warn(`No active agents available to take ticket ${ticketId}`);
      return null;
    }

    // Only assign if still unassigned, so a manual admin assignment always wins.
    const { count } = await this.prisma.ticket.updateMany({
      where: { id: ticketId, assignedToId: null },
      data: { assignedToId: chosen.id },
    });
    if (count === 0) {
      return null;
    }
    this.logger.log(`Ticket ${ticketId} auto-assigned to agent ${chosen.id}`);
    return chosen.id;
  }
}
