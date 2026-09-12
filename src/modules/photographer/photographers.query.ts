import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/contracts';
import { PhotographerUseCases } from './photographer.use-case';

export class PhotographerAdminQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerAdminQueryInput,
  ) {}
}
@QueryHandler(PhotographerAdminQuery)
export class PhotographerAdminQueryHandler implements IQueryHandler<PhotographerAdminQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
  ) {}
  execute(message: PhotographerAdminQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.admin(s, message.actor, message.input),
    );
  }
}

export class PhotographerMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerMeQueryInput,
  ) {}
}
@QueryHandler(PhotographerMeQuery)
export class PhotographerMeQueryHandler implements IQueryHandler<PhotographerMeQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
  ) {}
  execute(message: PhotographerMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.me(s, message.actor),
    );
  }
}

export class PhotographerTopQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerTopQueryInput,
  ) {}
}
@QueryHandler(PhotographerTopQuery)
export class PhotographerTopQueryHandler implements IQueryHandler<PhotographerTopQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
  ) {}
  execute(message: PhotographerTopQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.top(s, message.actor, message.input),
    );
  }
}

export class PhotographerSearchQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerSearchQueryInput,
  ) {}
}
@QueryHandler(PhotographerSearchQuery)
export class PhotographerSearchQueryHandler implements IQueryHandler<PhotographerSearchQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
  ) {}
  execute(message: PhotographerSearchQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.search(s, message.actor, message.input),
    );
  }
}

export class PhotographerGetQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.PhotographerGetQueryInput,
  ) {}
}
@QueryHandler(PhotographerGetQuery)
export class PhotographerGetQueryHandler implements IQueryHandler<PhotographerGetQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: PhotographerUseCases,
  ) {}
  execute(message: PhotographerGetQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.get(s, message.actor, message.input),
    );
  }
}
