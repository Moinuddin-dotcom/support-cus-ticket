import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Ticket, TicketStatus } from '@prisma/client';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { TicketJobsProducer } from '../queue/ticket-jobs.producer';
import { AssignTicketDto, CreateTicketDto, ListTicketsQueryDto } from './dto/ticket.dto';
import { computeSlaDeadline } from './sla';
import { canAccessTicket, canChangeStatus, ticketScopeFor } from './ticket-access.policy';
import { InvalidStatusTransitionError, assertValidTransition } from './ticket-status.service';
import { TicketResponse, ticketInclude, toTicketResponse } from './ticket.mapper';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: TicketJobsProducer,
  ) {}

  async create(user: AuthUser, dto: CreateTicketDto): Promise<TicketResponse> {
    const now = new Date();
    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        summary: dto.summary || null,
        priority: dto.priority,
        category: dto.category,
        createdById: user.id,
        slaDeadline: computeSlaDeadline(dto.priority, now),
        createdAt: now,
      },
      include: ticketInclude,
    });

    // Auto-assignment runs in the background; never fail ticket creation because of it.
    await this.jobs.enqueueAutoAssign(ticket.id);

    return toTicketResponse(ticket);
  }

  async list(user: AuthUser, query: ListTicketsQueryDto): Promise<PaginatedResult<TicketResponse>> {
    const where: Prisma.TicketWhereInput = {
      AND: [
        ticketScopeFor(user),
        { status: query.status, priority: query.priority, category: query.category },
      ],
    };
    const [tickets, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: ticketInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.ticket.count({ where }),
    ]);
    const now = new Date();
    return paginate(
      tickets.map((ticket) => toTicketResponse(ticket, now)),
      total,
      query,
    );
  }

  async findOne(user: AuthUser, id: string): Promise<TicketResponse> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
    if (!ticket || !canAccessTicket(user, ticket)) {
      throw new NotFoundException('Ticket not found');
    }
    return toTicketResponse(ticket);
  }

  /**
   * Loads a ticket the user is allowed to see, or throws 404.
   * Returning 404 (not 403) avoids revealing that someone else's ticket exists.
   */
  async getAccessibleTicket(user: AuthUser, id: string): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket || !canAccessTicket(user, ticket)) {
      throw new NotFoundException('Ticket not found');
    }
    return ticket;
  }

  async updateStatus(user: AuthUser, id: string, status: TicketStatus): Promise<TicketResponse> {
    const ticket = await this.getAccessibleTicket(user, id);
    if (!canChangeStatus(user, ticket)) {
      throw new ForbiddenException('Only the assigned agent or an admin can change ticket status');
    }

    try {
      assertValidTransition(ticket.status, status);
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    // Conditional update guards against two concurrent transitions from the same status.
    const { count } = await this.prisma.ticket.updateMany({
      where: { id, status: ticket.status },
      data: {
        status,
        resolvedAt: status === TicketStatus.RESOLVED ? new Date() : undefined,
      },
    });
    if (count === 0) {
      throw new ConflictException('Ticket status was changed by someone else; reload and retry');
    }
    return this.findOne(user, id);
  }

  async assign(user: AuthUser, id: string, dto: AssignTicketDto): Promise<TicketResponse> {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('A closed ticket cannot be reassigned');
    }

    const agent = await this.prisma.user.findUnique({ where: { id: dto.agentId } });
    if (!agent || agent.role !== Role.AGENT || !agent.isActive) {
      throw new BadRequestException('Tickets can only be assigned to an active agent');
    }

    await this.prisma.ticket.update({ where: { id }, data: { assignedToId: agent.id } });
    return this.findOne(user, id);
  }
}
