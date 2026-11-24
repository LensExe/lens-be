import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  IsUUID,
  IsBoolean,
  IsObject,
  IsIn,
  IsInt,
  Matches,
  Max,
  MinLength,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import type { PlanFeatureValue } from '@shared/domain/types/plan.types';

export class SubscriptionPlanCreateBodyDto {
  @ApiProperty({ example: 'MONTHLY_PRO', maxLength: 64 })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
  code!: string;

  @ApiProperty({ example: 'Pro hàng tháng', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiProperty({ description: 'Giá subscription (VND)', example: 199000 })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  price!: number;

  @ApiProperty({ description: 'Chu kỳ tính phí theo ngày', example: 30 })
  @IsInt()
  @Min(1)
  @Max(3650)
  billing_cycle!: number;

  @ApiPropertyOptional({ type: 'array', example: [] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  features?: PlanFeatureValue[];

  @ApiPropertyOptional({ default: true })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Đặt đây làm gói miễn phí mặc định tự gán cho photographer',
    default: false,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_default?: boolean;
}

export class SubscriptionPlanUpdateBodyDto {
  @ApiPropertyOptional({ example: 'MONTHLY_PRO', maxLength: 64 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
  code?: string;

  @ApiPropertyOptional({ example: 'Pro hàng tháng', maxLength: 100 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Giá subscription (VND)',
    example: 199000,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  price?: number;

  @ApiPropertyOptional({
    description: 'Chu kỳ tính phí theo ngày',
    example: 30,
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(3650)
  billing_cycle?: number;

  @ApiPropertyOptional({ type: 'array', example: [] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  features?: PlanFeatureValue[];

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Chọn làm gói miễn phí mặc định tự gán cho photographer',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  is_default?: boolean;
}

export class SubscriptionCreateCommandBodyDto {
  @ApiProperty({
    description: 'Photographer subscription plan identifier',
    format: 'uuid',
    example: '11111111-1111-4111-8111-111111111111',
  })
  @IsUUID()
  photographer_plan_id!: string;

  @ApiProperty({ description: 'idempotency key', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;

  @ApiPropertyOptional({
    enum: ['gateway', 'wallet'],
    description:
      'gateway mở checkout QR; wallet trừ số dư khả dụng của Ví Lens',
    default: 'gateway',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['gateway', 'wallet'])
  payment_method?: 'gateway' | 'wallet';
}

export class SubscriptionPaymentReviewResolutionBodyDto {
  @ApiProperty({ enum: ['activate', 'refund', 'unpaid'] })
  @IsIn(['activate', 'refund', 'unpaid'])
  outcome!: 'activate' | 'refund' | 'unpaid';

  @ApiProperty({
    description: 'Lý do và bằng chứng admin dùng để xử lý giao dịch.',
    maxLength: 1000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  note!: string;

  @ApiPropertyOptional({
    description: 'Mã giao dịch từ nhà cung cấp; bắt buộc với activate/refund.',
    maxLength: 200,
  })
  @ValidateIf(
    (value: SubscriptionPaymentReviewResolutionBodyDto) =>
      value.outcome !== 'unpaid',
  )
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  provider_reference?: string;
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
