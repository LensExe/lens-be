import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { BookingStatus } from '@shared/domain/values/booking.values';
import { BOOKING_REPORT_CATEGORIES } from '@shared/domain/values/report.values';
import {
  IsString,
  IsUUID,
  IsISO8601,
  IsIn,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
} from 'class-validator';

export class BookingAdminQueryQueryDto {
  @ApiPropertyOptional({
    description: 'Lọc booking theo user ID của khách hàng hoặc photographer',
    format: 'uuid',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  user_id?: string;

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
    enum: Object.values(BookingStatus),
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(Object.values(BookingStatus))
  status?: BookingStatus;
}

export class BookingCreateCommandBodyDto {
  @ApiProperty({
    description: 'Photographer duy nhất chịu trách nhiệm cho booking',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  photographer_id!: string;

  @ApiProperty({
    description: 'Booking plan identifier',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  booking_plan_id!: string;

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

  @ApiPropertyOptional({
    description: 'status',
    enum: Object.values(BookingStatus),
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(Object.values(BookingStatus))
  status?: BookingStatus;

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
  @ApiPropertyOptional({
    description: 'Booking issue category',
    enum: BOOKING_REPORT_CATEGORIES,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(BOOKING_REPORT_CATEGORIES)
  booking_issue_type?: (typeof BOOKING_REPORT_CATEGORIES)[number];

  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;

  @ApiPropertyOptional({
    description:
      'Evidence media IDs owned by the reporter and ready for review',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    maxItems: 20,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  evidence_media_ids?: string[];
}

export class BookingRejectCommandBodyDto {
  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;
}
