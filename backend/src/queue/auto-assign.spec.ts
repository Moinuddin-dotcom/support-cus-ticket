import { Role, TicketStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgentLoad, pickLeastLoadedAgent } from './auto-assign';
import { AutoAssignService } from './auto-assign.service';

const agent = (id: string, activeTickets: number, createdAt = '2026-01-01'): AgentLoad => ({
  id,
  activeTickets,
  createdAt: new Date(createdAt),
});

describe('pickLeastLoadedAgent', () => {
  it('returns null when there are no agents', () => {
    expect(pickLeastLoadedAgent([])).toBeNull();
  });

  it('picks the agent with the fewest active tickets', () => {
    const chosen = pickLeastLoadedAgent([agent('a', 5), agent('b', 1), agent('c', 3)]);
    expect(chosen?.id).toBe('b');
  });

  it('picks an agent with zero tickets over busier ones', () => {
    expect(pickLeastLoadedAgent([agent('a', 2), agent('b', 0)])?.id).toBe('b');
  });

  it('breaks ties by earliest createdAt, then by id', () => {
    expect(
      pickLeastLoadedAgent([agent('a', 1, '2026-03-01'), agent('b', 1, '2026-02-01')])?.id,
    ).toBe('b');
    expect(pickLeastLoadedAgent([agent('z', 1), agent('m', 1)])?.id).toBe('m');
  });

  it('is independent of input order', () => {
    const agents = [agent('a', 4), agent('b', 2), agent('c', 2, '2025-12-01')];
    expect(pickLeastLoadedAgent(agents)?.id).toBe('c');
    expect(pickLeastLoadedAgent([...agents].reverse())?.id).toBe('c');
  });
});

describe('AutoAssignService', () => {
  function setup(agents: { id: string; createdAt: Date; active: number }[], updatedCount = 1) {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue(
          agents.map((a) => ({
            id: a.id,
            createdAt: a.createdAt,
            _count: { assignedTickets: a.active },
          })),
        ),
      },
      ticket: { updateMany: jest.fn().mockResolvedValue({ count: updatedCount }) },
    };
    const service = new AutoAssignService(prisma as unknown as PrismaService);
    return { prisma, service };
  }

  it('counts only OPEN/IN_PROGRESS tickets of active agents', async () => {
    const { prisma, service } = setup([]);
    await service.assignTicket('t1');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: Role.AGENT, isActive: true },
        select: expect.objectContaining({
          _count: {
            select: {
              assignedTickets: {
                where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } },
              },
            },
          },
        }),
      }),
    );
  });

  it('assigns the least-loaded agent, only if the ticket is still unassigned', async () => {
    const { prisma, service } = setup([
      { id: 'busy', createdAt: new Date('2026-01-01'), active: 4 },
      { id: 'free', createdAt: new Date('2026-01-02'), active: 1 },
    ]);
    await expect(service.assignTicket('t1')).resolves.toBe('free');
    expect(prisma.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: 't1', assignedToId: null },
      data: { assignedToId: 'free' },
    });
  });

  it('does nothing when there are no active agents', async () => {
    const { prisma, service } = setup([]);
    await expect(service.assignTicket('t1')).resolves.toBeNull();
    expect(prisma.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('does not override a ticket that was already assigned manually', async () => {
    const { service } = setup([{ id: 'a', createdAt: new Date(), active: 0 }], 0);
    await expect(service.assignTicket('t1')).resolves.toBeNull();
  });
});
