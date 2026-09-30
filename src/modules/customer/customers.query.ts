import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import type { Actor } from '@shared/platform/auth/actor';
import type * as Inputs from '@shared/contracts/customer.contract';
import { CustomerUseCases } from './customer.use-case';

// ---------------------------------------------------------------------------
// Me
// ---------------------------------------------------------------------------

export class CustomerMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CustomerMeQueryInput,
  ) {}
}

@QueryHandler(CustomerMeQuery)
export class CustomerMeQueryHandler implements IQueryHandler<CustomerMeQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CustomerUseCases,
  ) {}

  execute(message: CustomerMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.me(s, message.actor),
    );
  }
}

// ---------------------------------------------------------------------------
// Admin get
// ---------------------------------------------------------------------------

export class CustomerAdminGetQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CustomerAdminGetQueryInput,
  ) {}
}

@QueryHandler(CustomerAdminGetQuery)
export class CustomerAdminGetQueryHandler implements IQueryHandler<CustomerAdminGetQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CustomerUseCases,
  ) {}

  execute(message: CustomerAdminGetQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.adminGet(s, message.actor, message.input),
    );
  }
}

// ---------------------------------------------------------------------------
// Admin list
// ---------------------------------------------------------------------------

export class CustomerAdminListQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CustomerAdminListQueryInput,
  ) {}
}

@QueryHandler(CustomerAdminListQuery)
export class CustomerAdminListQueryHandler implements IQueryHandler<CustomerAdminListQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CustomerUseCases,
  ) {}

  execute(message: CustomerAdminListQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.adminList(s, message.actor, message.input),
    );
  }
}

// ---------------------------------------------------------------------------
// My booking summary
// ---------------------------------------------------------------------------

export class CustomerMyBookingSummaryQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CustomerMyBookingSummaryQueryInput,
  ) {}
}

@QueryHandler(CustomerMyBookingSummaryQuery)
export class CustomerMyBookingSummaryQueryHandler implements IQueryHandler<CustomerMyBookingSummaryQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CustomerUseCases,
  ) {}

  execute(message: CustomerMyBookingSummaryQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.myBookingSummary(s, message.actor, message.input),
    );
  }
}

// ---------------------------------------------------------------------------
// Recommend
// ---------------------------------------------------------------------------

export class CustomerRecommendQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.CustomerRecommendQueryInput,
  ) {}
}

@QueryHandler(CustomerRecommendQuery)
export class CustomerRecommendQueryHandler implements IQueryHandler<CustomerRecommendQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: CustomerUseCases,
  ) {}

  execute(message: CustomerRecommendQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.recommend(s, message.actor, message.input),
    );
  }
}
