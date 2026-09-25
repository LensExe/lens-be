import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RankUpdateCommandBodyDto {
  @ApiPropertyOptional({ description: 'name', type: 'string', example: 'Vàng' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'min completed bookings',
    type: 'integer',
    example: 60,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(1000000)
  min_completed?: number;

  @ApiPropertyOptional({
    description: 'commission percent (0-100)',
    type: 'number',
    example: 7,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  commission_percent?: number;
}
