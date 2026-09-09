import { Module } from '@nestjs/common';
import { NotificationController } from '../http/notification.controller';
import {
  NotificationCreateCommandHandler,
  NotificationReadAllCommandHandler,
  NotificationReadCommandHandler,
} from '@modules/notification/application/commands/notifications';
import { NotificationListQueryHandler } from '@modules/notification/application/queries/notifications';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationCreateCommandHandler,
    NotificationReadAllCommandHandler,
    NotificationReadCommandHandler,
    NotificationListQueryHandler,
  ],
})
export class NotificationApiModule {}
