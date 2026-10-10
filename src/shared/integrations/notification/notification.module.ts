import { Global, Module } from '@nestjs/common';
import { KafkaNotificationProducer } from './kafka-notification.producer';
import { KafkaNotificationService } from './kafka-notification.service';
import { NotificationPort } from './notification.port';

/** Provide notification integrations to the whole Core application. */
@Global()
@Module({
  providers: [
    KafkaNotificationProducer,
    KafkaNotificationService,
    { provide: NotificationPort, useExisting: KafkaNotificationService },
  ],
  exports: [NotificationPort, KafkaNotificationProducer],
})
export class NotificationModule {}
