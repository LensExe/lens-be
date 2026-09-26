import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BookingCancelUnpaidCommand } from '@modules/booking/bookings.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Job huỷ booking đã được nhận mà khách chưa trả cọc kịp (24 giờ hoặc tới giờ chụp), chạy mỗi 10 phút. */
@Injectable()
export class BookingCancelUnpaidJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Huỷ các booking quá hạn thanh toán; chỉ một instance chạy mỗi lần.
   *
   * @returns `true` nếu đã chạy, `false` nếu instance khác đang chạy nên bỏ qua
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
