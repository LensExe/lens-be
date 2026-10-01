import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsInt,
  IsArray,
  IsIn,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  ArrayUnique,
  ValidateIf,
} from 'class-validator';
import {
  REPORT_RESOLUTION_STATUSES,
  REPORT_TARGET_TYPES,
  ReportStatus,
} from '@shared/domain/values/report.values';

export class ModerationListQueryQueryDto {
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
    enum: Object.values(ReportStatus),
    type: 'string',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(Object.values(ReportStatus))
  status?: ReportStatus;

  @ApiPropertyOptional({
    description: 'target type',
    enum: REPORT_TARGET_TYPES,
    type: 'string',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(REPORT_TARGET_TYPES)
  target_type?: (typeof REPORT_TARGET_TYPES)[number];
}

export class ModerationMineQueryQueryDto {
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
}

export class ModerationCreateCommandBodyDto {
  @ApiProperty({
    description: 'target type',
    enum: REPORT_TARGET_TYPES,
    type: 'string',
  })
  @IsIn(REPORT_TARGET_TYPES)
  target_type!: (typeof REPORT_TARGET_TYPES)[number];

  @ApiProperty({
    description: 'target id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  target_id!: string;

  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Evidence media IDs',
    type: 'array',
    items: { type: 'string', format: 'uuid' },
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  evidence_media_ids?: string[];
}

export class ModerationResolveCommandBodyDto {
  @ApiProperty({
    description: 'status',
    enum: REPORT_RESOLUTION_STATUSES,
    type: 'string',
  })
  @IsIn(REPORT_RESOLUTION_STATUSES)
  status!: (typeof REPORT_RESOLUTION_STATUSES)[number];

  @ApiProperty({ description: 'resolution', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  resolution!: string;
}
