import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PortfolioUseCases } from './portfolio.use-case';

export class PortfolioListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioListQueryInput,
  ) {}
}
@QueryHandler(PortfolioListQuery)
export class PortfolioListQueryHandler implements IQueryHandler<PortfolioListQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PortfolioUseCases,
  ) {}
  execute(message: PortfolioListQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.list(s, message.actor, message.input),
    );
  }
}

export class PortfolioGetQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioGetQueryInput,
  ) {}
}
@QueryHandler(PortfolioGetQuery)
export class PortfolioGetQueryHandler implements IQueryHandler<PortfolioGetQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PortfolioUseCases,
  ) {}
  execute(message: PortfolioGetQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
