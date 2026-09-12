import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { Actor } from '@shared/platform/auth/actor';
import { DataSource } from 'typeorm';
import type * as Inputs from '@shared/contracts/identity.contract';
import { IdentityUseCases } from './identity.use-case';

export class IdentityCustomerRegisterCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityCustomerRegisterCommandInput,
  ) {}
}
export { IdentityCustomerRegisterCommand as IdentityRegisterCommand };
export { IdentityCustomerRegisterCommandHandler as IdentityRegisterCommandHandler };

@CommandHandler(IdentityCustomerRegisterCommand)
export class IdentityCustomerRegisterCommandHandler implements ICommandHandler<IdentityCustomerRegisterCommand> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: IdentityUseCases,
  ) {}

  execute(message: IdentityCustomerRegisterCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.register(s, message.actor, message.input),
    );
  }
}

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
  execute(message: IdentityAdminBanCommand) {
    return this.dataSource.transaction((s) =>
      this.useCases.ban(s, message.actor, message.input),
    );
  }
}
