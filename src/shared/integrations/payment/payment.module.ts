import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentGateway } from './payment.port';
import { PayOsGateway } from './payos-gateway.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    PayOsGateway,
    {
      provide: PaymentGateway,
      useClass: PayOsGateway,
    },
  ],
  exports: [PaymentGateway, PayOsGateway],
})
export class PaymentModule {}
