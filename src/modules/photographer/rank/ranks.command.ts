import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { RankUseCases } from './rank.use-case';
import { PhotographerAchievementsCache } from '../photographer-achievements.cache';
import { PublicPhotographersQueryCache } from '../public-photographers-query.cache';
import { PhotographerCatalogCache } from '../photographer-catalog.cache';

export class RankUpdateCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.RankUpdateCommandInput,
  ) {}
}
@CommandHandler(RankUpdateCommand)
export class RankUpdateCommandHandler implements ICommandHandler<RankUpdateCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RankUseCases,
    private readonly achievementsCache: PhotographerAchievementsCache,
    private readonly publicPhotographersCache: PublicPhotographersQueryCache,
    private readonly photographerCatalogCache: PhotographerCatalogCache,
  ) {}

  /**
   * Route the rank update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  async execute(message: RankUpdateCommand) {
    const result = await this.dataSource.transaction((s) =>
      this.useCases.update(s, message.actor, message.input),
    );
    await Promise.all([
      this.photographerCatalogCache.invalidate('ranks'),
      this.achievementsCache.invalidateAll(),
      this.publicPhotographersCache.invalidateAll(),
    ]);
    return result;
  }
}
