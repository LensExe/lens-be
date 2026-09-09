import { Module, Global } from '@nestjs/common';
import { NotificationDelivery } from './notification.port';
import { SmtpFcmDelivery } from './smtp-fcm-delivery.service';

@Global()
@Module({
  providers: [
    SmtpFcmDelivery,
    {
      provide: NotificationDelivery,
      useClass: SmtpFcmDelivery,
    },
  ],
  exports: [NotificationDelivery, SmtpFcmDelivery],
})
export class NotificationIntegrationModule {}
