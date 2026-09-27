import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { PhotographerAwardBadgesCommand } from '@modules/photographer/photographers.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Job xét huy hiệu thợ mỗi ngày lúc 00:00 giờ Việt Nam. */
@Injectable()
export class PhotographerBadgeJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Xét huy hiệu cho mọi thợ đã duyệt; chỉ một instance chạy mỗi lần.
   *
   * @returns `true` nếu đã chạy, `false` nếu instance khác đang chạy nên bỏ qua
   */
  @Cron('0 0 * * *', {
    name: 'photographer.award-badges',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  run() {
    return runExclusive(this.dataSource, 'photographer.award-badges', () =>
      this.commands.execute(
        new PhotographerAwardBadgesCommand(SYSTEM_ACTOR, {}),
      ),
    );
  }
}
