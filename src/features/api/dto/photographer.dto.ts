import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  ArrayUnique,
  ValidateIf,
} from 'class-validator';

export class PhotographerLocationCommandBodyDto {
  @ApiProperty({ description: 'location', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location!: string;
}

export class PhotographerStatusCommandBodyDto {
  @ApiProperty({ description: 'is available', type: 'boolean', example: true })
  @IsBoolean()
  is_available!: boolean;
}

export class PhotographerAdminQueryQueryDto {
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

export class PhotographerUpdateCommandBodyDto {
  @ApiPropertyOptional({ description: 'tax code', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  tax_code?: string;

  @ApiPropertyOptional({
    description: 'styles',
    type: 'array',
    items: { type: 'string' },
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  styles?: string[];

  @ApiPropertyOptional({
    description: 'Year the photographer started their career',
    minimum: 1900,
    maximum: 2100,
    example: 2021,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1900)
  @Max(2100)
  started_career_at?: number;

  @ApiPropertyOptional({ description: 'description', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description?: string;
}

export class PhotographerCreateCommandBodyDto {
  @ApiPropertyOptional({ description: 'tax code', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  tax_code?: string;

  @ApiProperty({
    description: 'styles',
    type: 'array',
    items: { type: 'string' },
  })
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsString({ each: true })
  styles!: string[];

  @ApiPropertyOptional({
    description: 'Year the photographer started their career',
    minimum: 1900,
    maximum: 2100,
    example: 2021,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1900)
  @Max(2100)
  started_career_at?: number;

  @ApiProperty({ description: 'location', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location!: string;

  @ApiPropertyOptional({ description: 'description', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description?: string;
}

export class PhotographerTopQueryQueryDto {
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

export class PhotographerSearchQueryQueryDto {
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

  @ApiPropertyOptional({ description: 'location', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({ description: 'keyword', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  keyword?: string;

  @ApiPropertyOptional({
    description: 'min rating',
    minimum: 0,
    maximum: 5,
    example: 4,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(5)
  min_rating?: number;
}
