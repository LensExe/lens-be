import { KeycloakUserService } from '@shared/integrations/keycloak/user.service';
import { NormalizeEmail } from '@shared/integrations/keycloak/utils/normalize-email';
import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { currentUser, required, role } from '@shared/common/access';
import type * as Inputs from '@shared/contracts/identity.contract';
import { EntitySchemas, updateEntity } from '@shared/database';
import {
  RegistrationRole,
  UserStatus,
} from '@shared/domain/values/user.values';
import { VerificationStatus } from '@shared/domain/values/photographer.values';
import type { Actor } from '@shared/platform/auth/actor';
import { ensure } from '@shared/platform/exceptions/domain.error';
import { Identity } from './identity.domain';

@Injectable()
export class IdentityUseCases {
  constructor(private readonly keycloakUsers: KeycloakUserService) {}

  /**
   * Register a user and initialize the selected customer or photographer profile.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result of the operation described above.
   * @throws {DomainError} Thrown when input is invalid or a business condition is not met.
   */
  async register(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityRegisterCommandInput,
  ) {
    const registrationRole = input.role ?? RegistrationRole.CUSTOMER;
    const [existing] = await s.findBy(EntitySchemas.users, {
      keycloak_id: actor.sub,
    });
    if (existing) {
      Identity.assertCanRegister(existing.status);
      if (input.role) {
        const existingProfile =
          registrationRole === RegistrationRole.CUSTOMER
            ? await s.findOneBy(EntitySchemas.customers, {
                user_id: existing.id,
              })
            : await s.findOneBy(EntitySchemas.photographers, {
                user_id: existing.id,
              });
        ensure(
          existingProfile,
          'Account is already registered with a different profile type',
          'conflict',
        );
      }
      return existing;
    }

    const email = NormalizeEmail(actor.email ?? '');
    ensure(email, 'Keycloak token must contain email');
    const user = await s.save(EntitySchemas.users, {
      keycloak_id: actor.sub,
      email,
      fullname: input.fullname,
    });
    if (registrationRole === RegistrationRole.CUSTOMER) {
      await s.save(EntitySchemas.customers, { user_id: user.id });
    } else {
      await s.save(EntitySchemas.photographers, {
        user_id: user.id,
        verification_status: VerificationStatus.UNVERIFIED,
        is_verified: false,
      });
    }
    await s.save(EntitySchemas.wallets, { user_id: user.id });
    return user;
  }

  /**
   * Get the current user information from the authenticated identity.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @returns Result returned by `currentUser`.
   */
  async me(s: EntityManager, actor: Actor) {
    const user = await currentUser(s, actor);
    const [customerProfile, photographerProfile] = await Promise.all([
      s.findOneBy(EntitySchemas.customers, { user_id: user.id }),
      s.findOneBy(EntitySchemas.photographers, { user_id: user.id }),
    ]);

    // The profile tables are the source of truth for the Lens role. Keycloak
    // roles can be stale while an account is being provisioned or promoted.
    const role = photographerProfile
      ? RegistrationRole.PHOTOGRAPHER
      : customerProfile
        ? RegistrationRole.CUSTOMER
        : undefined;

    return { ...user, ...(role ? { role } : {}) };
  }

  /**
   * Update an account after checking permissions and validating the data.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `updateEntity`.
   */
  async updateMe(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityUpdateMeCommandInput,
  ) {
    const user = await currentUser(s, actor);
    return updateEntity(s, EntitySchemas.users, user.id, input);
  }

  /**
   * Get user details by ID after checking the caller’s permissions.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result object containing the fields `id`, `fullname`, `avatar_url`.
   */
  async getUser(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityGetUserQueryInput,
  ) {
    await currentUser(s, actor);
    const user = await required(s, 'users', input.user_id);
    return {
      id: user.id,
      fullname: user.fullname,
      avatar_url: user.avatar_url,
    };
  }

  /**
   * List users for the admin view.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result object containing the fields `items`, `total`, `offset`, `limit`.
   */
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

  /**
   * Get user details with administrator access.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `required`.
   */
  async adminUser(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityAdminUserQueryInput,
  ) {
    role(actor, 'admin');
    await currentUser(s, actor);
    return required(s, 'users', input.user_id);
  }

  /**
   * Get the current user status with administrator access.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `updateEntity`.
   */
  async status(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityStatusCommandInput,
  ) {
    role(actor, 'admin');
    const current = await currentUser(s, actor);
    const target = await required(s, 'users', input.user_id);
    const newStatus = Identity.adminUpdateStatus(
      current.id,
      target.id,
      target.status,
      input.status,
    );

    // Keycloak integration
    const isActive = newStatus === UserStatus.ACTIVE;
    await this.keycloakUsers.setUserEnabled(target.keycloak_id, isActive);
    if (!isActive) {
      await this.keycloakUsers.logoutUser(target.keycloak_id);
    }

    return updateEntity(s, EntitySchemas.users, input.user_id, {
      status: newStatus,
    });
  }

  /**
   * Ban a user and revoke access according to the admin policy.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `updateEntity`.
   */
  async ban(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityAdminBanCommandInput,
  ) {
    role(actor, 'admin');
    const current = await currentUser(s, actor);
    const target = await required(s, 'users', input.user_id);
    const newStatus = Identity.adminUpdateStatus(
      current.id,
      target.id,
      target.status,
      UserStatus.BANNED,
    );

    // Keycloak integration
    await this.keycloakUsers.setUserEnabled(target.keycloak_id, false);
    await this.keycloakUsers.logoutUser(target.keycloak_id);

    return updateEntity(s, EntitySchemas.users, input.user_id, {
      status: newStatus,
    });
  }

  /**
   * Temporarily suspend a user and update the identity provider status.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `status`.
   */
  suspend(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentitySuspendCommandInput,
  ) {
    return this.status(s, actor, { ...input, status: UserStatus.SUSPENDED });
  }

  /**
   * Remove a user’s temporary suspension.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns Result returned by `status`.
   */
  unsuspend(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityUnsuspendCommandInput,
  ) {
    return this.status(s, actor, { ...input, status: UserStatus.ACTIVE });
  }

  /**
   * Assign a role to a user after checking administrator permissions.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns No value is returned.
   */
  async assignRole(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityAssignRoleCommandInput,
  ) {
    role(actor, 'admin');
    const target = await required(s, 'users', input.user_id);
    await this.keycloakUsers.assignRealmRoleToUser(
      target.keycloak_id,
      input.role,
    );
  }

  /**
   * Revoke a role.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns No value is returned.
   */
  async revokeRole(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityRevokeRoleCommandInput,
  ) {
    role(actor, 'admin');
    const target = await required(s, 'users', input.user_id);
    await this.keycloakUsers.removeRealmRoleFromUser(
      target.keycloak_id,
      input.role,
    );
  }

  /**
   * Verify the user email using the supplied OTP.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns No value is returned.
   */
  async verifyEmail(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityVerifyEmailCommandInput,
  ) {
    role(actor, 'admin');
    const target = await required(s, 'users', input.user_id);
    await this.keycloakUsers.setUserEmailVerified(target.keycloak_id);
  }

  /**
   * Require the user to reset their password at the next sign-in.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns No value is returned.
   */
  async forcePasswordReset(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityForcePasswordResetCommandInput,
  ) {
    role(actor, 'admin');
    const target = await required(s, 'users', input.user_id);
    await this.keycloakUsers.executeActionsEmail(target.keycloak_id, [
      'UPDATE_PASSWORD',
    ]);
  }

  /**
   * Revoke the refresh token if present and complete logout idempotently.
   *
   * @param s EntityManager for the current transaction.
   * @param actor Actor performing the operation; used for role and access checks.
   * @param input Input data for the operation.
   * @returns No value is returned.
   */
  async logout(
    s: EntityManager,
    actor: Actor,
    input: Inputs.IdentityLogoutCommandInput,
  ) {
    role(actor, 'admin');
    const target = await required(s, 'users', input.user_id);
    await this.keycloakUsers.logoutUser(target.keycloak_id);
  }
}
