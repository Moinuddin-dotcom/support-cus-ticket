import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../auth/dto/register.dto';

export class SuggestDto {
  @ApiProperty({ example: 'Cannot log in after password reset' })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'I reset my password but the new one is rejected every time.' })
  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;
}
