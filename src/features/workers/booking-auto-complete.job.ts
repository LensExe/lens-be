import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { BookingAutoCompleteCommand } from '@modules/booking/bookings.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Job tự hoàn tất booking 7 ngày sau khi publish gallery nếu khách chưa xác nhận, chạy đầu mỗi giờ. */
@Injectable()
export class BookingAutoCompleteJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Hoàn tất các booking đã tới hạn; chỉ một instance chạy mỗi lần.
   *
   * @returns `true` nếu đã chạy, `false` nếu instance khác đang chạy nên bỏ qua
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
