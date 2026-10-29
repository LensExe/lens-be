import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { PaymentProcessRequestSlaCommand } from '@modules/payment/refund/refund.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Every fifteen minutes, remind and escalate overdue payment requests. */
@Injectable()
export class PaymentRequestSlaJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /** Notify active administrators without deciding the financial outcome. */
  @Cron('*/15 * * * *', {
    name: 'payment.process-request-sla',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(this.dataSource, 'payment.process-request-sla', () =>
      this.commands.execute(new PaymentProcessRequestSlaCommand(SYSTEM_ACTOR)),
    );
  }
}
