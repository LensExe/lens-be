import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { PhotographerAwardBadgesCommand } from '@modules/photographer/photographers.command';
import { runExclusive, SYSTEM_ACTOR } from './scheduled-job';

/** Daily job that evaluates photographer badges at 00:00 Vietnam time. */
@Injectable()
export class PhotographerBadgeJob {
  constructor(
    private readonly dataSource: DataSource,
    private readonly commands: CommandBus,
  ) {}

  /**
   * Evaluate badges for every approved photographer; only one instance runs at a time.
   *
   * @returns `true` if started; `false` if another instance is already running and this run is skipped.
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
