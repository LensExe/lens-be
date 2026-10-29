import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { PaymentReleaseDueEscrowCommand } from '@modules/payment/payment.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Every five minutes, release completed-booking escrow whose 72-hour review period has elapsed. */
@Injectable()
export class PaymentEscrowReleaseJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Process due escrow settlements; only one instance runs at a time.
   *
   * @returns `true` if started; `false` if another instance is already running and this run is skipped.
   */
  @Cron('*/5 * * * *', {
    name: 'payment.release-completed-booking-escrow',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(
      this.dataSource,
      'payment.release-completed-booking-escrow',
      () =>
        this.commands.execute(new PaymentReleaseDueEscrowCommand(SYSTEM_ACTOR)),
    );
  }
}
