import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';

export class BookingPlanCreateCommandBodyDto {
  @ApiProperty({
    description: 'name',
    type: 'string',
    example: 'Chụp chân dung ngoại cảnh',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name!: string;

  @ApiPropertyOptional({ description: 'description', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description?: string;

  @ApiProperty({
    description: 'price (VND)',
    type: 'integer',
    example: 1000000,
  })
  @IsInt()
  @Min(1)
  @Max(9000000000000)
  price!: number;

  @ApiProperty({
    description: 'duration minutes',
    type: 'integer',
    example: 90,
  })
  @IsInt()
  @Min(15)
  @Max(1440)
  duration_minutes!: number;

  @ApiProperty({ description: 'photo count', type: 'integer', example: 50 })
  @IsInt()
  @Min(0)
  @Max(10000)
  photo_count!: number;

  @ApiProperty({
    description: 'retouched photo count',
    type: 'integer',
    example: 10,
  })
  @IsInt()
  @Min(0)
  @Max(10000)
  retouched_photo_count!: number;

  @ApiPropertyOptional({
    description: 'features',
    type: 'array',
    items: { type: 'string' },
    example: ['Toàn bộ ảnh gốc', 'Hỗ trợ 1 bộ phụ kiện'],
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  features?: string[];
}

export class BookingPlanUpdateCommandBodyDto {
  @ApiPropertyOptional({ description: 'name', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name?: string;

  @ApiPropertyOptional({ description: 'description', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ description: 'price (VND)', type: 'integer' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(9000000000000)
  price?: number;

  @ApiPropertyOptional({ description: 'duration minutes', type: 'integer' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(15)
  @Max(1440)
  duration_minutes?: number;

  @ApiPropertyOptional({ description: 'photo count', type: 'integer' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(10000)
  photo_count?: number;

  @ApiPropertyOptional({
    description: 'retouched photo count',
    type: 'integer',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(10000)
  retouched_photo_count?: number;

  @ApiPropertyOptional({
    description: 'features',
    type: 'array',
    items: { type: 'string' },
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(200, { each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'is active', type: 'boolean' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_active?: boolean;
}
