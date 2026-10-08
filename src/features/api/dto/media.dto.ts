import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, IsIn, IsOptional, Min, Max } from 'class-validator';

export class MediaCompleteCommandBodyDto {
  @ApiProperty({
    description: 'media id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  media_id!: string;
}

export class MediaUploadCommandBodyDto {
  @ApiProperty({
    description: 'content type',
    enum: ['image/jpeg', 'image/png', 'image/webp'],
    type: 'string',
  })
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  content_type!: 'image/jpeg' | 'image/png' | 'image/webp';

  @ApiProperty({
    description: 'file size',
    minimum: 1,
    maximum: 104857600,
    example: 1024,
  })
  @IsInt()
  @Min(1)
  @Max(104857600)
  file_size!: number;

  @ApiProperty({
    description:
      'Phạm vi truy cập của file. Mặc định là private; chỉ chọn public khi bucket policy đã cho phép prefix public/.',
    enum: ['public', 'private'],
    required: false,
    default: 'private',
  })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibility?: 'public' | 'private';
}

export class MediaAddGalleryCommandBodyDto {
  @ApiProperty({
    description: 'media id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  media_id!: string;
}
