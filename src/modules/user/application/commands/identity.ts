import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  UnitOfWork,
  type Actor,
} from '@shared/database/unit-of-work/unit-of-work.port';
import type * as Inputs from '@shared/contracts/contracts';
import { IdentityUseCases } from '../identity';
export class IdentityAddDeviceCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityAddDeviceCommandInput,
  ) {}
}
@CommandHandler(IdentityAddDeviceCommand)
export class IdentityAddDeviceCommandHandler implements ICommandHandler<IdentityAddDeviceCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityAddDeviceCommand) {
    return this.uow.write((s) =>
      this.useCases.addDevice(s, message.actor, message.input),
    );
  }
}

export class IdentityRegisterCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityRegisterCommandInput,
  ) {}
}
@CommandHandler(IdentityRegisterCommand)
export class IdentityRegisterCommandHandler implements ICommandHandler<IdentityRegisterCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityRegisterCommand) {
    return this.uow.write((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityUpdateMeCommand) {
    return this.uow.write((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityStatusCommand) {
    return this.uow.write((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentitySuspendCommand) {
    return this.uow.write((s) =>
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
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityUnsuspendCommand) {
    return this.uow.write((s) =>
      this.useCases.unsuspend(s, message.actor, message.input),
    );
  }
}

export class IdentityDeleteDeviceCommand {
  constructor(
    public readonly actor: Actor,
    public readonly input: Inputs.IdentityDeleteDeviceCommandInput,
  ) {}
}
@CommandHandler(IdentityDeleteDeviceCommand)
export class IdentityDeleteDeviceCommandHandler implements ICommandHandler<IdentityDeleteDeviceCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly useCases: IdentityUseCases,
  ) {}
  execute(message: IdentityDeleteDeviceCommand) {
    return this.uow.write((s) =>
      this.useCases.deleteDevice(s, message.actor, message.input),
    );
  }
}
