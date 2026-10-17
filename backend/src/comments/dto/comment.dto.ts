import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../auth/dto/register.dto';

export class CreateCommentDto {
  @ApiProperty({ example: 'Thanks, I have refunded the duplicate charge.' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message: string;
}
