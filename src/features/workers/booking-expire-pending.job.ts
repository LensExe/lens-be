import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BookingExpirePendingCommand } from '@modules/booking/bookings.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Job cho hết hạn yêu cầu booking thợ chưa trả lời (24 giờ hoặc tới giờ chụp), chạy mỗi 10 phút. */
@Injectable()
export class BookingExpirePendingJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Cho hết hạn các yêu cầu tới hạn; chỉ một instance chạy mỗi lần.
   *
   * @returns `true` nếu đã chạy, `false` nếu instance khác đang chạy nên bỏ qua
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
