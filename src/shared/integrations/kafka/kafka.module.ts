import { Global, Module } from '@nestjs/common';
import { KafkaProducer } from './kafka.producer';
import { KafkaNotificationService } from './kafka.service';
import { KafkaPort } from './kafka.port';

/** Provide notification integrations to the whole Core application. */
@Global()
@Module({
  providers: [
    KafkaProducer,
    KafkaNotificationService,
    { provide: KafkaPort, useExisting: KafkaNotificationService },
  ],
  exports: [KafkaPort, KafkaProducer],
})
export class KafkaModule {}

export { KafkaModule as NotificationModule };
