import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsISO8601,
  IsBoolean,
  IsObject,
  IsInt,
  IsNumber,
  IsArray,
  IsIn,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUrl,
  Matches,
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
export class PortfolioCreateCommandBodyDto {
  @ApiProperty({ description: 'name', type: 'string' })
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
  @ApiPropertyOptional({
    description: 'cover media id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  cover_media_id?: string;
}
export class PhotographerStatusCommandBodyDto {
  @ApiProperty({ description: 'is available', type: 'boolean', example: true })
  @IsBoolean()
  is_available!: boolean;
}
export class IdentityAddDeviceCommandBodyDto {
  @ApiProperty({ description: 'token', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  token!: string;
  @ApiProperty({
    description: 'platform',
    enum: ['ios', 'android', 'web'],
    type: 'string',
  })
  @IsIn(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';
}
export class BookingAdminQueryQueryDto {
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
}
export class PaymentAdminQueryQueryDto {
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
    enum: ['user', 'review', 'booking', 'media'],
    type: 'string',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['user', 'review', 'booking', 'media'])
  target_type?: 'user' | 'review' | 'booking' | 'media';
}
export class IdentityAdminUsersQueryQueryDto {
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
    enum: ['active', 'suspended'],
    type: 'string',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['active', 'suspended'])
  status?: 'active' | 'suspended';
  @ApiPropertyOptional({ description: 'keyword', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  keyword?: string;
}
export class IdentityRegisterCommandBodyDto {
  @ApiProperty({ description: 'fullname', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fullname!: string;
  @ApiPropertyOptional({ description: 'location', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location?: string;
}
export class CalendarCreateCommandBodyDto {
  @ApiProperty({
    description: 'from',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from!: string;
  @ApiProperty({
    description: 'to',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to!: string;
}
export class CalendarBlockCommandBodyDto {
  @ApiProperty({
    description: 'from',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from!: string;
  @ApiProperty({
    description: 'to',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to!: string;
}
export class NotificationCreateCommandBodyDto {
  @ApiProperty({
    description: 'user id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  user_id!: string;
  @ApiProperty({ description: 'title', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;
  @ApiProperty({ description: 'body', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
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
    description: 'experience',
    minimum: 0,
    maximum: 100,
    example: 5,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(100)
  experience?: number;
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
  @ApiProperty({
    description: 'experience',
    minimum: 0,
    maximum: 100,
    example: 5,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  experience!: number;
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
export class IdentityUpdateMeCommandBodyDto {
  @ApiPropertyOptional({ description: 'fullname', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fullname?: string;
  @ApiPropertyOptional({ description: 'avatar url', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  avatar_url?: string;
  @ApiPropertyOptional({ description: 'phone number', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  @Matches(/^\+?[0-9]{8,15}$/)
  phone_number?: string;
  @ApiPropertyOptional({
    description: 'gender',
    enum: ['male', 'female', 'other'],
    type: 'string',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';
  @ApiPropertyOptional({ description: 'dob', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dob?: string;
}
export class BookingCreateCommandBodyDto {
  @ApiProperty({
    description: 'photographer id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  photographer_id!: string;
  @ApiProperty({
    description: 'plan id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  plan_id!: string;
  @ApiProperty({ description: 'location', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  location!: string;
  @ApiProperty({
    description: 'from',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from!: string;
  @ApiProperty({
    description: 'to',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to!: string;
}
export class BookingListQueryQueryDto {
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
export class ChatCreateCommandBodyDto {
  @ApiProperty({
    description: 'booking id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  booking_id!: string;
}
export class ChatListQueryQueryDto {
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
export class NotificationListQueryQueryDto {
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
export class ModerationCreateCommandBodyDto {
  @ApiProperty({
    description: 'target type',
    enum: ['user', 'review', 'booking', 'media'],
    type: 'string',
  })
  @IsIn(['user', 'review', 'booking', 'media'])
  target_type!: 'user' | 'review' | 'booking' | 'media';
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
}
export class SubscriptionCreateCommandBodyDto {
  @ApiProperty({
    description: 'plan id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  plan_id!: string;
  @ApiProperty({ description: 'idempotency key', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;
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
export class IdentityStatusCommandBodyDto {
  @ApiProperty({
    description: 'status',
    enum: ['active', 'suspended'],
    type: 'string',
  })
  @IsIn(['active', 'suspended'])
  status!: 'active' | 'suspended';
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
export class LocationUpdateCommandBodyDto {
  @ApiProperty({
    description: 'latitude',
    minimum: -90,
    maximum: 90,
    example: 0,
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude!: number;
  @ApiProperty({
    description: 'longitude',
    minimum: -180,
    maximum: 180,
    example: 0,
  })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude!: number;
}
export class PaymentDepositCommandBodyDto {
  @ApiProperty({ description: 'idempotency key', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;
}
export class PaymentRemainingCommandBodyDto {
  @ApiProperty({ description: 'idempotency key', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;
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
export class BookingCancelCommandBodyDto {
  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;
}
export class BookingDisputeCommandBodyDto {
  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;
}
export class BookingRejectCommandBodyDto {
  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;
}
export class ReviewCreateCommandBodyDto {
  @ApiProperty({ description: 'rating', minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
  @ApiProperty({
    description: 'punctuality rating',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  punctuality_rating!: number;
  @ApiProperty({
    description: 'attitude rating',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  attitude_rating!: number;
  @ApiPropertyOptional({ description: 'comment', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  comment?: string;
}
export class CalendarUpdateCommandBodyDto {
  @ApiProperty({
    description: 'from',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  from!: string;
  @ApiProperty({
    description: 'to',
    format: 'date-time',
    example: '2026-12-01T09:00:00+07:00',
  })
  @IsISO8601({ strict: true })
  @Matches(/T.*(Z|[+-]\d{2}:\d{2})$/)
  to!: string;
}
export class ChatAttachmentCommandBodyDto {
  @ApiProperty({
    description: 'media id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  media_id!: string;
  @ApiProperty({
    description: 'client message id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  client_message_id!: string;
  @ApiPropertyOptional({ description: 'content', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content?: string;
}
export class ChatMessagesQueryQueryDto {
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
export class PaymentRefundCommandBodyDto {
  @ApiProperty({
    description: 'amount',
    minimum: 1,
    maximum: 9000000000000,
    example: 100000,
  })
  @IsInt()
  @Min(1)
  @Max(9000000000000)
  amount!: number;
  @ApiProperty({ description: 'reason', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  reason!: string;
}
export class PaymentWebhookCommandBodyDto {
  @ApiProperty({ description: 'code', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  code!: string;
  @ApiProperty({ description: 'desc', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  desc!: string;
  @ApiProperty({ description: 'success', type: 'boolean', example: true })
  @IsBoolean()
  success!: boolean;
  @ApiProperty({
    description:
      'Original signed provider webhook JSON, nested unchanged under payload',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  data!: Record<string, unknown>;
  @ApiProperty({ description: 'signature', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  signature!: string;
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
export class ReviewListQueryQueryDto {
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
export class SubscriptionWebhookCommandBodyDto {
  @ApiProperty({ description: 'code', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  code!: string;
  @ApiProperty({ description: 'desc', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  desc!: string;
  @ApiProperty({ description: 'success', type: 'boolean', example: true })
  @IsBoolean()
  success!: boolean;
  @ApiProperty({
    description:
      'Original signed provider webhook JSON, nested unchanged under payload',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  data!: Record<string, unknown>;
  @ApiProperty({ description: 'signature', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  signature!: string;
}
export class PortfolioUpdateCommandBodyDto {
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
  @ApiPropertyOptional({
    description: 'cover media id',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  cover_media_id?: string;
}
export class ReviewUpdateCommandBodyDto {
  @ApiPropertyOptional({
    description: 'rating',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;
  @ApiPropertyOptional({
    description: 'punctuality rating',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(5)
  punctuality_rating?: number;
  @ApiPropertyOptional({
    description: 'attitude rating',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(5)
  attitude_rating?: number;
  @ApiPropertyOptional({ description: 'comment', type: 'string' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  comment?: string;
}
