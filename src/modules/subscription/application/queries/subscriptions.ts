import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { SubscriptionUseCases } from '../subscriptions';
export class SubscriptionUsageQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionUsageQueryInput,
  ) {}
}
@QueryHandler(SubscriptionUsageQuery)
export class SubscriptionUsageQueryHandler implements IQueryHandler<SubscriptionUsageQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: SubscriptionUseCases,
  ) {}
  execute(message: SubscriptionUsageQuery) {
    return this.uow.read((s) => this.useCases.usage(s, message.actor));
  }
}

export class SubscriptionMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionMeQueryInput,
  ) {}
}
@QueryHandler(SubscriptionMeQuery)
export class SubscriptionMeQueryHandler implements IQueryHandler<SubscriptionMeQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: SubscriptionUseCases,
  ) {}
  execute(message: SubscriptionMeQuery) {
    return this.uow.read((s) => this.useCases.me(s, message.actor));
  }
}

export class SubscriptionPlansQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.SubscriptionPlansQueryInput,
  ) {}
}
@QueryHandler(SubscriptionPlansQuery)
export class SubscriptionPlansQueryHandler implements IQueryHandler<SubscriptionPlansQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: SubscriptionUseCases,
  ) {}
  execute() {
    return this.uow.read((s) => this.useCases.plans(s));
  }
}
