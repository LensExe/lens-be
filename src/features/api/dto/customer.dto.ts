import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  PhotographyStyle,
  type PhotographyStyle as PhotographyStyleValue,
} from '@shared/domain/values/photography-style.values';

export class CustomerUpdateCommandBodyDto {
  @ApiPropertyOptional({
    description: 'Giới thiệu ngắn hoặc nhu cầu chụp ảnh của khách hàng',
    type: String,
    nullable: true,
    example: 'Muốn chụp ảnh gia đình theo phong cách tự nhiên',
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Danh sách phong cách chụp ảnh yêu thích',
    type: [String],
    example: ['portrait', 'wedding'],
    enum: Object.values(PhotographyStyle),
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((style) =>
          typeof style === 'string' ? style.trim().toLowerCase() : style,
        )
      : value,
  )
  @IsString({ each: true })
  @IsIn(Object.values(PhotographyStyle), { each: true })
  @MaxLength(50, { each: true })
  preferred_styles?: PhotographyStyleValue[];

  @ApiPropertyOptional({
    description: 'Khu vực / địa điểm hoạt động của khách hàng',
    type: String,
    example: 'Hà Nội',
    nullable: true,
  })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(255)
  location?: string | null;
}

export class CustomerAdminListQueryQueryDto {
  @ApiPropertyOptional({ type: String, description: 'Tìm theo tên, email' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @ApiPropertyOptional({ type: String, description: 'Lọc theo khu vực' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class CustomerRecommendQueryQueryDto {
  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ type: Number, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
