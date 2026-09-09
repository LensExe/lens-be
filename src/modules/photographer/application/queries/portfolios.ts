import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { PortfolioUseCases } from '../portfolios';
export class PortfolioListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PortfolioListQueryInput,
  ) {}
}
@QueryHandler(PortfolioListQuery)
export class PortfolioListQueryHandler implements IQueryHandler<PortfolioListQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: PortfolioUseCases,
  ) {}
  execute(message: PortfolioListQuery) {
    return this.uow.read((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: PortfolioUseCases,
  ) {}
  execute(message: PortfolioGetQuery) {
    return this.uow.read((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
