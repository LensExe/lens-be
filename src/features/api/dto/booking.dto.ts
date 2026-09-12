import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsISO8601,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class BookingAdminQueryQueryDto {
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

  @ApiPropertyOptional({ description: 'status', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  status?: string;
}

export class BookingCreateCommandBodyDto {
  @ApiProperty({
    description: 'photographer id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  photographer_id!: string;

  @ApiProperty({
    description: 'plan id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  plan_id!: string;

  @ApiProperty({ description: 'location', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location!: string;

  @ApiProperty({
    description: 'from',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from!: string;

  @ApiProperty({
    description: 'to',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to!: string;
}

export class BookingListQueryQueryDto {
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

  @ApiPropertyOptional({ description: 'status', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  status?: string;

  @ApiPropertyOptional({
    description: 'from',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from?: string;

  @ApiPropertyOptional({
    description: 'to',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to?: string;
}

export class BookingCancelCommandBodyDto {
  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;
}

export class BookingDisputeCommandBodyDto {
  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;
}

export class BookingRejectCommandBodyDto {
  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;
}
