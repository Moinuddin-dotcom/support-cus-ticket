import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { ReportsResponse, ReportsService } from './reports.service';

@ApiTags('reports (admin)')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @ApiOperation({
    summary: 'Ticket counts by status/priority/category, overdue, per agent, avg resolution time',
  })
  getReport(): Promise<ReportsResponse> {
    return this.reportsService.getReport();
  }
}
