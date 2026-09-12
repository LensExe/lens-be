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
  ValidateIf,
} from 'class-validator';

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

  @ApiPropertyOptional({ description: 'status', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  status?: string;

  @ApiPropertyOptional({
    description: 'target type',
    enum: ['user', 'booking', 'photographer', 'portfolio', 'feedback'],
    type: 'string',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['user', 'booking', 'photographer', 'portfolio', 'feedback'])
  target_type?: 'user' | 'booking' | 'photographer' | 'portfolio' | 'feedback';
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
    enum: ['user', 'booking', 'photographer', 'portfolio', 'feedback'],
    type: 'string',
  })
  @IsIn(['user', 'booking', 'photographer', 'portfolio', 'feedback'])
  target_type!: 'user' | 'booking' | 'photographer' | 'portfolio' | 'feedback';

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
  @IsUUID('4', { each: true })
  evidence_media_ids?: string[];
}

export class ModerationResolveCommandBodyDto {
  @ApiProperty({
    description: 'status',
    enum: ['resolved', 'rejected', 'escalated'],
    type: 'string',
  })
  @IsIn(['resolved', 'rejected', 'escalated'])
  status!: 'resolved' | 'rejected' | 'escalated';

  @ApiProperty({ description: 'resolution', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  resolution!: string;
}
