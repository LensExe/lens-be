import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
  IsBoolean,
  IsISO8601,
  Max,
  MaxLength,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CalendarBlockCommandBodyDto {
  @ApiPropertyOptional({
    description:
      'Block the whole day in Vietnam time. Send either date, or from and to',
    format: 'date',
    example: '2026-12-01',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date?: string;

  @ApiPropertyOptional({
    description: 'Start of the blocked time (may span several days)',
    format: 'date-time',
    example: '2026-12-01T14:00:00+07:00',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from?: string;

  @ApiPropertyOptional({
    description: 'End of the blocked time (exclusive)',
    format: 'date-time',
    example: '2026-12-01T16:00:00+07:00',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to?: string;

  @ApiPropertyOptional({ description: 'Reason for blocking' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(10000)
  reason?: string;
  @ApiPropertyOptional({
    description:
      'true = decline the pending requests overlapping this time (check GET calendar/blocked-times/affected first). Without it the call fails with 409 if any exist',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  decline_pending?: boolean;
}

export class CalendarBlockPreviewQueryQueryDto {
  @ApiPropertyOptional({
    description: 'Whole day in Vietnam time. Send either date, or from and to',
    format: 'date',
    example: '2026-12-01',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date?: string;

  @ApiPropertyOptional({
    description: 'Start of the time to block',
    format: 'date-time',
    example: '2026-12-01T14:00:00+07:00',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from?: string;

  @ApiPropertyOptional({
    description: 'End of the time to block (exclusive)',
    format: 'date-time',
    example: '2026-12-01T16:00:00+07:00',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to?: string;
}

export class CalendarMeQueryQueryDto {
  @ApiPropertyOptional({
    description: 'only items ending after this time',
    format: 'date-time',
    example: '2026-12-01T00:00:00+07:00',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from?: string;

  @ApiPropertyOptional({
    description: 'only items starting before this time',
    format: 'date-time',
    example: '2026-12-08T00:00:00+07:00',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to?: string;
}

export class CalendarAvailabilityQueryQueryDto {
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

export class WorkingShiftDto {
  @ApiProperty({
    description: 'weekday: 1 = Monday ... 7 = Sunday',
    type: 'integer',
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  weekday!: number;

  @ApiProperty({
    description: 'start time HH:MM (Vietnam time)',
    example: '08:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  start_time!: string;

  @ApiProperty({
    description: 'end time HH:MM (Vietnam time)',
    example: '12:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  end_time!: string;
}

export class CalendarSetWorkingHoursCommandBodyDto {
  @ApiProperty({
    description: 'weekly shifts; empty list resets to the default 08:00-20:00',
    type: [WorkingShiftDto],
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WorkingShiftDto)
  items!: WorkingShiftDto[];
  @ApiPropertyOptional({
    description:
      'true = decline the pending requests outside the new hours (check POST calendar/me/working-hours/affected first). Without it the call fails with 409 if any exist',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  decline_pending?: boolean;
}

export class CalendarWorkingHoursPreviewQueryBodyDto {
  @ApiProperty({
    description: 'weekly shifts the photographer plans to save',
    type: [WorkingShiftDto],
  })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WorkingShiftDto)
  items!: WorkingShiftDto[];
}
