import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsInt,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  ArrayUnique,
  ValidateIf,
} from 'class-validator';

export class PortfolioCreateCommandBodyDto {
  @ApiProperty({ description: 'name', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name!: string;

  @ApiPropertyOptional({ description: 'category', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  category?: string;

  @ApiPropertyOptional({ description: 'description', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({
    description: 'cover media id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  cover_media_id?: string;
}

export class PortfolioReorderCommandBodyDto {
  @ApiProperty({
    description: 'item ids',
    type: 'array',
    items: { type: 'string' },
  })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  item_ids!: string[];
}

export class PortfolioListQueryQueryDto {
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

export class PortfolioAddCommandBodyDto {
  @ApiProperty({
    description: 'media id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  media_id!: string;
}

export class PortfolioUpdateCommandBodyDto {
  @ApiPropertyOptional({ description: 'name', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name?: string;

  @ApiPropertyOptional({ description: 'category', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(500)
  category?: string;

  @ApiPropertyOptional({ description: 'description', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({
    description: 'cover media id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  cover_media_id?: string;
}
