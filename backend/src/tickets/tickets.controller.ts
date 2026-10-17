import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginatedResult } from '../common/dto/pagination.dto';
import { AuthUser } from '../common/types/auth-user';
import {
  AssignTicketDto,
  CreateTicketDto,
  ListTicketsQueryDto,
  UpdateTicketStatusDto,
} from './dto/ticket.dto';
import { TicketResponse } from './ticket.mapper';
import { TicketsService } from './tickets.service';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Create a ticket (customers)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTicketDto): Promise<TicketResponse> {
    return this.ticketsService.create(user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List tickets visible to the caller (own / assigned / all), paginated and filterable',
  })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTicketsQueryDto,
  ): Promise<PaginatedResult<TicketResponse>> {
    return this.ticketsService.list(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one ticket (404 if not visible to the caller)' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TicketResponse> {
    return this.ticketsService.findOne(user, id);
  }

  @Patch(':id/status')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Move a ticket to its next status (OPEN→IN_PROGRESS→RESOLVED→CLOSED)' })
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ): Promise<TicketResponse> {
    return this.ticketsService.updateStatus(user, id, dto.status);
  }

  @Patch(':id/assign')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign or reassign a ticket to an agent (admin)' })
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ): Promise<TicketResponse> {
    return this.ticketsService.assign(user, id, dto);
  }
}
