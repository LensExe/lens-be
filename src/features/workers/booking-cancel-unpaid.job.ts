import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BookingCancelUnpaidCommand } from '@modules/booking/core/bookings.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Every 10 minutes, cancel accepted bookings whose customers have not paid the deposit within 24 hours or before the photo shoot starts. */
@Injectable()
export class BookingCancelUnpaidJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Cancel bookings with overdue deposits; only one instance runs at a time.
   *
   * @returns `true` if started; `false` if another instance is already running and this run is skipped.
   */
  @Cron('*/10 * * * *', {
    name: 'booking.cancel-unpaid',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(this.dataSource, 'booking.cancel-unpaid', () =>
      this.commands.execute(new BookingCancelUnpaidCommand(SYSTEM_ACTOR, {})),
    );
  }
}
