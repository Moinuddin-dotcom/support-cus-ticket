import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AutoAssignService } from './auto-assign.service';
import { AutoAssignJobData, JobName, TICKETS_QUEUE } from './queue.constants';
import { SlaService } from './sla.service';

/** BullMQ worker for the `tickets` queue: auto-assignment and the periodic SLA sweep. */
@Processor(TICKETS_QUEUE)
export class TicketsProcessor extends WorkerHost {
  private readonly logger = new Logger(TicketsProcessor.name);

  constructor(
    private readonly autoAssign: AutoAssignService,
    private readonly sla: SlaService,
  ) {
    super();
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case JobName.AutoAssign: {
        const { ticketId } = job.data as AutoAssignJobData;
        return { assignedTo: await this.autoAssign.assignTicket(ticketId) };
      }
      case JobName.SlaCheck:
        return { flagged: await this.sla.flagOverdueTickets() };
      default:
        this.logger.warn(`Ignoring unknown job "${job.name}"`);
        return null;
    }
  }
}
