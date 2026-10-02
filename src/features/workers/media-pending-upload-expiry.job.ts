import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { MediaExpirePendingUploadsCommand } from '@modules/media/media.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Every five minutes, remove objects whose presigned upload reservation expired. */
@Injectable()
export class MediaPendingUploadExpiryJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  @Cron('*/5 * * * *', {
    name: 'media.expire-pending-uploads',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(this.dataSource, 'media.expire-pending-uploads', () =>
      this.commands.execute(new MediaExpirePendingUploadsCommand(SYSTEM_ACTOR)),
    );
  }
}
