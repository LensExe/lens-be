import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/identity.contract';
import { IdentityUseCases } from './identity.use-case';

export class IdentityAdminUsersQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityAdminUsersQueryInput,
  ) {}
}
@QueryHandler(IdentityAdminUsersQuery)
export class IdentityAdminUsersQueryHandler implements IQueryHandler<IdentityAdminUsersQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  execute(message: IdentityAdminUsersQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.adminUsers(s, message.actor, message.input),
    );
  }
}

export class IdentityMeQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityMeQueryInput,
  ) {}
}
@QueryHandler(IdentityMeQuery)
export class IdentityMeQueryHandler implements IQueryHandler<IdentityMeQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityMeQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.me(s, message.actor),
    );
  }
}

export class IdentityAdminUserQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityAdminUserQueryInput,
  ) {}
}
@QueryHandler(IdentityAdminUserQuery)
export class IdentityAdminUserQueryHandler implements IQueryHandler<IdentityAdminUserQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityAdminUserQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.adminUser(s, message.actor, message.input),
    );
  }
}

export class IdentityGetUserQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityGetUserQueryInput,
  ) {}
}
@QueryHandler(IdentityGetUserQuery)
export class IdentityGetUserQueryHandler implements IQueryHandler<IdentityGetUserQuery> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityGetUserQuery) {
    return this.dataSource.transaction((s) =>
      this.useCases.getUser(s, message.actor, message.input),
    );
  }
}
