import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class BadgeUpdateCommandBodyDto {
  @ApiPropertyOptional({
    description: 'name',
    type: 'string',
    example: 'Đánh giá xuất sắc',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'description', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'minimum metric value',
    type: 'number',
    example: 4.8,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  min_value?: number;

  @ApiPropertyOptional({
    description: 'minimum visible reviews',
    type: 'integer',
    example: 10,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000)
  min_reviews?: number;

  @ApiPropertyOptional({ description: 'is active', type: 'boolean' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_active?: boolean;
}
