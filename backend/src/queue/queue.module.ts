import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env.validation';
import { AutoAssignService } from './auto-assign.service';
import { TICKETS_QUEUE } from './queue.constants';
import { redisConnectionFromUrl } from './redis-connection';
import { SlaScheduler } from './sla.scheduler';
import { SlaService } from './sla.service';
import { TicketJobsProducer } from './ticket-jobs.producer';
import { TicketsProcessor } from './tickets.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: redisConnectionFromUrl(config.get('REDIS_URL', { infer: true })),
      }),
    }),
    BullModule.registerQueue({ name: TICKETS_QUEUE }),
  ],
  providers: [AutoAssignService, SlaService, TicketJobsProducer, TicketsProcessor, SlaScheduler],
  exports: [TicketJobsProducer, AutoAssignService, SlaService],
})
export class QueueModule {}
