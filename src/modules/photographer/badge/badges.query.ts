import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { BadgeUseCases } from './badge.use-case';

export class BadgeListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.BadgeListQueryInput,
  ) {}
}
@QueryHandler(BadgeListQuery)
export class BadgeListQueryHandler implements IQueryHandler<BadgeListQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: BadgeUseCases,
  ) {}
  execute() {
    return this.dataSource.transaction((s) => this.useCases.list(s));
  }
}
