import { Global, Module } from '@nestjs/common';
import { AxiosModule } from '../axios/axios.module';
import { HttpNotificationService } from './http-notification.service';
import { NotificationPort } from './notification.port';

/** Cung cấp `NotificationPort` cho toàn ứng dụng (adapter HTTP). */
@Global()
@Module({
  imports: [AxiosModule],
  providers: [{ provide: NotificationPort, useClass: HttpNotificationService }],
  exports: [NotificationPort],
})
export class NotificationModule {}
