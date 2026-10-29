import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { RankUseCases } from './rank.use-case';
import { PhotographerCatalogCache } from '../photographer-catalog.cache';

export class RankListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.RankListQueryInput,
  ) {}
}
@QueryHandler(RankListQuery)
export class RankListQueryHandler implements IQueryHandler<RankListQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: RankUseCases,
    private readonly photographerCatalogCache: PhotographerCatalogCache,
  ) {}

  /**
   * Run the rank list query in the current transaction.
   *
   * @returns Result of the operation performed in the transaction.
   */
  execute() {
    return this.photographerCatalogCache.getOrLoad('ranks', () =>
      this.dataSource.transaction((s) => this.useCases.list(s)),
    );
  }
}
