import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { MobileCheckoutPurpose } from '../payment-handoff/mobile-checkout-handoff.service';

export class MobileCheckoutHandoffBodyDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  booking_id!: string;

  @ApiProperty({ enum: ['deposit', 'remaining'] })
  @IsIn(['deposit', 'remaining'])
  payment_purpose!: MobileCheckoutPurpose;
}

export class MobileCheckoutHandoffExchangeBodyDto {
  @ApiProperty({ minLength: 32, maxLength: 128 })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  code!: string;
}

export class MobileCheckoutPaymentBodyDto {
  @ApiProperty({ minLength: 1, maxLength: 128 })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  idempotency_key!: string;

  @ApiProperty({ enum: ['gateway', 'wallet'] })
  @IsIn(['gateway', 'wallet'])
  payment_method!: 'gateway' | 'wallet';
}
