import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, ValidateIf } from 'class-validator';

export class AuthRegisterCommandBodyDto {
  @ApiProperty({ description: 'fullname', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fullname!: string;

  @ApiPropertyOptional({ description: 'location', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location?: string;
}

/** Alias for backward compatibility with Identity domain */
export { AuthRegisterCommandBodyDto as IdentityRegisterCommandBodyDto };
