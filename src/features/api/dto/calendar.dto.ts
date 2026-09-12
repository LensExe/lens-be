import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsISO8601,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CalendarBlockCommandBodyDto {
  @ApiProperty({
    description: 'Blocked date',
    format: 'date',
    example: '2026-12-01',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiPropertyOptional({ description: 'Reason for blocking the date' })
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
