import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { IdentityUseCases } from '../identity';
export class IdentityAdminUsersQuery {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityAdminUsersQueryInput,
  ) {}
}
@QueryHandler(IdentityAdminUsersQuery)
export class IdentityAdminUsersQueryHandler implements IQueryHandler<IdentityAdminUsersQuery> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityAdminUsersQuery) {
    return this.uow.read((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityMeQuery) {
    return this.uow.read((s) => this.useCases.me(s, message.actor));
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
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityAdminUserQuery) {
    return this.uow.read((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityGetUserQuery) {
    return this.uow.read((s) =>
      this.useCases.getUser(s, message.actor, message.input),
    );
  }
}
