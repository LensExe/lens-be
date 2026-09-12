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
