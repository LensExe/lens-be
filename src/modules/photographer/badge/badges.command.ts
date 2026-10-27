import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { BadgeUseCases } from './badge.use-case';
import { PhotographerAchievementsCache } from '../photographer-achievements.cache';
import { PublicPhotographersQueryCache } from '../public-photographers-query.cache';
import { PhotographerCatalogCache } from '../photographer-catalog.cache';

export class BadgeUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BadgeUpdateCommandInput,
  ) {}
}
@CommandHandler(BadgeUpdateCommand)
export class BadgeUpdateCommandHandler implements ICommandHandler<BadgeUpdateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BadgeUseCases,
    private readonly achievementsCache: PhotographerAchievementsCache,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
    private readonly photographerCatalogCache: PhotographerCatalogCache,
  ) {}

  /**
   * Route the badge update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: BadgeUpdateCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
    await Promise.all([
      this.photographerCatalogCache.invalidate('badges'),
      this.achievementsCache.invalidateAll(),
      this.publicPhotographersCache.invalidateAll(),
    ]);
    return result;
  }
}
