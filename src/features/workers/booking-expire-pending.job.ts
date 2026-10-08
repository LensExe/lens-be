import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BookingExpirePendingCommand } from '@modules/booking/core/bookings.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Every 10 minutes, expire booking requests the photographer has not answered within 24 hours or before the photo shoot starts. */
@Injectable()
export class BookingExpirePendingJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Expire due requests; only one instance runs at a time.
   *
   * @returns `true` if started; `false` if another instance is already running and this run is skipped.
   */
  @Cron('*/10 * * * *', {
    name: 'booking.expire-pending',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(this.dataSource, 'booking.expire-pending', () =>
      this.commands.execute(new BookingExpirePendingCommand(SYSTEM_ACTOR, {})),
    );
  }
}
