import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsISO8601,
  IsInt,
  IsIn,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUrl,
  Matches,
  ValidateIf,
} from 'class-validator';

export class IdentityAdminUsersQueryQueryDto {
  @ApiPropertyOptional({
    description: 'limit',
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'offset',
    minimum: 0,
    maximum: 1000000,
    example: 0,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  offset?: number;

  @ApiPropertyOptional({
    description: 'status',
    enum: ['active', 'suspended'],
    type: 'string',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @ApiPropertyOptional({ description: 'keyword', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  keyword?: string;
}

export class IdentityUpdateMeCommandBodyDto {
  @ApiPropertyOptional({ description: 'fullname', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fullname?: string;

  @ApiPropertyOptional({ description: 'avatar url', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  avatar_url?: string;

  @ApiPropertyOptional({ description: 'phone number', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/^\+?[0-9]{8,15}$/)
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'gender',
    enum: ['male', 'female', 'other'],
    type: 'string',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @ApiPropertyOptional({ description: 'dob', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dob?: string;
}

export class IdentityStatusCommandBodyDto {
  @ApiProperty({
    description: 'status',
    enum: ['active', 'suspended'],
    type: 'string',
  })
  @IsIn(['active', 'suspended'])
  status!: 'active' | 'suspended';
}
