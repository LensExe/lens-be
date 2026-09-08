import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PayOSService } from './payos.service';
import { PAYMENT_GATEWAY } from './payment.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    PayOSService,
    {
      provide: PAYMENT_GATEWAY,
      useExisting: PayOSService,
    },
  ],
  exports: [PayOSService, PAYMENT_GATEWAY],
})
export class PaymentModule {}
