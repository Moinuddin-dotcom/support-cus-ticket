import { Priority, TicketStatus } from '@prisma/client';
import { computeIsOverdue, computeSlaDeadline, SLA_HOURS } from './sla';

const HOUR = 60 * 60 * 1000;
const created = new Date('2026-01-01T10:00:00.000Z');

describe('SLA', () => {
  describe('computeSlaDeadline', () => {
    it.each([
      [Priority.HIGH, 4, '2026-01-01T14:00:00.000Z'],
      [Priority.MEDIUM, 24, '2026-01-02T10:00:00.000Z'],
      [Priority.LOW, 48, '2026-01-03T10:00:00.000Z'],
    ])('%s priority gets %ih', (priority, hours, expected) => {
      expect(SLA_HOURS[priority]).toBe(hours);
      expect(computeSlaDeadline(priority, created).toISOString()).toBe(expected);
    });

    it('does not mutate the input date', () => {
      const input = new Date(created);
      computeSlaDeadline(Priority.HIGH, input);
      expect(input.getTime()).toBe(created.getTime());
    });
  });

  describe('computeIsOverdue', () => {
    const slaDeadline = computeSlaDeadline(Priority.HIGH, created);
    const before = new Date(slaDeadline.getTime() - 1);
    const after = new Date(slaDeadline.getTime() + HOUR);

    it.each([TicketStatus.OPEN, TicketStatus.IN_PROGRESS])(
      '%s ticket is overdue only after the deadline',
      (status) => {
        expect(computeIsOverdue({ status, slaDeadline }, before)).toBe(false);
        expect(computeIsOverdue({ status, slaDeadline }, slaDeadline)).toBe(false);
        expect(computeIsOverdue({ status, slaDeadline }, after)).toBe(true);
      },
    );

    it.each([TicketStatus.RESOLVED, TicketStatus.CLOSED])(
      '%s ticket is never overdue',
      (status) => {
        expect(computeIsOverdue({ status, slaDeadline }, after)).toBe(false);
      },
    );
  });
});
