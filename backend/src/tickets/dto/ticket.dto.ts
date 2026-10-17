import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, TicketStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../auth/dto/register.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TICKET_CATEGORIES, TicketCategory } from '../../common/constants/categories';

export class CreateTicketDto {
  @ApiProperty({ example: 'Charged twice for my subscription' })
  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'My card was charged twice on the 3rd for the Pro plan.' })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({ enum: TICKET_CATEGORIES })
  @IsIn(TICKET_CATEGORIES)
  category: TicketCategory;

  @ApiPropertyOptional({ description: 'Short summary (e.g. the edited AI suggestion)' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  summary?: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}

export class AssignTicketDto {
  @ApiProperty({ description: 'ID of an active AGENT' })
  @IsUUID()
  agentId: string;
}

export class ListTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: TICKET_CATEGORIES })
  @IsOptional()
  @IsIn(TICKET_CATEGORIES)
  category?: TicketCategory;
}
