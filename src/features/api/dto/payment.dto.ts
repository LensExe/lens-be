import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsBoolean,
  IsObject,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateIf,
  IsOptional,
  IsIn,
  ValidateNested,
  Matches,
} from 'class-validator';

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

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  review_required?: 'true' | 'false';
}

export class PaymentDepositCommandBodyDto {
  @ApiProperty({ description: 'idempotency key', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;

  @ApiPropertyOptional({ enum: ['gateway', 'wallet'], default: 'gateway' })
  @IsOptional()
  @IsIn(['gateway', 'wallet'])
  payment_method?: 'gateway' | 'wallet';
}

export class PaymentRemainingCommandBodyDto {
  @ApiProperty({ description: 'idempotency key', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;

  @ApiPropertyOptional({ enum: ['gateway', 'wallet'], default: 'gateway' })
  @IsOptional()
  @IsIn(['gateway', 'wallet'])
  payment_method?: 'gateway' | 'wallet';
}

export class PaymentTopUpCommandBodyDto {
  @ApiProperty({ minimum: 1000, maximum: 9000000000000, example: 100000 })
  @IsInt()
  @Min(1000)
  @Max(9000000000000)
  amount!: number;

  @ApiProperty({ description: 'idempotency key', type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;
}

export class PayOsStandaloneTestPaymentBodyDto {
  @ApiProperty({
    description: 'Số tiền thử tạo payment link PayOS, tối đa 1.000.000 VND.',
    minimum: 1000,
    maximum: 1000000,
    example: 1000,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(1000000)
  amount!: number;
}

export class PayoutDestinationDto {
  @ApiProperty({
    description: 'Mã BIN hoặc mã ngân hàng dùng cho lệnh chuyển khoản.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  bank_code!: string;

  @ApiProperty({ description: 'Số tài khoản nhận tiền.' })
  @IsString()
  @Matches(/^[0-9]{4,34}$/)
  account_number!: string;

  @ApiProperty({ description: 'Tên chủ tài khoản.' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  account_name!: string;
}

export class PaymentWithdrawalCommandBodyDto {
  @ApiProperty({ minimum: 10000, maximum: 9000000000000, example: 100000 })
  @IsInt()
  @Min(10000)
  @Max(9000000000000)
  amount!: number;

  @ApiProperty({ type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;

  @ApiProperty({ type: PayoutDestinationDto })
  @ValidateNested()
  @Type(() => PayoutDestinationDto)
  payout_destination!: PayoutDestinationDto;

  @ApiProperty({ type: 'string' })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;
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

  @ApiPropertyOptional({ description: 'idempotency key' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key?: string;
}

export class PaymentRefundReviewBodyDto {
  @ApiPropertyOptional({
    type: 'string',
    description: 'Lý do quyết định từ chối.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason?: string;

  @ApiPropertyOptional({ type: PayoutDestinationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayoutDestinationDto)
  payout_destination?: PayoutDestinationDto;
}

export class PaymentRefundCompleteBodyDto {
  @ApiPropertyOptional({
    description: 'Mã đối soát payout/refund ngoài hệ thống.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  payout_reference?: string;
}

export class PaymentDeadlineExtensionBodyDto {
  @ApiProperty({
    description: 'Number of hours added to the current deadline.',
    minimum: 1,
    maximum: 168,
    example: 24,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  hours!: number;

  @ApiProperty({
    description: 'Reason for extending the payment processing deadline.',
    type: 'string',
    maxLength: 1000,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}

export class PaymentRefundQueueQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  offset?: number;

  @ApiPropertyOptional({
    enum: ['requested', 'approved', 'rejected', 'completed'],
  })
  @IsOptional()
  @IsIn(['requested', 'approved', 'rejected', 'completed'])
  status?: string;
}

export class PaymentWalletLedgerQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @ValidateIf((_object, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  offset?: number;
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

/** SePay sends a bank-transfer event rather than the payOS webhook envelope. */
export class SePayWebhookCommandBodyDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  payload!: Record<string, unknown>;
}
