import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { SubscriptionExpireDueCommand } from '@modules/subscription/subscriptions.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Every five minutes, expire paid subscription periods that have ended. */
@Injectable()
export class SubscriptionExpireDueJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  @Cron('*/5 * * * *', {
    name: 'subscription.expire-due',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(this.dataSource, 'subscription.expire-due', () =>
      this.commands.execute(new SubscriptionExpireDueCommand(SYSTEM_ACTOR)),
    );
  }
}
