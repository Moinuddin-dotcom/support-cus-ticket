import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../auth/password';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import { AuthUser } from '../common/types/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto } from './dto/user.dto';
import { toUserResponse, UserResponse } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQueryDto): Promise<PaginatedResult<UserResponse>> {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      isActive: query.isActive,
    };
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(users.map(toUserResponse), total, query);
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        passwordHash: await hashPassword(dto.password),
      },
    });
    return toUserResponse(user);
  }

  async update(actor: AuthUser, id: string, dto: UpdateUserDto): Promise<UserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent an admin from locking themselves (and possibly everyone) out.
    if (actor.id === id) {
      if (dto.isActive === false) {
        throw new BadRequestException('You cannot deactivate your own account');
      }
      if (dto.role && dto.role !== user.role) {
        throw new BadRequestException('You cannot change your own role');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { name: dto.name, role: dto.role, isActive: dto.isActive },
    });
    return toUserResponse(updated);
  }
}
