import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Priority, Role, Ticket, TicketStatus } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { TicketJobsProducer } from '../queue/ticket-jobs.producer';
import { TicketsService } from './tickets.service';

const customer: AuthUser = { id: 'cust-1', email: 'c@x.io', name: 'C', role: Role.CUSTOMER };
const intruder: AuthUser = { id: 'cust-2', email: 'i@x.io', name: 'I', role: Role.CUSTOMER };
const agent: AuthUser = { id: 'agent-1', email: 'a@x.io', name: 'A', role: Role.AGENT };
const otherAgent: AuthUser = { id: 'agent-2', email: 'b@x.io', name: 'B', role: Role.AGENT };

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  const now = new Date();
  return {
    id: 'ticket-1',
    title: 'Broken',
    description: 'It is broken',
    summary: null,
    status: TicketStatus.OPEN,
    priority: Priority.HIGH,
    category: 'Technical',
    createdById: customer.id,
    assignedToId: agent.id,
    slaDeadline: new Date(now.getTime() + 3_600_000),
    isOverdue: false,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function setup(ticket: Ticket | null) {
  const withRelations = ticket && {
    ...ticket,
    createdBy: { id: customer.id, name: 'C', email: 'c@x.io' },
    assignedTo: null,
    _count: { comments: 0 },
  };
  const prisma = {
    ticket: {
      findUnique: jest
        .fn()
        .mockImplementation((args: { include?: unknown }) =>
          Promise.resolve(args.include ? withRelations : ticket),
        ),
      create: jest.fn().mockImplementation(({ data }: { data: Partial<Ticket> }) =>
        Promise.resolve({
          ...makeTicket(data),
          createdBy: { id: customer.id, name: 'C', email: 'c@x.io' },
          assignedTo: null,
          _count: { comments: 0 },
        }),
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const jobs = { enqueueAutoAssign: jest.fn().mockResolvedValue(undefined) };
  const service = new TicketsService(
    prisma as unknown as PrismaService,
    jobs as unknown as TicketJobsProducer,
  );
  return { prisma, jobs, service };
}

describe('TicketsService', () => {
  describe('ownership checks', () => {
    it('returns the ticket to its owner', async () => {
      const { service } = setup(makeTicket());
      await expect(service.findOne(customer, 'ticket-1')).resolves.toMatchObject({
        id: 'ticket-1',
        nextStatus: TicketStatus.IN_PROGRESS,
      });
    });

    it("hides another customer's ticket behind a 404", async () => {
      const { service } = setup(makeTicket());
      await expect(service.findOne(intruder, 'ticket-1')).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.getAccessibleTicket(intruder, 'ticket-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('hides tickets not assigned to the agent', async () => {
      const { service } = setup(makeTicket());
      await expect(service.findOne(otherAgent, 'ticket-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('computes the SLA deadline from priority and queues auto-assignment', async () => {
      const { service, prisma, jobs } = setup(null);
      const before = Date.now();
      const result = await service.create(customer, {
        title: 'Site down',
        description: 'Nothing loads at all',
        priority: Priority.HIGH,
        category: 'Technical',
      });

      const data = (prisma.ticket.create.mock.calls[0] as [{ data: Ticket }])[0].data;
      expect(data.createdById).toBe(customer.id);
      const slaMs = data.slaDeadline.getTime() - data.createdAt.getTime();
      expect(slaMs).toBe(4 * 3_600_000);
      expect(data.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(jobs.enqueueAutoAssign).toHaveBeenCalledWith(result.id);
    });
  });

  describe('updateStatus', () => {
    it('moves the ticket to the next status', async () => {
      const { service, prisma } = setup(makeTicket());
      await service.updateStatus(agent, 'ticket-1', TicketStatus.IN_PROGRESS);
      expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
        where: { id: 'ticket-1', status: TicketStatus.OPEN },
        data: { status: TicketStatus.IN_PROGRESS, resolvedAt: undefined },
      });
    });

    it('stamps resolvedAt when resolving', async () => {
      const { service, prisma } = setup(makeTicket({ status: TicketStatus.IN_PROGRESS }));
      await service.updateStatus(agent, 'ticket-1', TicketStatus.RESOLVED);
      const call = prisma.ticket.updateMany.mock.calls[0] as [{ data: { resolvedAt: Date } }];
      expect(call[0].data.resolvedAt).toBeInstanceOf(Date);
    });

    it('rejects an invalid transition with HTTP 400 and a clear message', async () => {
      const { service, prisma } = setup(makeTicket());
      const attempt = service.updateStatus(agent, 'ticket-1', TicketStatus.CLOSED);
      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.updateStatus(agent, 'ticket-1', TicketStatus.CLOSED)).rejects.toThrow(
        'Cannot skip steps: OPEN can only move to IN_PROGRESS, not CLOSED.',
      );
      expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
    });

    it('does not let a customer change status of their own ticket', async () => {
      const { service } = setup(makeTicket());
      await expect(
        service.updateStatus(customer, 'ticket-1', TicketStatus.IN_PROGRESS),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('does not let an unassigned agent change status', async () => {
      const { service } = setup(makeTicket());
      await expect(
        service.updateStatus(otherAgent, 'ticket-1', TicketStatus.IN_PROGRESS),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
