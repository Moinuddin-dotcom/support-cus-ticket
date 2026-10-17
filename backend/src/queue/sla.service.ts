import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_STATUSES } from '../tickets/ticket-status.service';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Flags every OPEN/IN_PROGRESS ticket whose SLA deadline has passed. Returns how many were flagged. */
  async flagOverdueTickets(now: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.ticket.updateMany({
      where: {
        isOverdue: false,
        status: { in: [...ACTIVE_STATUSES] },
        slaDeadline: { lt: now },
      },
      data: { isOverdue: true },
    });
    if (count > 0) {
      this.logger.log(`Flagged ${count} ticket(s) as overdue`);
    }
    return count;
  }
}
