import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { currentUser, required, role } from '@shared/common/access';
import type * as Inputs from '@shared/contracts/identity.contract';
import { EntitySchemas, updateEntity, UserStatus } from '@shared/database';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Identity } from './identity.domain';

@Injectable()
export class IdentityUseCases {
  async register(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityCustomerRegisterCommandInput,
  ) {
    const [existing] = await s.findBy(EntitySchemas.users, {
      keycloak_id: actor.sub,
    });
    if (existing) {
      Identity.assertCanRegister(existing.status);
      return existing;
    }

    ensure(actor.email, 'Keycloak token must contain email');
    const user = await s.save(EntitySchemas.users, {
      keycloak_id: actor.sub,
      email: actor.email,
      fullname: input.fullname,
    });
    await s.save(EntitySchemas.customers, {
      user_id: user.id,
      location: input.location,
    });
    await s.save(EntitySchemas.wallets, { user_id: user.id });
    return user;
  }

  me(s: EntityManager, actor: Actor) {
    return currentUser(s, actor);
  }

  async updateMe(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityUpdateMeCommandInput,
  ) {
    const user = await currentUser(s, actor);
    return updateEntity(s, EntitySchemas.users, user.id, input);
  }

  async getUser(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityGetUserQueryInput,
  ) {
    await currentUser(s, actor);
    const user = await required(s, 'users', input.id);
    return {
      id: user.id,
      fullname: user.fullname,
      avatar_url: user.avatar_url,
    };
  }

  async adminUsers(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityAdminUsersQueryInput,
  ) {
    role(actor, 'admin');
    await currentUser(s, actor);

    const qb = s.createQueryBuilder(EntitySchemas.users, 'user');
    if (input.status) {
      qb.andWhere('user.status = :status', { status: input.status });
    }
    if (input.keyword) {
      qb.andWhere('(user.fullname ILIKE :kw OR user.email ILIKE :kw)', {
        kw: `%${input.keyword}%`,
      });
    }

    const offset = input.offset ?? 0;
    const limit = input.limit ?? 20;
    const [items, total] = await qb
      .skip(offset)
      .take(limit)
      .orderBy('user.created_at', 'DESC')
      .getManyAndCount();

    return {
      items,
      total,
      offset,
      limit,
    };
  }

  async adminUser(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityAdminUserQueryInput,
  ) {
    role(actor, 'admin');
    await currentUser(s, actor);
    return required(s, 'users', input.id);
  }

  async status(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityStatusCommandInput,
  ) {
    role(actor, 'admin');
    const current = await currentUser(s, actor);
    const target = await required(s, 'users', input.id);
    return updateEntity(s, EntitySchemas.users, input.id, {
      status: Identity.adminUpdateStatus(
        current.id,
        target.id,
        target.status,
        input.status as UserStatus,
      ),
    });
  }

  async ban(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityAdminBanCommandInput,
  ) {
    role(actor, 'admin');
    const current = await currentUser(s, actor);
    const target = await required(s, 'users', input.id);
    return updateEntity(s, EntitySchemas.users, input.id, {
      status: Identity.adminUpdateStatus(
        current.id,
        target.id,
        target.status,
        UserStatus.BANNED,
      ),
    });
  }

  suspend(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentitySuspendCommandInput,
  ) {
    return this.status(s, actor, { ...input, status: UserStatus.SUSPENDED });
  }

  unsuspend(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityUnsuspendCommandInput,
  ) {
    return this.status(s, actor, { ...input, status: UserStatus.ACTIVE });
  }
}
