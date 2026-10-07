import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/identity.contract';
import { IdentityUseCases } from './identity.use-case';

export class IdentityRegisterCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityRegisterCommandInput,
  ) {}
}
export { IdentityRegisterCommand as IdentityCustomerRegisterCommand };

@CommandHandler(IdentityRegisterCommand)
export class IdentityRegisterCommandHandler implements ICommandHandler<IdentityRegisterCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route account registration to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityRegisterCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.register(s, message.actor, message.input),
    );
  }
}

export { IdentityRegisterCommandHandler as IdentityCustomerRegisterCommandHandler };

export class IdentityUpdateMeCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityUpdateMeCommandInput,
  ) {}
}
@CommandHandler(IdentityUpdateMeCommand)
export class IdentityUpdateMeCommandHandler implements ICommandHandler<IdentityUpdateMeCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the account update command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityUpdateMeCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.updateMe(s, message.actor, message.input),
    );
  }
}

export class IdentityStatusCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityStatusCommandInput,
  ) {}
}
@CommandHandler(IdentityStatusCommand)
export class IdentityStatusCommandHandler implements ICommandHandler<IdentityStatusCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the account status change command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityStatusCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.status(s, message.actor, message.input),
    );
  }
}

export class IdentitySuspendCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentitySuspendCommandInput,
  ) {}
}
@CommandHandler(IdentitySuspendCommand)
export class IdentitySuspendCommandHandler implements ICommandHandler<IdentitySuspendCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the account suspension command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentitySuspendCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.suspend(s, message.actor, message.input),
    );
  }
}

export class IdentityUnsuspendCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityUnsuspendCommandInput,
  ) {}
}
@CommandHandler(IdentityUnsuspendCommand)
export class IdentityUnsuspendCommandHandler implements ICommandHandler<IdentityUnsuspendCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the account unsuspension command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityUnsuspendCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.unsuspend(s, message.actor, message.input),
    );
  }
}

export class IdentityAdminBanCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityAdminBanCommandInput,
  ) {}
}
@CommandHandler(IdentityAdminBanCommand)
export class IdentityAdminBanCommandHandler implements ICommandHandler<IdentityAdminBanCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the account ban command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityAdminBanCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.ban(s, message.actor, message.input),
    );
  }
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export class IdentityAssignRoleCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityAssignRoleCommandInput,
  ) {}
}

@CommandHandler(IdentityAssignRoleCommand)
export class IdentityAssignRoleCommandHandler implements ICommandHandler<IdentityAssignRoleCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the user role assignment command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityAssignRoleCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.assignRole(s, message.actor, message.input),
    );
  }
}

export class IdentityRevokeRoleCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityRevokeRoleCommandInput,
  ) {}
}

@CommandHandler(IdentityRevokeRoleCommand)
export class IdentityRevokeRoleCommandHandler implements ICommandHandler<IdentityRevokeRoleCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the account role revocation command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityRevokeRoleCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.revokeRole(s, message.actor, message.input),
    );
  }
}

// ---------------------------------------------------------------------------
// Admin Auth Actions
// ---------------------------------------------------------------------------

export class IdentityVerifyEmailCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityVerifyEmailCommandInput,
  ) {}
}

@CommandHandler(IdentityVerifyEmailCommand)
export class IdentityVerifyEmailCommandHandler implements ICommandHandler<IdentityVerifyEmailCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the account email verification command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityVerifyEmailCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.verifyEmail(s, message.actor, message.input),
    );
  }
}

export class IdentityForcePasswordResetCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityForcePasswordResetCommandInput,
  ) {}
}

@CommandHandler(IdentityForcePasswordResetCommand)
export class IdentityForcePasswordResetCommandHandler implements ICommandHandler<IdentityForcePasswordResetCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the forced account password reset command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityForcePasswordResetCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.forcePasswordReset(s, message.actor, message.input),
    );
  }
}

export class IdentityLogoutCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityLogoutCommandInput,
  ) {}
}

@CommandHandler(IdentityLogoutCommand)
export class IdentityLogoutCommandHandler implements ICommandHandler<IdentityLogoutCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  /**
   * Route the account logout command to the use case in the current transaction.
   *
   * @param message Command or query message to execute.
   * @returns Result of the operation performed in the transaction.
   */
  execute(message: IdentityLogoutCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.logout(s, message.actor, message.input),
    );
  }
}
