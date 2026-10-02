import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsBoolean,
  IsObject,
  IsIn,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';

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
