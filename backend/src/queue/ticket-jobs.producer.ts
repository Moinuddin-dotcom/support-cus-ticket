import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AutoAssignService } from './auto-assign.service';
import { AutoAssignJobData, JobName, TICKETS_QUEUE } from './queue.constants';

const ENQUEUE_TIMEOUT_MS = 2000;

@Injectable()
export class TicketJobsProducer {
  private readonly logger = new Logger(TicketJobsProducer.name);

  constructor(
    @InjectQueue(TICKETS_QUEUE) private readonly queue: Queue,
    private readonly autoAssign: AutoAssignService,
  ) {}

  /**
   * Queues auto-assignment for a new ticket. If Redis is unavailable the
   * assignment runs inline instead, so ticket creation never fails because of the queue.
   */
  async enqueueAutoAssign(ticketId: string): Promise<void> {
    const data: AutoAssignJobData = { ticketId };
    try {
      await withTimeout(
        this.queue.add(JobName.AutoAssign, data, {
          jobId: `auto-assign-${ticketId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 1000,
          removeOnFail: 1000,
        }),
        ENQUEUE_TIMEOUT_MS,
      );
    } catch (error) {
      this.logger.warn(
        `Could not enqueue auto-assign for ${ticketId} (${String(error)}); assigning inline`,
      );
      try {
        await this.autoAssign.assignTicket(ticketId);
      } catch (inlineError) {
        this.logger.error(`Inline auto-assign failed for ${ticketId}: ${String(inlineError)}`);
      }
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
