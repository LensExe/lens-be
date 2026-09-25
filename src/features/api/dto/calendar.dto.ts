import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsString,
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
}
