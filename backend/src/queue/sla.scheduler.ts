import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Env } from '../config/env.validation';
import { JobName, SLA_SCHEDULER_ID, TICKETS_QUEUE } from './queue.constants';

/** Registers the repeatable SLA sweep. Upserting is idempotent across restarts and replicas. */
@Injectable()
export class SlaScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(SlaScheduler.name);

  constructor(
    @InjectQueue(TICKETS_QUEUE) private readonly queue: Queue,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const every = this.config.get('SLA_CHECK_INTERVAL_MS', { infer: true });
    try {
      await this.queue.upsertJobScheduler(
        SLA_SCHEDULER_ID,
        { every },
        { name: JobName.SlaCheck, opts: { removeOnComplete: 100, removeOnFail: 100 } },
      );
      this.logger.log(`SLA check scheduled every ${Math.round(every / 1000)}s`);
    } catch (error) {
      this.logger.error(`Failed to schedule SLA check: ${String(error)}`);
    }
  }
}
