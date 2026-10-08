import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BookingAutoCompleteCommand } from '@modules/booking/core/bookings.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Hourly job that auto-completes bookings 7 days after the gallery is published if the customer has not confirmed receipt. */
@Injectable()
export class BookingAutoCompleteJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Complete due bookings; only one instance runs at a time.
   *
   * @returns `true` if started; `false` if another instance is already running and this run is skipped.
   */
  @Cron('0 * * * *', {
    name: 'booking.auto-complete',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(this.dataSource, 'booking.auto-complete', () =>
      this.commands.execute(new BookingAutoCompleteCommand(SYSTEM_ACTOR, {})),
    );
  }
}
