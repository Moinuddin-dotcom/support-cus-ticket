import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreateCommentDto } from './dto/comment.dto';

const commentInclude = {
  user: { select: { id: true, name: true, role: true } },
} satisfies Prisma.CommentInclude;

export interface CommentResponse {
  id: string;
  ticketId: string;
  message: string;
  createdAt: Date;
  user: { id: string; name: string; role: Role };
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: TicketsService,
  ) {}

  async list(user: AuthUser, ticketId: string): Promise<CommentResponse[]> {
    await this.tickets.getAccessibleTicket(user, ticketId);
    const comments = await this.prisma.comment.findMany({
      where: { ticketId },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    });
    return comments.map(toCommentResponse);
  }

  async create(user: AuthUser, ticketId: string, dto: CreateCommentDto): Promise<CommentResponse> {
    // Same visibility rule as reading: customers -> own tickets, agents -> assigned tickets.
    await this.tickets.getAccessibleTicket(user, ticketId);
    const comment = await this.prisma.comment.create({
      data: { ticketId, userId: user.id, message: dto.message },
      include: commentInclude,
    });
    return toCommentResponse(comment);
  }
}

function toCommentResponse(
  comment: Prisma.CommentGetPayload<{ include: typeof commentInclude }>,
): CommentResponse {
  return {
    id: comment.id,
    ticketId: comment.ticketId,
    message: comment.message,
    createdAt: comment.createdAt,
    user: comment.user,
  };
}
