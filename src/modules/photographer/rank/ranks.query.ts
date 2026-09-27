import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { RankUseCases } from './rank.use-case';

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
  ) {}
  execute() {
    return this.dataSource.transaction((s) => this.useCases.list(s));
  }
}
