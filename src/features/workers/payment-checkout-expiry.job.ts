import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { PaymentExpireDueCheckoutsCommand } from '@modules/payment/payment.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Every five minutes, expire checkout links whose payment window has ended. */
@Injectable()
export class PaymentCheckoutExpiryJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /** Reconcile provider state before expiring each due checkout. */
  @Cron('*/5 * * * *', {
    name: 'payment.expire-due-checkouts',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(this.dataSource, 'payment.expire-due-checkouts', () =>
      this.commands.execute(new PaymentExpireDueCheckoutsCommand(SYSTEM_ACTOR)),
    );
  }
}
