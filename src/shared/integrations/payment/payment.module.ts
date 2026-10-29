import { Module, Global } from '@nestjs/common';
import { EnvModule } from '@shared/platform/env';
import { PaymentGateway } from './port/payment.port';
import { PayOsGateway } from './payos-gateway.service';
import { SePayGateway } from './sepay-gateway.service';
import { SwitchablePaymentGateway } from './switchable-payment-gateway.service';
import {
  PAYMENT_PROVIDER_ADAPTERS,
  type PaymentProviderAdapter,
} from './payment-provider.adapter';

@Global()
@Module({
  imports: [EnvModule],
  providers: [
    // 1. Đăng ký các adapter cổng thanh toán cụ thể
    PayOsGateway,
    SePayGateway,
    // 2. Gom các adapter thành một mảng thông qua Factory Provider
    {
      provide: PAYMENT_PROVIDER_ADAPTERS,
      useFactory: (
        payos: PayOsGateway,
        sepay: SePayGateway,
      ): PaymentProviderAdapter[] => [payos, sepay],
      inject: [PayOsGateway, SePayGateway],
    },
    // 3. Đăng ký service điều phối (Router/Switchable)
    SwitchablePaymentGateway,
    // 4. Alias provider (Ánh xạ Interface/Port sang Implementation thực tế)
    {
      provide: PaymentGateway,
      useExisting: SwitchablePaymentGateway,
    },
  ],
  exports: [PaymentGateway],
})
export class PaymentModule {}
