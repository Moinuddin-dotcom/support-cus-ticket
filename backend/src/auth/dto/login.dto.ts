import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normaliseEmail } from './register.dto';

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @Transform(normaliseEmail)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
