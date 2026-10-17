export const TICKETS_QUEUE = 'tickets';

export const JobName = {
  AutoAssign: 'auto-assign',
  SlaCheck: 'sla-check',
} as const;

export const SLA_SCHEDULER_ID = 'sla-check-scheduler';

export interface AutoAssignJobData {
  ticketId: string;
}
